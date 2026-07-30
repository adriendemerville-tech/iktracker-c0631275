// Send-User-Monthly-Report
// Cron-driven: runs the 15th of each month. Sends the previous month's IK
// statement + year-to-date recap + vehicle profile to the USER themselves.
// PDF attached (Browserless) + secure online links (report_shares, 7d TTL).
//
// On-demand: POST { user_id, dry_run?, override_email? } bypasses date filter.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import {
  archiveReportPdf, buildReportBody, escapeHtml, fetchTripsForPeriod, fmt, frenchMonth,
  renderPdf, wrapForPdf,
} from '../_shared/report-pdf.ts'
import {
  FRONTEND_URL, FROM_EMAIL, REPLY_TO, RESEND_GATEWAY, SHARE_TTL_DAYS,
} from '../_shared/config.ts'
import { authorizeReportCaller } from '../_shared/auth-guard.ts'




interface Trip {
  date: string
  distance: number | null
  ik_amount: number | null
  start_location: string | null
  end_location: string | null
  purpose: string | null
  vehicle_id?: string | null
}

interface Vehicle {
  id: string
  name: string | null
  make: string | null
  model: string | null
  year: number | null
  license_plate: string | null
  fiscal_power: number | null
  is_electric: boolean | null
}

// --------- helpers ---------
function isoDay(d: Date) { return d.toISOString().slice(0, 10) }

function previousMonthRange(today: Date) {
  const y = today.getUTCFullYear(), m = today.getUTCMonth()
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1))
  return { start, end, label: `${frenchMonth(start.getUTCMonth())} ${start.getUTCFullYear()}` }
}

function ytdRange(today: Date) {
  const y = today.getUTCFullYear()
  return {
    start: new Date(Date.UTC(y, 0, 1)),
    end: new Date(Date.UTC(y, today.getUTCMonth(), today.getUTCDate() + 1)),
    label: `Cumul année ${y}`,
  }
}

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(bin)
}

