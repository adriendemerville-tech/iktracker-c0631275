// Send-Accountant-Report
// Cron-driven daily. For every user with `accountant_auto_send = true` whose
// send-day matches today, generates two secure report_shares (period + YTD)
// and enqueues an email to their configured accountant.
//
// Also supports on-demand invocation with { user_id, dry_run? } from admin/UI.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const FRONTEND_URL = 'https://iktracker.fr'
const SHARE_TTL_DAYS = 7

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
  from_address: string | null
  to_address: string | null
  purpose: string | null
}

// ------------ Period helpers ------------

function frenchMonthName(month0: number): string {
  return [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
  ][month0]
}

// Compute the [start, end) window (UTC dates) that ended before `today` for the
// given frequency. Also returns a human label.
function computePeriod(
  today: Date,
  frequency: 'monthly' | 'quarterly' | 'yearly',
): { start: Date; end: Date; label: string } {
  const y = today.getUTCFullYear()
  const m = today.getUTCMonth()
  if (frequency === 'monthly') {
    // Previous month
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 1))
    return {
      start,
      end,
      label: `${frenchMonthName(start.getUTCMonth())} ${start.getUTCFullYear()}`,
    }
  }
  if (frequency === 'quarterly') {
    const currentQ = Math.floor(m / 3) // 0..3
    const prevQ = currentQ === 0 ? 3 : currentQ - 1
    const year = currentQ === 0 ? y - 1 : y
    const start = new Date(Date.UTC(year, prevQ * 3, 1))
    const end = new Date(Date.UTC(year, prevQ * 3 + 3, 1))
    return { start, end, label: `T${prevQ + 1} ${year}` }
  }
  // yearly
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

function buildReportHtml(
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
          <td>${escapeHtml(t.from_address ?? '')}</td>
          <td>${escapeHtml(t.to_address ?? '')}</td>
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
      </div>
    </div><!-- end content-wrapper -->
  `
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

  // Load candidate preferences
  let query = supabase
    .from('user_preferences')
    .select('user_id, accountant_email, accountant_frequency, accountant_send_day, accountant_last_sent_at, fiscal_year_start_month, fiscal_year_start_day')
    .eq('accountant_auto_send', true)

  if (onlyUserId) {
    query = query.eq('user_id', onlyUserId)
  } else {
    query = query.eq('accountant_send_day', todayDay)
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

      // Debounce: skip if already sent for this window (only for cron runs)
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

      // Fetch profile for user label
      const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id)
      const meta = (authUser?.user?.user_metadata ?? {}) as Record<string, string>
      const userName = [meta.first_name, meta.last_name].filter(Boolean).join(' ')
        || authUser?.user?.email
        || 'Utilisateur IKtracker'

      // Fetch trips for both windows in one shot (from ytd.start .. period.end or ytd.end)
      const windowStart = ytd.start < period.start ? ytd.start : period.start
      const windowEnd = ytd.end > period.end ? ytd.end : period.end
      const { data: allTrips, error: tripsErr } = await supabase
        .from('trips')
        .select('date, distance, ik_amount, from_address, to_address, purpose')
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

      const periodHtml = buildReportHtml(
        `Relevé kilométrique — ${period.label}`,
        userName,
        periodTrips,
      )
      const ytdHtml = buildReportHtml(
        `Relevé kilométrique — ${ytd.label}`,
        userName,
        ytdTrips,
      )

      if (dryRun) {
        results.push({
          user_id: p.user_id,
          status: 'dry_run',
          detail: `${periodTrips.length} trips (period) / ${ytdTrips.length} (ytd)`,
        })
        continue
      }

      const { data: periodShare, error: sErr1 } = await supabase
        .from('report_shares')
        .insert({ user_id: p.user_id, html_content: periodHtml, expires_at: expiresAt })
        .select('id')
        .single()
      if (sErr1 || !periodShare) throw sErr1 ?? new Error('period share failed')

      const { data: ytdShare, error: sErr2 } = await supabase
        .from('report_shares')
        .insert({ user_id: p.user_id, html_content: ytdHtml, expires_at: expiresAt })
        .select('id')
        .single()
      if (sErr2 || !ytdShare) throw sErr2 ?? new Error('ytd share failed')

      const periodUrl = `${supabaseUrl}/functions/v1/view-report?id=${periodShare.id}`
      const ytdUrl = `${supabaseUrl}/functions/v1/view-report?id=${ytdShare.id}`

      const idempotencyKey = `accountant-${p.user_id}-${period.start.toISOString().slice(0, 10)}`

      const { error: sendErr } = await supabase.functions.invoke(
        'send-transactional-email',
        {
          body: {
            templateName: 'accountant-report',
            recipientEmail: p.accountant_email,
            idempotencyKey,
            templateData: {
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
            },
          },
        },
      )
      if (sendErr) throw sendErr

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
