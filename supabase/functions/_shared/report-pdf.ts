// Shared IK statement HTML/PDF builders.
// Used by send-user-monthly-report (monthly archive) and report-archive (annual, on-demand).

import {
  BROWSERLESS_BASE, DB_PAGE_SIZE, FRONTEND_URL, MAX_PDF_BYTES, MAX_PDF_TRIP_ROWS,
} from './config.ts'

export { FRONTEND_URL }


export interface ReportTrip {
  date: string
  distance: number | null
  ik_amount: number | null
  start_location: string | null
  end_location: string | null
  purpose: string | null
}

export interface ReportVehicle {
  id?: string
  name: string | null
  make: string | null
  model: string | null
  year?: number | null
  license_plate: string | null
  fiscal_power: number | null
  is_electric: boolean | null
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export const fmt = (n: number, d = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })

export const frenchMonth = (m: number) =>
  ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][m]

function vehiclesBlock(vehicles: ReportVehicle[]): string {
  if (vehicles.length === 0) return ''
  const rows = vehicles.map((v) => {
    const bareme = v.is_electric ? 'Barème officiel + bonus 20% (100% électrique)' : 'Barème officiel'
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

export function buildReportBody(
  title: string,
  userLabel: string,
  trips: ReportTrip[],
  vehicles: ReportVehicle[],
): string {
  const totalKm = trips.reduce((s, t) => s + (t.distance ?? 0), 0)
  const totalIk = trips.reduce((s, t) => s + (t.ik_amount ?? 0), 0)
  const omitted = Math.max(0, trips.length - MAX_PDF_TRIP_ROWS)
  const rows = trips
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_PDF_TRIP_ROWS)
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
      ${omitted > 0 ? `<p class="empty">${fmt(omitted)} trajets supplémentaires ne sont pas détaillés dans ce document. Les totaux ci-dessus les incluent.</p>` : ''}
      <footer class="ftr">
        <p>Document généré automatiquement par IKtracker — <a href="${FRONTEND_URL}">iktracker.fr</a></p>
      </footer>
    </div></div>`
}

export function wrapForPdf(title: string, body: string): string {
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

export async function renderPdf(html: string): Promise<Uint8Array> {
  const token = Deno.env.get('BROWSERLESS_API_KEY')
  if (!token) throw new Error('BROWSERLESS_API_KEY missing')
  const res = await fetch(`${BROWSERLESS_BASE}/pdf?token=${token}&timeout=60000`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      options: {
        format: 'A4', printBackground: true,
        margin: { top: '18mm', right: '14mm', bottom: '18mm', left: '14mm' },
      },
      waitForTimeout: 200,
    }),
  })
  if (!res.ok) throw new Error(`browserless pdf failed [${res.status}]: ${(await res.text()).slice(0, 400)}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  if (buf.byteLength === 0) throw new Error('browserless returned empty pdf')
  if (buf.byteLength > MAX_PDF_BYTES) {
    throw new Error(`generated pdf too large (${buf.byteLength} bytes > ${MAX_PDF_BYTES})`)
  }
  return buf
}

/**
 * Paginated read of a user's trips over a period.
 * Avoids the implicit PostgREST 1000-row cap on long (annual) periods.
 */
export async function fetchTripsForPeriod(
  admin: { from: (t: string) => any },
  userId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ReportTrip[]> {
  const all: ReportTrip[] = []
  for (let page = 0; ; page++) {
    const from = page * DB_PAGE_SIZE
    const { data, error } = await admin
      .from('trips')
      .select('date, distance, ik_amount, start_location, end_location, purpose')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('date', periodStart)
      .lt('date', periodEnd)
      .order('date', { ascending: true })
      .range(from, from + DB_PAGE_SIZE - 1)
    if (error) throw error
    const rows = (data ?? []) as ReportTrip[]
    all.push(...rows)
    if (rows.length < DB_PAGE_SIZE) break
    if (page > 60) break // hard safety stop (~60k trips)
  }
  return all
}

export const ARCHIVE_BUCKET = 'report-archives'

/** Uploads a PDF to the private archive bucket and upserts its index row. */
export async function archiveReportPdf(
  admin: { storage: any; from: (t: string) => any },
  params: {
    userId: string
    kind: 'monthly' | 'annual'
    periodLabel: string
    periodStart: string
    periodEnd: string
    pdf: Uint8Array
    tripCount: number
    totalKm: number
    totalIk: number
  },
): Promise<{ storage_path: string } | null> {
  const slug = params.periodLabel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const path = `${params.userId}/${params.kind}/${params.periodStart}-${slug}.pdf`

  const { error: upErr } = await admin.storage
    .from(ARCHIVE_BUCKET)
    .upload(path, params.pdf, { contentType: 'application/pdf', upsert: true })
  if (upErr) {
    console.error('archiveReportPdf upload error:', upErr.message)
    return null
  }

  const { error: dbErr } = await admin.from('report_archives').upsert({
    user_id: params.userId,
    kind: params.kind,
    period_label: params.periodLabel,
    period_start: params.periodStart,
    period_end: params.periodEnd,
    storage_path: path,
    trip_count: params.tripCount,
    total_km: params.totalKm,
    total_ik: params.totalIk,
    file_size: params.pdf.byteLength,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,kind,period_start,period_end' })
  if (dbErr) {
    console.error('archiveReportPdf index error:', dbErr.message)
    return null
  }
  return { storage_path: path }
}