// --------- Resend ---------
async function sendResend(params: {
  to: string; subject: string; html: string
  attachments: { filename: string; content: string }[]
  idempotencyKey: string
}) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!lovableKey || !resendKey) throw new Error('LOVABLE_API_KEY / RESEND_API_KEY missing')
  const res = await fetch(`${RESEND_GATEWAY}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': resendKey,
      'Idempotency-Key': params.idempotencyKey,
    },
    body: JSON.stringify({
      from: FROM_EMAIL, to: [params.to], reply_to: REPLY_TO,
      subject: params.subject, html: params.html, attachments: params.attachments,
    }),
  })
  if (!res.ok) throw new Error(`resend send failed [${res.status}]: ${(await res.text()).slice(0, 500)}`)
  return res.json().catch(() => ({}))
}

function buildEmailHtml(a: {
  userName: string; monthLabel: string; ytdLabel: string
  monthKm: number; monthIk: number; monthCount: number
  ytdKm: number; ytdIk: number; ytdCount: number
  monthUrl: string; ytdUrl: string
}) {
  return `<!doctype html><html lang="fr"><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;margin:0;padding:24px;color:#1a1a2e;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
    <h1 style="color:#4f46e5;font-size:20px;margin:0 0 12px;">Votre relevé IKtracker — ${escapeHtml(a.monthLabel)}</h1>
    <p>Bonjour ${escapeHtml(a.userName)},</p>
    <p>Voici votre relevé kilométrique automatique pour <strong>${escapeHtml(a.monthLabel)}</strong> ainsi que le cumul annuel et le profil de vos véhicules.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr><td style="padding:8px;background:#f1f5f9;"><strong>${escapeHtml(a.monthLabel)}</strong></td></tr>
      <tr><td style="padding:8px;">Trajets : <strong>${fmt(a.monthCount)}</strong> — Distance : <strong>${fmt(a.monthKm, 1)} km</strong> — IK : <strong>${fmt(a.monthIk, 2)} €</strong></td></tr>
      <tr><td style="padding:8px;background:#f1f5f9;"><strong>${escapeHtml(a.ytdLabel)}</strong></td></tr>
      <tr><td style="padding:8px;">Trajets : <strong>${fmt(a.ytdCount)}</strong> — Distance : <strong>${fmt(a.ytdKm, 1)} km</strong> — IK : <strong>${fmt(a.ytdIk, 2)} €</strong></td></tr>
    </table>
    <p>Les 2 PDF sont en pièce jointe. Vous pouvez aussi consulter les relevés en ligne (liens sécurisés valides 7 jours) :</p>
    <p><a href="${a.monthUrl}" style="color:#4f46e5;">Voir le relevé du mois</a></p>
    <p><a href="${a.ytdUrl}" style="color:#4f46e5;">Voir le cumul annuel</a></p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:12px;color:#64748b;">Vous recevez ce relevé chaque 15 du mois. Pour vous désabonner, désactivez « Relevé mensuel automatique » dans vos préférences sur <a href="${FRONTEND_URL}" style="color:#4f46e5;">iktracker.fr</a>.</p>
  </div></body></html>`
}

// --------- Partner webhooks (mirrors partner-api dispatch logic) ---------
async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
}

async function firePartnerWebhooks(
  admin: ReturnType<typeof createClient>,
  iktrackerUserId: string,
  payload: Record<string, unknown> & { event: string },
) {
  try {
    const { data: mappings } = await admin
      .from('partner_users')
      .select('partner_id, external_user_id')
      .eq('iktracker_user_id', iktrackerUserId)
    if (!mappings?.length) return

    const partnerIds = [...new Set(mappings.map((m: any) => m.partner_id))]
    const { data: hooks } = await admin
      .from('partner_webhooks')
      .select('id, partner_id, url, events, hmac_secret')
      .in('partner_id', partnerIds)
      .eq('is_active', true)
    if (!hooks?.length) return

    const event = payload.event
    for (const hook of hooks as any[]) {
      if (!hook.events?.includes(event)) continue
      const mapping = mappings.find((m: any) => m.partner_id === hook.partner_id)
      const body = JSON.stringify({
        event,
        payload: {
          ...payload,
          iktracker_user_id: iktrackerUserId,
          external_user_id: mapping?.external_user_id ?? null,
        },
        timestamp: new Date().toISOString(),
      })
      const secret = hook.hmac_secret || Deno.env.get('IKTRACKER_WEBHOOK_SECRET')
      if (!secret) {
        console.error(`Missing HMAC secret for partner webhook ${hook.id}`)
        continue
      }
      const key = await importHmacKey(secret)
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
      const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
      fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IKtracker-Event': event,
          'X-IKtracker-Signature': `sha256=${sigHex}`,
        },
        body,
      }).then(res => {
        admin.from('partner_webhooks').update({
          last_called_at: new Date().toISOString(),
          failure_count: res.ok ? 0 : 1,
        }).eq('id', hook.id)
      }).catch(() => {
        admin.from('partner_webhooks').update({ failure_count: 1 }).eq('id', hook.id)
      })
    }
  } catch (e) {
    console.error('firePartnerWebhooks error:', e)
  }
}


// --------- main ---------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  let onlyUserId: string | null = null
  let dryRun = false
  let overrideEmail: string | null = null
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    onlyUserId = body?.user_id ?? null
    dryRun = Boolean(body?.dry_run)
    overrideEmail = body?.override_email ?? null
  }

  // --- Caller authorization (cron secret | self | admin) ---
  const auth = await authorizeReportCaller(req, supabase, onlyUserId)
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error ?? 'Unauthorized' }), {
      status: auth.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!onlyUserId && auth.kind === 'self') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  // `override_email` redirects a full IK statement to an arbitrary address:
  // reserved for cron and admin callers.
  if (overrideEmail && !auth.privileged) {
    console.warn('[send-user-monthly-report] override_email ignored for non-privileged caller', auth.callerId)
    overrideEmail = null
  }
  console.log('[send-user-monthly-report] triggered', {
    caller_kind: auth.kind,
    caller_id: auth.callerId,
    target_user_id: onlyUserId,
    dry_run: dryRun,
    override_email: overrideEmail ? 'set' : null,
  })


  const today = new Date()

  let query = supabase
    .from('user_preferences')
    .select('user_id, user_monthly_report_enabled, user_monthly_report_last_sent_at')

  if (onlyUserId) {
    query = query.eq('user_id', onlyUserId)
  } else {
    query = query.eq('user_monthly_report_enabled', true)
  }

  const { data: prefs, error: prefsErr } = await query
  if (prefsErr) {
    return new Response(JSON.stringify({ error: prefsErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const period = previousMonthRange(today)
  const ytd = ytdRange(today)
  const results: Array<{ user_id: string; status: string; detail?: string }> = []

  for (const p of (prefs ?? []) as Array<{ user_id: string; user_monthly_report_last_sent_at: string | null }>) {
    try {
      // anti-doublon (25j) sauf on-demand
      if (!onlyUserId && p.user_monthly_report_last_sent_at) {
        const days = (today.getTime() - new Date(p.user_monthly_report_last_sent_at).getTime()) / 86400000
        if (days < 25) { results.push({ user_id: p.user_id, status: 'skipped_recent' }); continue }
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id)
      const email = overrideEmail ?? authUser?.user?.email
      if (!email) { results.push({ user_id: p.user_id, status: 'skipped_no_email' }); continue }
      const meta = (authUser?.user?.user_metadata ?? {}) as Record<string, string>
      const userName = [meta.first_name, meta.last_name].filter(Boolean).join(' ')
        || authUser?.user?.email || 'Utilisateur'

      // vehicles
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id,name,make,model,year,license_plate,fiscal_power,is_electric')
        .eq('user_id', p.user_id)
      const vehiclesArr = (vehicles ?? []) as Vehicle[]

      // trips window covering both period + YTD
      const windowStart = ytd.start < period.start ? ytd.start : period.start
      const windowEnd = ytd.end > period.end ? ytd.end : period.end
      const trips = await fetchTripsForPeriod(
        supabase as never, p.user_id, isoDay(windowStart), isoDay(windowEnd),
      ) as Trip[]
      const periodTrips = trips.filter(t => t.date >= isoDay(period.start) && t.date < isoDay(period.end))
      const ytdTrips = trips.filter(t => t.date >= isoDay(ytd.start) && t.date < isoDay(ytd.end))

      if (periodTrips.length === 0 && ytdTrips.length === 0) {
        results.push({ user_id: p.user_id, status: 'skipped_no_trips' }); continue
      }

      const expiresAt = new Date(Date.now() + SHARE_TTL_DAYS * 86400_000).toISOString()
      const monthTitle = `Relevé kilométrique — ${period.label}`
      const ytdTitle = `Relevé kilométrique — ${ytd.label}`
      const monthBody = buildReportBody(monthTitle, userName, periodTrips, vehiclesArr)
      const ytdBody = buildReportBody(ytdTitle, userName, ytdTrips, vehiclesArr)

      if (dryRun) {
        results.push({ user_id: p.user_id, status: 'dry_run',
          detail: `${periodTrips.length}/${ytdTrips.length} trips, ${vehiclesArr.length} vehicles` })
        continue
      }

      const { data: mShare, error: e1 } = await supabase
        .from('report_shares')
        .insert({ user_id: p.user_id, html_content: monthBody, expires_at: expiresAt })
        .select('id').single()
      if (e1 || !mShare) throw e1 ?? new Error('period share failed')

      const { data: yShare, error: e2 } = await supabase
        .from('report_shares')
        .insert({ user_id: p.user_id, html_content: ytdBody, expires_at: expiresAt })
        .select('id').single()
      if (e2 || !yShare) throw e2 ?? new Error('ytd share failed')

      const monthUrl = `${FRONTEND_URL}/temporaryreport/${mShare.id}`
      const ytdUrl = `${FRONTEND_URL}/temporaryreport/${yShare.id}`

      const [monthPdf, ytdPdf] = await Promise.all([
        renderPdf(wrapForPdf(monthTitle, monthBody)),
        renderPdf(wrapForPdf(ytdTitle, ytdBody)),
      ])

      const totalKm = (arr: Trip[]) => arr.reduce((s, t) => s + (t.distance ?? 0), 0)
      const totalIk = (arr: Trip[]) => arr.reduce((s, t) => s + (t.ik_amount ?? 0), 0)

      // Archive durable du relevé mensuel (page /app/archive)
      await archiveReportPdf(supabase as never, {
        userId: p.user_id,
        kind: 'monthly',
        periodLabel: period.label,
        periodStart: isoDay(period.start),
        periodEnd: isoDay(period.end),
        pdf: monthPdf,
        tripCount: periodTrips.length,
        totalKm: totalKm(periodTrips),
        totalIk: totalIk(periodTrips),
      })


      await sendResend({
        to: email,
        subject: `Votre relevé IKtracker — ${period.label}`,
        html: buildEmailHtml({
          userName, monthLabel: period.label, ytdLabel: ytd.label,
          monthCount: periodTrips.length, monthKm: totalKm(periodTrips), monthIk: totalIk(periodTrips),
          ytdCount: ytdTrips.length, ytdKm: totalKm(ytdTrips), ytdIk: totalIk(ytdTrips),
          monthUrl, ytdUrl,
        }),
        attachments: [
          { filename: `IKtracker-${period.label.replace(/\s+/g, '-')}.pdf`, content: toBase64(monthPdf) },
          { filename: `IKtracker-Cumul-${today.getUTCFullYear()}.pdf`, content: toBase64(ytdPdf) },
        ],
        idempotencyKey: `user-monthly-${p.user_id}-${today.getUTCFullYear()}-${today.getUTCMonth()}`,
      })

      await supabase.from('user_preferences')
        .update({ user_monthly_report_last_sent_at: today.toISOString() })
        .eq('user_id', p.user_id)

      // Notify partners (e.g. dictadevi) that a monthly statement is available.
      await firePartnerWebhooks(supabase, p.user_id, {
        event: 'monthly_report.sent',
        period_label: period.label,
        ytd_label: ytd.label,
        month_url: monthUrl,
        ytd_url: ytdUrl,
        month_trip_count: periodTrips.length,
        month_total_km: totalKm(periodTrips),
        month_total_ik: totalIk(periodTrips),
        ytd_trip_count: ytdTrips.length,
        ytd_total_km: totalKm(ytdTrips),
        ytd_total_ik: totalIk(ytdTrips),
        expires_at: expiresAt,
      })

      results.push({ user_id: p.user_id, status: 'sent', detail: email })
    } catch (err) {
      console.error('user monthly report error', p.user_id, err)
      results.push({ user_id: p.user_id, status: 'error', detail: String((err as Error).message ?? err) })
    }
  }

  return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
