// Send-User-Monthly-Report
// Cron-driven: runs the 15th of each month. Sends the previous month's IK
// statement + year-to-date recap + vehicle profile to the USER themselves.
// PDF attached (Browserless) + secure online links (report_shares, 7d TTL).
//
// On-demand: POST { user_id, dry_run?, override_email? } bypasses date filter.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const FRONTEND_URL = 'https://iktracker.fr'
const SHARE_TTL_DAYS = 7
const RESEND_GATEWAY = 'https://connector-gateway.lovable.dev/resend'
const FROM_EMAIL = 'IKtracker <releves@iktracker.fr>'
const REPLY_TO = 'contact@iktracker.fr'
const BROWSERLESS_BASE = 'https://production-sfo.browserless.io'

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
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] as string))

const fmt = (n: number, d = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })

const frenchMonth = (m: number) =>
  ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][m]

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

// --------- HTML/PDF layout ---------
function vehiclesBlock(vehicles: Vehicle[]): string {
  if (vehicles.length === 0) return ''
  const rows = vehicles.map((v) => {
    const bareme = v.is_electric
      ? `Barème officiel + bonus 20% (100% électrique)`
      : `Barème officiel`
    const cv = v.fiscal_power ? `${v.fiscal_power} CV` : '—'
    const label = [v.make, v.model].filter(Boolean).join(' ') || v.name || 'Véhicule'
    return `
      <tr>
        <td>${escapeHtml(label)}</td>
        <td>${escapeHtml(v.license_plate ?? '—')}</td>
        <td>${escapeHtml(v.is_electric ? '100% électrique' : 'Thermique / hybride')}</td>
        <td class="num">${escapeHtml(cv)}</td>
        <td>${escapeHtml(bareme)}</td>
      </tr>`
  }).join('')
  return `
    <section class="vehicles">
      <h2>Profil véhicule${vehicles.length > 1 ? 's' : ''}</h2>
      <table class="trips">
        <thead><tr>
          <th>Modèle</th><th>Immatriculation</th><th>Motorisation</th>
          <th class="num">Puiss. fiscale</th><th>Barème appliqué</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`
}

function buildReportBody(title: string, userLabel: string, trips: Trip[], vehicles: Vehicle[]): string {
  const totalKm = trips.reduce((s, t) => s + (t.distance ?? 0), 0)
  const totalIk = trips.reduce((s, t) => s + (t.ik_amount ?? 0), 0)
  const rows = trips
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => {
      const d = new Date(t.date)
      const dateStr = isNaN(d.getTime()) ? escapeHtml(t.date) : d.toLocaleDateString('fr-FR')
      return `<tr>
        <td>${dateStr}</td>
        <td>${escapeHtml(t.start_location ?? '')}</td>
        <td>${escapeHtml(t.end_location ?? '')}</td>
        <td>${escapeHtml(t.purpose ?? '')}</td>
        <td class="num">${fmt(t.distance ?? 0, 1)} km</td>
        <td class="num">${fmt(t.ik_amount ?? 0, 2)} €</td>
      </tr>`
    }).join('')
  return `
    <div class="content-wrapper"><div class="page">
      <header class="hdr">
        <h1>${escapeHtml(title)}</h1>
        <p class="sub">${escapeHtml(userLabel)} — généré par IKtracker</p>
      </header>
      <section class="summary">
        <div><span>Trajets</span><strong>${fmt(trips.length)}</strong></div>
        <div><span>Distance totale</span><strong>${fmt(totalKm, 1)} km</strong></div>
        <div><span>IK totale</span><strong>${fmt(totalIk, 2)} €</strong></div>
      </section>
      ${vehiclesBlock(vehicles)}
      <table class="trips">
        <thead><tr>
          <th>Date</th><th>Départ</th><th>Arrivée</th><th>Motif</th>
          <th class="num">Distance</th><th class="num">IK</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="empty">Aucun trajet sur la période.</td></tr>'}</tbody>
      </table>
      <footer class="ftr">
        <p>Document généré automatiquement par IKtracker — <a href="${FRONTEND_URL}">iktracker.fr</a></p>
      </footer>
    </div></div>`
}

function wrapForPdf(title: string, body: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  *{box-sizing:border-box}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;margin:0}
  .hdr h1{font-size:20px;margin:0 0 4px;color:#4f46e5}
  .hdr .sub{color:#64748b;font-size:12px;margin:0 0 18px}
  .summary{display:flex;gap:12px;margin-bottom:18px}
  .summary>div{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;background:#f8fafc}
  .summary span{display:block;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  .summary strong{display:block;font-size:16px;margin-top:2px}
  .vehicles{margin:8px 0 18px}
  .vehicles h2{font-size:13px;color:#334155;margin:0 0 8px}
  table.trips{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}
  table.trips th,table.trips td{border-bottom:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
  table.trips th{background:#f1f5f9;font-weight:600;color:#334155}
  table.trips td.num,table.trips th.num{text-align:right;white-space:nowrap}
  .empty{text-align:center;color:#64748b;padding:20px 0}
  .ftr{margin-top:24px;font-size:10px;color:#94a3b8;text-align:center}
  .ftr a{color:#4f46e5;text-decoration:none}
</style></head><body>${body}</body></html>`
}

// --------- Browserless ---------
async function renderPdf(html: string): Promise<Uint8Array> {
  const token = Deno.env.get('BROWSERLESS_API_KEY')
  if (!token) throw new Error('BROWSERLESS_API_KEY missing')
  const res = await fetch(`${BROWSERLESS_BASE}/pdf?token=${token}&timeout=60000`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      options: { format: 'A4', printBackground: true,
        margin: { top: '18mm', right: '14mm', bottom: '18mm', left: '14mm' } },
      waitForTimeout: 200,
    }),
  })
  if (!res.ok) throw new Error(`browserless pdf failed [${res.status}]: ${(await res.text()).slice(0, 400)}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  if (buf.byteLength === 0) throw new Error('browserless returned empty pdf')
  return buf
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
      const { data: allTrips, error: tErr } = await supabase
        .from('trips')
        .select('date, distance, ik_amount, start_location, end_location, purpose')
        .eq('user_id', p.user_id)
        .is('deleted_at', null)
        .gte('date', isoDay(windowStart))
        .lt('date', isoDay(windowEnd))
      if (tErr) throw tErr

      const trips = (allTrips ?? []) as Trip[]
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

      const monthUrl = `${supabaseUrl}/functions/v1/view-report?id=${mShare.id}`
      const ytdUrl = `${supabaseUrl}/functions/v1/view-report?id=${yShare.id}`

      const [monthPdf, ytdPdf] = await Promise.all([
        renderPdf(wrapForPdf(monthTitle, monthBody)),
        renderPdf(wrapForPdf(ytdTitle, ytdBody)),
      ])

      const totalKm = (arr: Trip[]) => arr.reduce((s, t) => s + (t.distance ?? 0), 0)
      const totalIk = (arr: Trip[]) => arr.reduce((s, t) => s + (t.ik_amount ?? 0), 0)

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
