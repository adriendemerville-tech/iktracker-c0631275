// Send-Accountant-Report (Resend + PDF attachment)
// Cron-driven daily. For every user with `accountant_auto_send = true` whose
// send-day matches today, generates two PDF reports (period + YTD),
// stores them as report_shares (secure links, TTL 7d), and sends them as
// PDF attachments via Resend to the configured accountant address.
//
// Also supports on-demand invocation with { user_id, dry_run? } from admin/UI.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const FRONTEND_URL = 'https://iktracker.fr'
const SHARE_TTL_DAYS = 7

// --- Resend (via Lovable connector gateway) ---
const RESEND_GATEWAY = 'https://connector-gateway.lovable.dev/resend'
const FROM_EMAIL = 'IKtracker <releves@iktracker.fr>'
const REPLY_TO = 'contact@iktracker.fr'

// --- Browserless (PDF rendering) ---
const BROWSERLESS_BASE = 'https://production-sfo.browserless.io'

interface UserPrefs {
  user_id: string
  accountant_email: string | null
  accountant_frequency: 'monthly' | 'quarterly' | 'yearly'
  accountant_send_day: number
  accountant_last_sent_at: string | null
  fiscal_year_start_month?: number | null
  fiscal_year_start_day?: number | null
}

interface Trip {
  date: string
  distance: number | null
  ik_amount: number | null
  start_location: string | null
  end_location: string | null
  purpose: string | null
}

// ------------ Period helpers ------------

function frenchMonthName(month0: number): string {
  return [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
  ][month0]
}

function computePeriod(
  today: Date,
  frequency: 'monthly' | 'quarterly' | 'yearly',
): { start: Date; end: Date; label: string } {
  const y = today.getUTCFullYear()
  const m = today.getUTCMonth()
  if (frequency === 'monthly') {
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 1))
    return {
      start,
      end,
      label: `${frenchMonthName(start.getUTCMonth())} ${start.getUTCFullYear()}`,
    }
  }
  if (frequency === 'quarterly') {
    const currentQ = Math.floor(m / 3)
    const prevQ = currentQ === 0 ? 3 : currentQ - 1
    const year = currentQ === 0 ? y - 1 : y
    const start = new Date(Date.UTC(year, prevQ * 3, 1))
    const end = new Date(Date.UTC(year, prevQ * 3 + 3, 1))
    return { start, end, label: `T${prevQ + 1} ${year}` }
  }
  const start = new Date(Date.UTC(y - 1, 0, 1))
  const end = new Date(Date.UTC(y, 0, 1))
  return { start, end, label: `Année ${y - 1}` }
}

function computeYtd(
  today: Date,
  fyMonth: number,
  fyDay: number,
): { start: Date; end: Date; label: string } {
  const y = today.getUTCFullYear()
  const candidate = new Date(Date.UTC(y, fyMonth - 1, fyDay))
  const start = today >= candidate ? candidate : new Date(Date.UTC(y - 1, fyMonth - 1, fyDay))
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1))
  return { start, end, label: `Cumul depuis le ${start.getUTCDate()}/${start.getUTCMonth() + 1}/${start.getUTCFullYear()}` }
}

// ------------ HTML report ------------

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string))

function fmt(n: number, digits = 0) {
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function buildReportBody(
  title: string,
  userLabel: string,
  trips: Trip[],
): string {
  const totalDistance = trips.reduce((s, t) => s + (t.distance ?? 0), 0)
  const totalIk = trips.reduce((s, t) => s + (t.ik_amount ?? 0), 0)

  const rows = trips
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => {
      const d = new Date(t.date)
      const dateStr = isNaN(d.getTime())
        ? escapeHtml(t.date)
        : d.toLocaleDateString('fr-FR')
      return `
        <tr>
          <td>${dateStr}</td>
          <td>${escapeHtml(t.start_location ?? '')}</td>
          <td>${escapeHtml(t.end_location ?? '')}</td>
          <td>${escapeHtml(t.purpose ?? '')}</td>
          <td class="num">${fmt(t.distance ?? 0, 1)} km</td>
          <td class="num">${fmt(t.ik_amount ?? 0, 2)} €</td>
        </tr>`
    })
    .join('')

  return `
    <div class="content-wrapper">
      <div class="page">
        <header class="hdr">
          <h1>${escapeHtml(title)}</h1>
          <p class="sub">${escapeHtml(userLabel)} — généré par IKtracker</p>
        </header>

        <section class="summary">
          <div><span>Trajets</span><strong>${fmt(trips.length)}</strong></div>
          <div><span>Distance totale</span><strong>${fmt(totalDistance, 1)} km</strong></div>
          <div><span>IK totale</span><strong>${fmt(totalIk, 2)} €</strong></div>
        </section>

        <table class="trips">
          <thead>
            <tr>
              <th>Date</th><th>Départ</th><th>Arrivée</th>
              <th>Motif</th><th class="num">Distance</th><th class="num">IK</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6" class="empty">Aucun trajet sur la période.</td></tr>'}</tbody>
        </table>

        <footer class="ftr">
          <p>Document généré automatiquement par IKtracker — <a href="${FRONTEND_URL}">iktracker.fr</a></p>
        </footer>
      </div>
    </div>
  `
}

// Full standalone HTML document for PDF rendering
function wrapForPdf(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a2e; margin: 0; }
  .content-wrapper { width: 100%; }
  .page { padding: 0; }
  .hdr h1 { font-size: 20px; margin: 0 0 4px; color: #4f46e5; }
  .hdr .sub { color: #64748b; font-size: 12px; margin: 0 0 18px; }
  .summary { display: flex; gap: 12px; margin-bottom: 18px; }
  .summary > div { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; background: #f8fafc; }
  .summary span { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  .summary strong { display: block; font-size: 16px; margin-top: 2px; }
  table.trips { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.trips th, table.trips td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
  table.trips th { background: #f1f5f9; font-weight: 600; color: #334155; }
  table.trips td.num, table.trips th.num { text-align: right; white-space: nowrap; }
  table.trips tr:nth-child(even) td { background: #fafbfc; }
  .empty { text-align: center; color: #64748b; padding: 20px 0; }
  .ftr { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; }
  .ftr a { color: #4f46e5; text-decoration: none; }
</style></head><body>${body}</body></html>`
}

// ------------ Browserless PDF ------------

async function renderPdf(html: string): Promise<Uint8Array> {
  const token = Deno.env.get('BROWSERLESS_API_KEY')
  if (!token) throw new Error('BROWSERLESS_API_KEY missing')
  const res = await fetch(`${BROWSERLESS_BASE}/pdf?token=${token}&timeout=60000`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      options: {
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', right: '14mm', bottom: '18mm', left: '14mm' },
      },
      waitForTimeout: 200,
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`browserless pdf failed [${res.status}]: ${txt.slice(0, 400)}`)
  }
  const buf = new Uint8Array(await res.arrayBuffer())
  if (buf.byteLength === 0) throw new Error('browserless returned empty pdf')
  return buf
}

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

// ------------ Resend ------------

interface Attachment {
  filename: string
  content: string // base64
}

async function sendResendEmail(params: {
  to: string
  subject: string
  html: string
  attachments: Attachment[]
  idempotencyKey: string
}) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!lovableKey || !resendKey) {
    throw new Error('LOVABLE_API_KEY / RESEND_API_KEY missing')
  }
  const res = await fetch(`${RESEND_GATEWAY}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': resendKey,
      'Idempotency-Key': params.idempotencyKey,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [params.to],
      reply_to: REPLY_TO,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`resend send failed [${res.status}]: ${txt.slice(0, 500)}`)
  }
  return res.json().catch(() => ({}))
}

function buildEmailHtml(args: {
  userName: string
  periodLabel: string
  periodTripsCount: number
  periodDistanceKm: number
  periodIkAmount: number
  ytdLabel: string
  ytdTripsCount: number
  ytdDistanceKm: number
  ytdIkAmount: number
  periodReportUrl: string
  ytdReportUrl: string
  expiresLabel: string
}) {
  return `<!doctype html><html lang="fr"><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;margin:0;padding:24px;color:#1a1a2e;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
    <h1 style="color:#4f46e5;font-size:20px;margin:0 0 12px;">Relevé kilométrique — ${escapeHtml(args.periodLabel)}</h1>
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">Vous trouverez en pièce jointe les relevés kilométriques de <strong>${escapeHtml(args.userName)}</strong> générés automatiquement par IKtracker.</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr><td style="padding:8px;background:#f1f5f9;border-radius:6px;"><strong>Période</strong><br>${escapeHtml(args.periodLabel)}</td></tr>
      <tr><td style="padding:8px;">Trajets : <strong>${fmt(args.periodTripsCount)}</strong> — Distance : <strong>${fmt(args.periodDistanceKm, 1)} km</strong> — IK : <strong>${fmt(args.periodIkAmount, 2)} €</strong></td></tr>
      <tr><td style="padding:8px;background:#f1f5f9;border-radius:6px;"><strong>Cumul</strong><br>${escapeHtml(args.ytdLabel)}</td></tr>
      <tr><td style="padding:8px;">Trajets : <strong>${fmt(args.ytdTripsCount)}</strong> — Distance : <strong>${fmt(args.ytdDistanceKm, 1)} km</strong> — IK : <strong>${fmt(args.ytdIkAmount, 2)} €</strong></td></tr>
    </table>

    <p style="margin:16px 0;">Les PDF sont joints à cet email. Vous pouvez aussi consulter les relevés en ligne (liens sécurisés valides ${escapeHtml(args.expiresLabel)}) :</p>
    <p style="margin:8px 0;"><a href="${args.periodReportUrl}" style="color:#4f46e5;">Voir le relevé de la période</a></p>
    <p style="margin:8px 0;"><a href="${args.ytdReportUrl}" style="color:#4f46e5;">Voir le cumul annuel</a></p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:12px;color:#64748b;margin:0;">Envoyé automatiquement par <a href="${FRONTEND_URL}" style="color:#4f46e5;">IKtracker</a>. Pour ne plus recevoir ces relevés, l'utilisateur peut désactiver l'envoi automatique dans ses préférences.</p>
  </div>
</body></html>`
}

// ------------ Main ------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  let onlyUserId: string | null = null
  let dryRun = false
  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      onlyUserId = body?.user_id ?? null
      dryRun = Boolean(body?.dry_run)
    }
  } catch { /* ignore */ }

  const today = new Date()
  const todayDay = today.getUTCDate()

  let query = supabase
    .from('user_preferences')
    .select('user_id, accountant_email, accountant_frequency, accountant_send_day, accountant_last_sent_at')

  if (onlyUserId) {
    // On-demand: skip the auto_send/day filters so admin/UI can force a send.
    query = query.eq('user_id', onlyUserId)
  } else {
    query = query
      .eq('accountant_auto_send', true)
      .eq('accountant_send_day', todayDay)
  }

  const { data: prefs, error: prefsErr } = await query
  if (prefsErr) {
    console.error('prefs query failed', prefsErr)
    return new Response(JSON.stringify({ error: prefsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const results: Array<{ user_id: string; status: string; detail?: string }> = []

  for (const p of (prefs ?? []) as UserPrefs[]) {
    try {
      if (!p.accountant_email) {
        results.push({ user_id: p.user_id, status: 'skipped_no_email' })
        continue
      }

      if (!onlyUserId && p.accountant_last_sent_at) {
        const last = new Date(p.accountant_last_sent_at)
        const minInterval =
          p.accountant_frequency === 'monthly' ? 25 :
          p.accountant_frequency === 'quarterly' ? 80 : 340
        const daysSince = (today.getTime() - last.getTime()) / 86400000
        if (daysSince < minInterval) {
          results.push({ user_id: p.user_id, status: 'skipped_recent' })
          continue
        }
      }

      const period = computePeriod(today, p.accountant_frequency)
      const ytd = computeYtd(
        today,
        p.fiscal_year_start_month ?? 1,
        p.fiscal_year_start_day ?? 1,
      )

      const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id)
      const meta = (authUser?.user?.user_metadata ?? {}) as Record<string, string>
      const userName = [meta.first_name, meta.last_name].filter(Boolean).join(' ')
        || authUser?.user?.email
        || 'Utilisateur IKtracker'

      const windowStart = ytd.start < period.start ? ytd.start : period.start
      const windowEnd = ytd.end > period.end ? ytd.end : period.end
      const { data: allTrips, error: tripsErr } = await supabase
        .from('trips')
        .select('date, distance, ik_amount, start_location, end_location, purpose')
        .eq('user_id', p.user_id)
        .is('deleted_at', null)
        .gte('date', windowStart.toISOString().slice(0, 10))
        .lt('date', windowEnd.toISOString().slice(0, 10))

      if (tripsErr) throw tripsErr

      const trips = (allTrips ?? []) as Trip[]
      const periodTrips = trips.filter(
        (t) =>
          t.date >= period.start.toISOString().slice(0, 10) &&
          t.date < period.end.toISOString().slice(0, 10),
      )
      const ytdTrips = trips.filter(
        (t) =>
          t.date >= ytd.start.toISOString().slice(0, 10) &&
          t.date < ytd.end.toISOString().slice(0, 10),
      )

      if (periodTrips.length === 0) {
        results.push({ user_id: p.user_id, status: 'skipped_no_trips' })
        continue
      }

      const expiresAt = new Date(Date.now() + SHARE_TTL_DAYS * 86400_000).toISOString()

      const periodTitle = `Relevé kilométrique — ${period.label}`
      const ytdTitle = `Relevé kilométrique — ${ytd.label}`
      const periodBody = buildReportBody(periodTitle, userName, periodTrips)
      const ytdBody = buildReportBody(ytdTitle, userName, ytdTrips)
      const periodDocHtml = wrapForPdf(periodTitle, periodBody)
      const ytdDocHtml = wrapForPdf(ytdTitle, ytdBody)

      if (dryRun) {
        results.push({
          user_id: p.user_id,
          status: 'dry_run',
          detail: `${periodTrips.length} trips (period) / ${ytdTrips.length} (ytd)`,
        })
        continue
      }

      // Create secure online view shares (using the wrapped doc HTML so the
      // view-report page renders the same layout)
      const { data: periodShare, error: sErr1 } = await supabase
        .from('report_shares')
        .insert({ user_id: p.user_id, html_content: periodBody, expires_at: expiresAt })
        .select('id')
        .single()
      if (sErr1 || !periodShare) throw sErr1 ?? new Error('period share failed')

      const { data: ytdShare, error: sErr2 } = await supabase
        .from('report_shares')
        .insert({ user_id: p.user_id, html_content: ytdBody, expires_at: expiresAt })
        .select('id')
        .single()
      if (sErr2 || !ytdShare) throw sErr2 ?? new Error('ytd share failed')

      const periodUrl = `${FRONTEND_URL}/temporaryreport/${periodShare.id}`
      const ytdUrl = `${FRONTEND_URL}/temporaryreport/${ytdShare.id}`

      // Render PDFs
      const [periodPdf, ytdPdf] = await Promise.all([
        renderPdf(periodDocHtml),
        renderPdf(ytdDocHtml),
      ])

      const safe = (s: string) => s.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
      const periodFilename = `iktracker-${safe(period.label)}.pdf`
      const ytdFilename = `iktracker-cumul-${safe(String(ytd.start.getUTCFullYear()))}.pdf`

      const idempotencyKey = `accountant-${p.user_id}-${period.start.toISOString().slice(0, 10)}`

      await sendResendEmail({
        to: p.accountant_email,
        subject: `Relevé kilométrique ${period.label} — ${userName}`,
        html: buildEmailHtml({
          userName,
          periodLabel: period.label,
          periodTripsCount: periodTrips.length,
          periodDistanceKm: periodTrips.reduce((s, t) => s + (t.distance ?? 0), 0),
          periodIkAmount: periodTrips.reduce((s, t) => s + (t.ik_amount ?? 0), 0),
          ytdLabel: ytd.label,
          ytdTripsCount: ytdTrips.length,
          ytdDistanceKm: ytdTrips.reduce((s, t) => s + (t.distance ?? 0), 0),
          ytdIkAmount: ytdTrips.reduce((s, t) => s + (t.ik_amount ?? 0), 0),
          periodReportUrl: periodUrl,
          ytdReportUrl: ytdUrl,
          expiresLabel: `${SHARE_TTL_DAYS} jours`,
        }),
        attachments: [
          { filename: periodFilename, content: toBase64(periodPdf) },
          { filename: ytdFilename, content: toBase64(ytdPdf) },
        ],
        idempotencyKey,
      })

      await supabase
        .from('user_preferences')
        .update({ accountant_last_sent_at: new Date().toISOString() })
        .eq('user_id', p.user_id)

      results.push({ user_id: p.user_id, status: 'sent', detail: p.accountant_email })
    } catch (e) {
      console.error('accountant send failed', p.user_id, e)
      results.push({
        user_id: p.user_id,
        status: 'error',
        detail: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return new Response(
    JSON.stringify({ processed: results.length, results, frontend_url: FRONTEND_URL }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
