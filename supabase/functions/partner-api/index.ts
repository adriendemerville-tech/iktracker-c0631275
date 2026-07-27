import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create as createJwt, verify as verifyJwt, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-external-user-id',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://iktracker.fr';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- Helpers ----------

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

// Normalize a location string for duplicate detection
// Lowercase, trim, remove diacritics, collapse spaces, drop trailing comma chunks
function normalizeLocation(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Strict duplicate detection: same user + same date + same normalized destination
// Includes archived (deleted_at) trips so re-imports don't resurrect them
async function findDuplicateTrip(
  userId: string,
  date: string,
  endLocation: string,
): Promise<{ id: string; deleted: boolean } | null> {
  const norm = normalizeLocation(endLocation);
  if (!norm) return null;
  const { data } = await admin
    .from('trips')
    .select('id, end_location, deleted_at')
    .eq('user_id', userId)
    .eq('date', date);
  if (!data?.length) return null;
  for (const t of data) {
    if (normalizeLocation(t.end_location) === norm) {
      return { id: t.id, deleted: t.deleted_at !== null };
    }
  }
  return null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function logRequest(partnerId: string | null, method: string, path: string, status: number, duration: number, externalUserId?: string, iktrackerUserId?: string, error?: string) {
  try {
    await admin.from('partner_request_logs').insert({
      partner_id: partnerId,
      method, path,
      status_code: status,
      response_time_ms: duration,
      external_user_id: externalUserId ?? null,
      iktracker_user_id: iktrackerUserId ?? null,
      error_message: error ?? null,
    });
  } catch (_) { /* swallow */ }
}

// ---------- Auth: validate API key from header ----------

interface PartnerContext {
  partnerId: string;
  partnerName: string;
  jwtSecret: string;
  scopes: string[];
  quotaRemaining: number;
}

async function authenticatePartner(req: Request): Promise<PartnerContext | { error: string; status: number }> {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return { error: 'Missing x-api-key header', status: 401 };

  const keyHash = await sha256Hex(apiKey);
  const { data, error } = await admin.rpc('validate_partner_key', { _key_hash: keyHash });
  if (error || !data || data.length === 0) return { error: 'Invalid API key', status: 401 };

  const row = data[0];
  if (!row.is_active) return { error: 'API key revoked', status: 403 };
  if (row.quota_remaining <= 0) return { error: 'Monthly quota exceeded', status: 429 };

  // Increment usage (fire and forget)
  admin.rpc('increment_partner_usage', { _partner_id: row.partner_id }).then(() => {});

  return {
    partnerId: row.partner_id,
    partnerName: row.partner_name,
    jwtSecret: row.jwt_secret,
    scopes: row.scopes,
    quotaRemaining: row.quota_remaining,
  };
}

function requireScope(ctx: PartnerContext, scope: string): boolean {
  return ctx.scopes.includes(scope);
}

// ---------- User provisioning ----------

async function findOrCreateIktrackerUser(partnerId: string, externalUserId: string, externalEmail: string, metadata: Record<string, unknown> = {}): Promise<string> {
  // 1. Check existing mapping
  const { data: existing } = await admin
    .from('partner_users')
    .select('iktracker_user_id')
    .eq('partner_id', partnerId)
    .eq('external_user_id', externalUserId)
    .maybeSingle();

  if (existing?.iktracker_user_id) return existing.iktracker_user_id;

  // 2. Check if a Supabase user already exists with this email
  const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === externalEmail.toLowerCase());

  let iktrackerUserId: string;
  if (existingUser) {
    iktrackerUserId = existingUser.id;
  } else {
    // 3. Create new user (auto-confirmed, random password — they'll always come via SSO)
    const randomPwd = crypto.randomUUID() + crypto.randomUUID();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: externalEmail,
      password: randomPwd,
      email_confirm: true,
      user_metadata: { provisioned_by: 'partner-api', ...metadata },
    });
    if (createErr || !created.user) throw new Error(`Failed to provision user: ${createErr?.message}`);
    iktrackerUserId = created.user.id;
  }

  // 4. Store mapping
  await admin.from('partner_users').insert({
    partner_id: partnerId,
    external_user_id: externalUserId,
    external_email: externalEmail,
    iktracker_user_id: iktrackerUserId,
    metadata,
  });

  // 5. Ensure user_preferences row exists so auto-monthly reports run for this user.
  //    Defaults (user_monthly_report_enabled = true) apply on insert.
  await admin.from('user_preferences')
    .upsert({ user_id: iktrackerUserId }, { onConflict: 'user_id', ignoreDuplicates: true });

  // 6. Trigger webhook user.linked
  fireWebhook(partnerId, 'user.linked', { external_user_id: externalUserId, iktracker_user_id: iktrackerUserId, email: externalEmail });

  return iktrackerUserId;
}

// ---------- Webhooks ----------

async function fireWebhook(partnerId: string, event: string, payload: Record<string, unknown>) {
  try {
    const { data: hooks } = await admin
      .from('partner_webhooks')
      .select('id, url, events, hmac_secret')
      .eq('partner_id', partnerId)
      .eq('is_active', true);
    if (!hooks?.length) return;

    for (const hook of hooks) {
      if (!hook.events.includes(event)) continue;
      const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
      const secret = hook.hmac_secret || Deno.env.get('IKTRACKER_WEBHOOK_SECRET');
      if (!secret) {
        console.error(`Missing HMAC secret for partner webhook ${hook.id}`);
        continue;
      }
      const key = await importHmacKey(secret);
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
      const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

      fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IKtracker-Event': event,
          'X-IKtracker-Signature': `sha256=${sigHex}`,
        },
        body,
      }).then(async res => {
        await admin.from('partner_webhooks').update({
          last_called_at: new Date().toISOString(),
          failure_count: res.ok ? 0 : 1,
        }).eq('id', hook.id);
      }).catch(() => {
        admin.from('partner_webhooks').update({ failure_count: 1 }).eq('id', hook.id);
      });
    }
  } catch (e) {
    console.error('Webhook dispatch error:', e);
  }
}

// ---------- IK calculation (mirrors src/lib/distance.ts logic) ----------

interface IkInput { fiscalPower: number; isElectric: boolean; annualKm: number; tripKm: number; }

function calculateIk({ fiscalPower, isElectric, annualKm, tripKm }: IkInput) {
  // 2024 official scale (cars)
  const cv = Math.min(Math.max(fiscalPower, 3), 7);
  let bracket: 'low' | 'mid' | 'high';
  if (annualKm <= 5000) bracket = 'low';
  else if (annualKm <= 20000) bracket = 'mid';
  else bracket = 'high';

  const scale: Record<number, { low: (km: number) => number; mid: (km: number) => number; high: (km: number) => number }> = {
    3: { low: km => km * 0.529, mid: km => km * 0.316 + 1065, high: km => km * 0.370 },
    4: { low: km => km * 0.606, mid: km => km * 0.340 + 1330, high: km => km * 0.407 },
    5: { low: km => km * 0.636, mid: km => km * 0.357 + 1395, high: km => km * 0.427 },
    6: { low: km => km * 0.665, mid: km => km * 0.374 + 1457, high: km => km * 0.447 },
    7: { low: km => km * 0.697, mid: km => km * 0.394 + 1515, high: km => km * 0.470 },
  };

  const annualAmount = scale[cv][bracket](annualKm);
  const baseTrip = (annualAmount / Math.max(annualKm, 1)) * tripKm;
  const tripAmount = isElectric ? baseTrip * 1.2 : baseTrip;

  return {
    fiscalPower: cv,
    isElectric,
    bracket,
    bracketLabel: bracket === 'low' ? '≤ 5 000 km' : bracket === 'mid' ? '5 001 – 20 000 km' : '> 20 000 km',
    electricBonus: isElectric ? 0.20 : 0,
    tripIkAmount: Math.round(tripAmount * 100) / 100,
    annualIkAmount: Math.round(annualAmount * 100) / 100,
  };
}

// ---------- Routes ----------

async function handleVehicleLookup(req: Request, _ctx: PartnerContext): Promise<Response> {
  const body = await req.json();
  const plate = body.plate ?? body.license_plate;
  if (!plate) return jsonResponse({ error: 'Missing plate (field: plate or license_plate)' }, 400);

  // Reuse internal vehicle-lookup function via direct fetch
  const res = await fetch(`${SUPABASE_URL}/functions/v1/vehicle-lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ licensePlate: plate }),
  });
  const data = await res.json();
  return jsonResponse(data, res.status);
}

async function handleCalculateIk(req: Request, _ctx: PartnerContext): Promise<Response> {
  const { fiscal_power, is_electric, annual_km, trip_km } = await req.json();
  if (typeof fiscal_power !== 'number') {
    return jsonResponse({ error: 'fiscal_power required (number)' }, 400);
  }
  if (typeof annual_km !== 'number' && typeof trip_km !== 'number') {
    return jsonResponse({ error: 'annual_km or trip_km required (number)' }, 400);
  }
  const annualKm = typeof annual_km === 'number' ? annual_km : (trip_km as number);
  const tripKm = typeof trip_km === 'number' ? trip_km : annualKm;
  const result = calculateIk({
    fiscalPower: fiscal_power,
    isElectric: !!is_electric,
    annualKm,
    tripKm,
  });
  return jsonResponse({ success: true, ...result });
}

async function handleCreateTrip(req: Request, ctx: PartnerContext): Promise<Response> {
  if (!requireScope(ctx, 'trips:write') && !requireScope(ctx, 'write')) {
    return jsonResponse({ error: 'Missing trips:write scope' }, 403);
  }
  const externalUserId = req.headers.get('x-external-user-id');
  if (!externalUserId) return jsonResponse({ error: 'Missing x-external-user-id header' }, 400);

  const body = await req.json();
  const { external_email, date, start_location, end_location, distance, vehicle_id, purpose, round_trip, calendar_event_id } = body;

  if (!external_email || !date || !start_location || !end_location || typeof distance !== 'number') {
    return jsonResponse({ error: 'Required: external_email, date, start_location, end_location, distance' }, 400);
  }

  const userId = await findOrCreateIktrackerUser(ctx.partnerId, externalUserId, external_email, body.metadata || {});

  // Strict duplicate detection (user + date + normalized destination), includes archived trips
  const dup = await findDuplicateTrip(userId, date, end_location);
  if (dup) {
    return jsonResponse({
      success: false,
      duplicate: true,
      reason: dup.deleted ? 'duplicate_archived' : 'duplicate_active',
      existing_trip_id: dup.id,
      message: dup.deleted
        ? 'A similar trip exists but was archived by the user; not re-imported.'
        : 'A similar trip already exists for this user/date/destination.',
    }, 200);
  }

  // Compute IK if vehicle provided
  let ikAmount = 0;
  if (vehicle_id) {
    const { data: veh } = await admin.from('vehicles').select('fiscal_power, is_electric').eq('id', vehicle_id).eq('user_id', userId).maybeSingle();
    if (veh) {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
      const { data: yearTrips } = await admin.from('trips').select('distance').eq('user_id', userId).gte('date', yearStart);
      const annualKm = (yearTrips || []).reduce((s, t) => s + (t.distance || 0), 0) + distance;
      ikAmount = calculateIk({ fiscalPower: veh.fiscal_power, isElectric: veh.is_electric, annualKm, tripKm: distance }).tripIkAmount;
    }
  }

  const { data: trip, error } = await admin.from('trips').insert({
    user_id: userId,
    date,
    start_location,
    end_location,
    distance,
    ik_amount: ikAmount,
    vehicle_id: vehicle_id ?? null,
    purpose: purpose ?? null,
    round_trip: !!round_trip,
    calendar_event_id: calendar_event_id ?? null,
    source: `partner:${ctx.partnerName}`,
    status: 'validated',
  }).select().single();

  if (error) return jsonResponse({ error: error.message }, 500);

  fireWebhook(ctx.partnerId, 'trip.created', { trip_id: trip.id, external_user_id: externalUserId, distance, ik_amount: ikAmount });

  return jsonResponse({ success: true, trip_id: trip.id, ik_amount: ikAmount, iktracker_user_id: userId });
}

async function handleGetStats(req: Request, ctx: PartnerContext): Promise<Response> {
  const externalUserId = req.headers.get('x-external-user-id');
  if (!externalUserId) return jsonResponse({ error: 'Missing x-external-user-id header' }, 400);

  const { data: mapping } = await admin
    .from('partner_users')
    .select('iktracker_user_id')
    .eq('partner_id', ctx.partnerId)
    .eq('external_user_id', externalUserId)
    .maybeSingle();
  if (!mapping) return jsonResponse({ error: 'User not linked' }, 404);

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const { data: trips } = await admin
    .from('trips')
    .select('distance, ik_amount')
    .eq('user_id', mapping.iktracker_user_id)
    .gte('date', yearStart)
    .is('deleted_at', null);

  const totalKm = (trips || []).reduce((s, t) => s + (t.distance || 0), 0);
  const totalIk = (trips || []).reduce((s, t) => s + (t.ik_amount || 0), 0);
  const tripsCount = trips?.length || 0;
  const bracket = totalKm <= 5000 ? 'low' : totalKm <= 20000 ? 'mid' : 'high';

  return jsonResponse({
    success: true,
    iktracker_user_id: mapping.iktracker_user_id,
    year: new Date().getFullYear(),
    total_km: Math.round(totalKm * 100) / 100,
    total_ik: Math.round(totalIk * 100) / 100,
    trips_count: tripsCount,
    current_bracket: bracket,
    bracket_label: bracket === 'low' ? '≤ 5 000 km' : bracket === 'mid' ? '5 001 – 20 000 km' : '> 20 000 km',
  });
}

/**
 * Returns annual counters (km / IK / trips) + monthly breakdown for the last N months
 * (default 12, like the Profile page bar chart). Used by partner dashboards (e.g. Dactidevi).
 */
async function handleGetDashboard(req: Request, ctx: PartnerContext): Promise<Response> {
  const externalUserId = req.headers.get('x-external-user-id');
  if (!externalUserId) return jsonResponse({ error: 'Missing x-external-user-id header' }, 400);

  const url = new URL(req.url);
  const monthsParam = parseInt(url.searchParams.get('months') || '12', 10);
  const months = Math.min(Math.max(monthsParam, 1), 24);

  const { data: mapping } = await admin
    .from('partner_users')
    .select('iktracker_user_id')
    .eq('partner_id', ctx.partnerId)
    .eq('external_user_id', externalUserId)
    .maybeSingle();
  if (!mapping) return jsonResponse({ error: 'User not linked' }, 404);

  // Annual counters (current calendar year)
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const { data: yearTrips } = await admin
    .from('trips')
    .select('distance, ik_amount')
    .eq('user_id', mapping.iktracker_user_id)
    .gte('date', yearStart)
    .is('deleted_at', null);

  const totalKm = (yearTrips || []).reduce((s, t) => s + (t.distance || 0), 0);
  const totalIk = (yearTrips || []).reduce((s, t) => s + (t.ik_amount || 0), 0);
  const tripsCount = yearTrips?.length || 0;
  const bracket = totalKm <= 5000 ? 'low' : totalKm <= 20000 ? 'mid' : 'high';

  // Monthly breakdown — last `months` months including current
  const periodStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const periodStartStr = periodStart.toISOString().slice(0, 10);

  const { data: periodTrips } = await admin
    .from('trips')
    .select('date, distance, ik_amount')
    .eq('user_id', mapping.iktracker_user_id)
    .gte('date', periodStartStr)
    .is('deleted_at', null);

  const monthLabelsFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const buckets: Array<{ year: number; month: number; label: string; ym: string; km: number; ik: number; trips: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: monthLabelsFr[d.getMonth()],
      ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      km: 0,
      ik: 0,
      trips: 0,
    });
  }

  (periodTrips || []).forEach((t: any) => {
    const d = new Date(t.date);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const b = buckets.find(x => x.ym === ym);
    if (b) {
      b.km += t.distance || 0;
      b.ik += t.ik_amount || 0;
      b.trips += 1;
    }
  });

  return jsonResponse({
    success: true,
    iktracker_user_id: mapping.iktracker_user_id,
    year: now.getFullYear(),
    counters: {
      total_km: Math.round(totalKm * 100) / 100,
      total_ik: Math.round(totalIk * 100) / 100,
      trips_count: tripsCount,
      current_bracket: bracket,
      bracket_label: bracket === 'low' ? '≤ 5 000 km' : bracket === 'mid' ? '5 001 – 20 000 km' : '> 20 000 km',
    },
    monthly: buckets.map(b => ({
      year: b.year,
      month: b.month,
      label: b.label,
      ym: b.ym,
      km: Math.round(b.km),
      ik: Math.round(b.ik * 100) / 100,
      trips: b.trips,
    })),
  });
}

async function handleSsoMagicLink(req: Request, ctx: PartnerContext): Promise<Response> {
  if (!requireScope(ctx, 'sso')) return jsonResponse({ error: 'Missing sso scope' }, 403);

  const { external_user_id, external_email, redirect_to, metadata } = await req.json();
  if (!external_user_id || !external_email) {
    return jsonResponse({ error: 'external_user_id and external_email required' }, 400);
  }

  const userId = await findOrCreateIktrackerUser(ctx.partnerId, external_user_id, external_email, metadata || {});

  // Sign a short-lived JWT (5 minutes) with HMAC using partner's jwt_secret
  const key = await importHmacKey(ctx.jwtSecret);
  const token = await createJwt(
    { alg: 'HS256', typ: 'JWT' },
    {
      sub: userId,
      partner_id: ctx.partnerId,
      external_user_id,
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 5),
    },
    key,
  );

  const target = redirect_to || '/app';
  const url = `${FRONTEND_URL}/sso?token=${encodeURIComponent(token)}&partner=${encodeURIComponent(ctx.partnerName)}&redirect=${encodeURIComponent(target)}`;

  return jsonResponse({ success: true, sso_url: url, expires_in: 300, iktracker_user_id: userId });
}

/**
 * DEV endpoint — generates a ready-to-use SSO URL from just an email + external_user_id.
 * Skips the JWT signing step on the partner side, useful for local testing & demos.
 * Requires `sso` scope. The returned URL is a one-shot magic link valid ~5 minutes.
 */
async function handleSsoDev(req: Request, ctx: PartnerContext): Promise<Response> {
  if (!requireScope(ctx, 'sso')) return jsonResponse({ error: 'Missing sso scope' }, 403);

  const body = await req.json().catch(() => ({}));
  const { external_user_id, external_email, redirect_to, metadata } = body;
  if (!external_user_id || !external_email) {
    return jsonResponse({ error: 'external_user_id and external_email required' }, 400);
  }

  const userId = await findOrCreateIktrackerUser(ctx.partnerId, external_user_id, external_email, metadata || {});

  const { data: userRow } = await admin.auth.admin.getUserById(userId);
  if (!userRow.user?.email) return jsonResponse({ error: 'User not found' }, 404);

  const target = redirect_to || '/app';
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userRow.user.email,
    options: { redirectTo: `${FRONTEND_URL}${target}` },
  });
  if (linkErr || !link.properties) {
    return jsonResponse({ error: `Failed to generate magic link: ${linkErr?.message}` }, 500);
  }

  await admin
    .from('partner_users')
    .update({ last_sso_at: new Date().toISOString() })
    .eq('partner_id', ctx.partnerId)
    .eq('iktracker_user_id', userId);

  return jsonResponse({
    success: true,
    sso_url: link.properties.action_link,
    expires_in: 300,
    iktracker_user_id: userId,
    note: 'Dev endpoint — magic link directly usable, no JWT verification step.',
  });
}

// ---------- Reports ----------

interface IkBareme {
  upTo5000: number;
  from5001To20000: { rate: number; fixed: number };
  over20000: number;
}
const BAREME_2024: Record<number, IkBareme> = {
  3: { upTo5000: 0.529, from5001To20000: { rate: 0.316, fixed: 1065 }, over20000: 0.370 },
  4: { upTo5000: 0.606, from5001To20000: { rate: 0.340, fixed: 1330 }, over20000: 0.407 },
  5: { upTo5000: 0.636, from5001To20000: { rate: 0.357, fixed: 1395 }, over20000: 0.427 },
  6: { upTo5000: 0.665, from5001To20000: { rate: 0.374, fixed: 1457 }, over20000: 0.447 },
  7: { upTo5000: 0.697, from5001To20000: { rate: 0.394, fixed: 1515 }, over20000: 0.470 },
};

function totalAnnualIk(km: number, cv: number): number {
  const fp = Math.min(Math.max(cv, 3), 7);
  const b = BAREME_2024[fp];
  if (km <= 5000) return km * b.upTo5000;
  if (km <= 20000) return km * b.from5001To20000.rate + b.from5001To20000.fixed;
  return km * b.over20000;
}

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

interface ReportFilters {
  start_date?: string;
  end_date?: string;
  vehicle_id?: string;
}

async function buildReportHtml(userId: string, filters: ReportFilters, partnerName: string): Promise<{ html: string; totalKm: number; totalIk: number; tripsCount: number }> {
  let query = admin.from('trips').select('*').eq('user_id', userId).is('deleted_at', null);
  if (filters.start_date) query = query.gte('date', filters.start_date);
  if (filters.end_date) query = query.lte('date', filters.end_date);
  if (filters.vehicle_id) query = query.eq('vehicle_id', filters.vehicle_id);
  const { data: trips, error } = await query.order('date', { ascending: true });
  if (error) throw new Error(`Failed to fetch trips: ${error.message}`);

  const { data: vehicles } = await admin.from('vehicles').select('*').eq('user_id', userId);
  const vMap = new Map((vehicles || []).map(v => [v.id, v]));

  // Recalculate IK per vehicle/year (cumulative bracket logic)
  type Augmented = typeof trips[0] & { _ik: number; _cum: number; _rate: number };
  const grouped = new Map<string, Augmented[]>();
  (trips || []).forEach(t => {
    const year = new Date(t.date).getFullYear();
    const key = `${t.vehicle_id ?? 'none'}-${year}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({ ...t, _ik: 0, _cum: 0, _rate: 0 });
  });

  const recalc: Augmented[] = [];
  grouped.forEach((list, key) => {
    const vehicleId = key.split('-')[0];
    const vehicle = vMap.get(vehicleId);
    let cum = 0;
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const t of list) {
      const prev = cum;
      cum += t.distance || 0;
      if (!vehicle) {
        t._ik = t.ik_amount || 0; t._cum = cum; t._rate = 0;
      } else {
        const before = totalAnnualIk(prev, vehicle.fiscal_power);
        const after = totalAnnualIk(cum, vehicle.fiscal_power);
        let ik = after - before;
        if (vehicle.is_electric) ik *= 1.2;
        t._ik = Math.round(ik * 100) / 100;
        t._cum = cum;
        const b = BAREME_2024[Math.min(Math.max(vehicle.fiscal_power, 3), 7)];
        t._rate = cum <= 5000 ? b.upTo5000 : cum <= 20000 ? b.from5001To20000.rate : b.over20000;
      }
      recalc.push(t);
    }
  });

  recalc.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalKm = Math.round(recalc.reduce((s, t) => s + (t.distance || 0), 0) * 100) / 100;
  const totalIk = Math.round(recalc.reduce((s, t) => s + t._ik, 0) * 100) / 100;

  const periodLabel = filters.start_date || filters.end_date
    ? `${filters.start_date ? formatDateFr(filters.start_date) : '...'} → ${filters.end_date ? formatDateFr(filters.end_date) : '...'}`
    : 'Année en cours';

  const rows = recalc.map(t => {
    const v = t.vehicle_id ? vMap.get(t.vehicle_id) : null;
    return `<tr>
      <td>${formatDateFr(t.date)}</td>
      <td>${escapeHtml(t.start_location)} → ${escapeHtml(t.end_location)}</td>
      <td style="text-align:right">${(t.distance || 0).toFixed(2)} km</td>
      <td>${v ? escapeHtml(v.name) : '-'}</td>
      <td style="text-align:right;font-weight:600">${t._ik.toFixed(2)} €</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Rapport IK – IKtracker</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 30px auto; padding: 20px; color: #1e293b; }
  h1 { color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
  .meta { color: #64748b; font-size: 14px; margin-bottom: 20px; }
  .summary { display: flex; gap: 20px; margin: 25px 0; }
  .stat { background: #f1f5f9; padding: 15px 20px; border-radius: 8px; flex: 1; }
  .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
  .stat-value { font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
  th { background: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  tr:hover { background: #f8fafc; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  @media print { body { margin: 0; } .no-print { display: none; } }
  .actions { margin: 20px 0; }
  .btn { background: #3b82f6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; }
</style></head>
<body>
<h1>Rapport d'indemnités kilométriques</h1>
<div class="meta">
  Période : <strong>${periodLabel}</strong><br>
  Généré via API partenaire : <strong>${escapeHtml(partnerName)}</strong> · ${new Date().toLocaleDateString('fr-FR')}
</div>
<div class="actions no-print">
  <a class="btn" href="javascript:window.print()">📄 Télécharger PDF</a>
</div>
<div class="summary">
  <div class="stat"><div class="stat-label">Trajets</div><div class="stat-value">${recalc.length}</div></div>
  <div class="stat"><div class="stat-label">Kilomètres</div><div class="stat-value">${totalKm.toFixed(0)} km</div></div>
  <div class="stat"><div class="stat-label">Indemnités</div><div class="stat-value">${totalIk.toFixed(2)} €</div></div>
</div>
<table>
  <thead><tr><th>Date</th><th>Trajet</th><th>Distance</th><th>Véhicule</th><th>IK</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:30px">Aucun trajet sur cette période</td></tr>'}</tbody>
</table>
<div class="footer">Rapport généré par IKtracker.fr · Barème officiel ${new Date().getFullYear()}</div>
</body></html>`;

  return { html, totalKm, totalIk, tripsCount: recalc.length };
}

async function resolveUserId(ctx: PartnerContext, externalUserId: string): Promise<string | null> {
  const { data } = await admin
    .from('partner_users')
    .select('iktracker_user_id')
    .eq('partner_id', ctx.partnerId)
    .eq('external_user_id', externalUserId)
    .maybeSingle();
  return data?.iktracker_user_id ?? null;
}

async function handleGenerateReport(req: Request, ctx: PartnerContext): Promise<Response> {
  if (!requireScope(ctx, 'reports') && !requireScope(ctx, 'trips:read') && !requireScope(ctx, 'read')) {
    return jsonResponse({ error: 'Missing reports / trips:read scope' }, 403);
  }
  const externalUserId = req.headers.get('x-external-user-id');
  if (!externalUserId) return jsonResponse({ error: 'Missing x-external-user-id header' }, 400);

  const body = await req.json().catch(() => ({}));
  const { start_date, end_date, vehicle_id, expires_in_days = 30 } = body;

  const userId = await resolveUserId(ctx, externalUserId);
  if (!userId) return jsonResponse({ error: 'User not linked. Call /sso/magic-link or /trips first.' }, 404);

  const { html, totalKm, totalIk, tripsCount } = await buildReportHtml(
    userId,
    { start_date, end_date, vehicle_id },
    ctx.partnerName,
  );

  const expiresAt = new Date(Date.now() + Math.max(1, Math.min(90, expires_in_days)) * 86400 * 1000).toISOString();

  const { data: share, error } = await admin.from('report_shares').insert({
    user_id: userId,
    html_content: html,
    expires_at: expiresAt,
  }).select('id, expires_at').single();
  if (error) return jsonResponse({ error: error.message }, 500);

  const reportUrl = `${SUPABASE_URL}/functions/v1/view-report?id=${share.id}`;
  const publicUrl = `${FRONTEND_URL}/temporaryreport/${share.id}`;

  return jsonResponse({
    success: true,
    report_id: share.id,
    report_url: publicUrl,
    direct_url: reportUrl,
    expires_at: share.expires_at,
    summary: { trips_count: tripsCount, total_km: totalKm, total_ik: totalIk },
  });
}

async function handleGetReportPdf(reportId: string, ctx: PartnerContext): Promise<Response> {
  if (!requireScope(ctx, 'reports') && !requireScope(ctx, 'trips:read') && !requireScope(ctx, 'read')) {
    return jsonResponse({ error: 'Missing reports / trips:read scope' }, 403);
  }

  // Fetch report HTML and verify ownership (must belong to a user linked to this partner)
  const { data: share, error: shareErr } = await admin
    .from('report_shares')
    .select('id, user_id, html_content, expires_at')
    .eq('id', reportId)
    .maybeSingle();

  if (shareErr || !share) return jsonResponse({ error: 'Report not found' }, 404);
  if (new Date(share.expires_at) < new Date()) {
    return jsonResponse({ error: 'Report expired' }, 410);
  }

  // Security: ensure this report's user is linked to the calling partner
  const { data: link } = await admin
    .from('partner_users')
    .select('id')
    .eq('partner_id', ctx.partnerId)
    .eq('iktracker_user_id', share.user_id)
    .maybeSingle();
  if (!link) return jsonResponse({ error: 'Report does not belong to this partner' }, 403);

  const browserlessKey = Deno.env.get('BROWSERLESS_API_KEY');
  if (!browserlessKey) {
    return jsonResponse({
      error: 'PDF rendering not configured. BROWSERLESS_API_KEY missing.',
    }, 503);
  }

  // Call Browserless to render HTML -> PDF
  // Docs: https://docs.browserless.io/HTTP-APIs/pdf
  try {
    const response = await fetch(
      `https://production-sfo.browserless.io/pdf?token=${encodeURIComponent(browserlessKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: share.html_content,
          options: {
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
          },
          gotoOptions: { waitUntil: 'networkidle0' },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Browserless error', response.status, errText);
      return jsonResponse({
        error: `PDF generation failed (${response.status})`,
        details: errText.slice(0, 500),
      }, 502);
    }

    const pdfBuffer = await response.arrayBuffer();
    const filename = `releve-ik-${new Date().toISOString().split('T')[0]}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.byteLength),
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (e) {
    console.error('PDF render exception', e);
    return jsonResponse({ error: `PDF render error: ${(e as Error).message}` }, 500);
  }
}

async function handleSendReportEmail(req: Request, ctx: PartnerContext): Promise<Response> {
  if (!requireScope(ctx, 'reports') && !requireScope(ctx, 'trips:read') && !requireScope(ctx, 'read')) {
    return jsonResponse({ error: 'Missing reports / trips:read scope' }, 403);
  }
  const externalUserId = req.headers.get('x-external-user-id');
  if (!externalUserId) return jsonResponse({ error: 'Missing x-external-user-id header' }, 400);

  const body = await req.json().catch(() => ({}));
  const { to_email, subject, message, start_date, end_date, vehicle_id, expires_in_days = 30 } = body;
  if (!to_email) return jsonResponse({ error: 'to_email required' }, 400);

  const userId = await resolveUserId(ctx, externalUserId);
  if (!userId) return jsonResponse({ error: 'User not linked' }, 404);

  // Generate report
  const { html, totalKm, totalIk, tripsCount } = await buildReportHtml(
    userId,
    { start_date, end_date, vehicle_id },
    ctx.partnerName,
  );
  const expiresAt = new Date(Date.now() + Math.max(1, Math.min(90, expires_in_days)) * 86400 * 1000).toISOString();
  const { data: share, error: shareErr } = await admin.from('report_shares').insert({
    user_id: userId,
    html_content: html,
    expires_at: expiresAt,
  }).select('id').single();
  if (shareErr) return jsonResponse({ error: shareErr.message }, 500);

  const publicUrl = `${FRONTEND_URL}/temporaryreport/${share.id}`;
  const finalSubject = subject || `Rapport d'indemnités kilométriques – ${tripsCount} trajets`;
  const finalMessage = message || `Bonjour,\n\nVeuillez trouver ci-joint le rapport d'indemnités kilométriques généré via ${ctx.partnerName}.\n\nRésumé :\n- ${tripsCount} trajets\n- ${totalKm.toFixed(0)} km parcourus\n- ${totalIk.toFixed(2)} € d'indemnités\n\nConsulter / télécharger le rapport :\n${publicUrl}\n\nLien valable jusqu'au ${formatDateFr(expiresAt)}.`;

  // Try server-side send via Resend if key is configured
  const resendKey = Deno.env.get('RESEND_API_KEY');
  let emailSent = false;
  let emailError: string | null = null;

  if (resendKey) {
    try {
      const emailHtml = `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#0f172a">Rapport d'indemnités kilométriques</h2>
        <p>${escapeHtml(finalMessage).replace(/\n/g, '<br>').replace(escapeHtml(publicUrl), `<a href="${publicUrl}" style="color:#3b82f6">${publicUrl}</a>`)}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
        <div style="background:#f1f5f9;padding:15px;border-radius:8px">
          <strong>Résumé :</strong><br>
          ${tripsCount} trajets · ${totalKm.toFixed(0)} km · ${totalIk.toFixed(2)} €
        </div>
        <p style="text-align:center;margin-top:25px">
          <a href="${publicUrl}" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Consulter le rapport</a>
        </p>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:30px">
          Envoyé via IKtracker.fr · Partenaire : ${escapeHtml(ctx.partnerName)}
        </p>
      </div>`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'IKtracker <noreply@iktracker.fr>',
          to: [to_email],
          subject: finalSubject,
          html: emailHtml,
          text: finalMessage,
        }),
      });
      if (res.ok) {
        emailSent = true;
      } else {
        emailError = `Resend ${res.status}: ${await res.text()}`;
      }
    } catch (e) {
      emailError = (e as Error).message;
    }
  } else {
    emailError = 'RESEND_API_KEY not configured — use mailto fallback';
  }

  const mailto = `mailto:${encodeURIComponent(to_email)}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(finalMessage)}`;

  return jsonResponse({
    success: true,
    email_sent: emailSent,
    email_error: emailSent ? null : emailError,
    mailto_url: mailto,
    report_id: share.id,
    report_url: publicUrl,
    expires_at: expiresAt,
    summary: { trips_count: tripsCount, total_km: totalKm, total_ik: totalIk },
  });
}

async function handleSsoVerify(req: Request): Promise<Response> {
  // Internal endpoint called by /sso frontend page to exchange the partner JWT for a Supabase session
  const { token, partner_id } = await req.json();
  if (!token || !partner_id) return jsonResponse({ error: 'token and partner_id required' }, 400);

  const { data: partner } = await admin
    .from('partner_api_keys')
    .select('jwt_secret')
    .eq('id', partner_id)
    .eq('is_active', true)
    .maybeSingle();
  if (!partner) return jsonResponse({ error: 'Partner not found' }, 404);

  let payload: Record<string, unknown>;
  try {
    const key = await importHmacKey(partner.jwt_secret);
    payload = await verifyJwt(token, key);
  } catch (_) {
    return jsonResponse({ error: 'Invalid or expired token' }, 401);
  }

  const userId = payload.sub as string;

  // Generate a magic link via Supabase Admin API
  const { data: userRow } = await admin.auth.admin.getUserById(userId);
  if (!userRow.user?.email) return jsonResponse({ error: 'User not found' }, 404);

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userRow.user.email,
    options: { redirectTo: `${FRONTEND_URL}/app` },
  });
  if (linkErr || !link.properties) return jsonResponse({ error: 'Failed to generate session link' }, 500);

  // Update last_sso_at
  await admin
    .from('partner_users')
    .update({ last_sso_at: new Date().toISOString() })
    .eq('partner_id', partner_id)
    .eq('iktracker_user_id', userId);

  return jsonResponse({
    success: true,
    action_link: link.properties.action_link,
    iktracker_user_id: userId,
  });
}

// ---------- Preferences (calendar_import_mode + ik_rate_override) ----------

const VALID_CAL_MODES = ['individual', 'tour'] as const;
type CalMode = typeof VALID_CAL_MODES[number];

const VALID_IK_OVERRIDES = ['auto', 'tier1', 'tier2', 'tier3'] as const;
type IkOverride = typeof VALID_IK_OVERRIDES[number];

async function resolveLinkedUserId(ctx: PartnerContext, externalUserId: string): Promise<string | null> {
  const { data } = await admin
    .from('partner_users')
    .select('iktracker_user_id')
    .eq('partner_id', ctx.partnerId)
    .eq('external_user_id', externalUserId)
    .maybeSingle();
  return data?.iktracker_user_id ?? null;
}

async function handleGetPreferences(req: Request, ctx: PartnerContext): Promise<Response> {
  if (!requireScope(ctx, 'preferences:read') && !requireScope(ctx, 'read')) {
    return jsonResponse({ error: 'Missing preferences:read scope' }, 403);
  }
  const externalUserId = req.headers.get('x-external-user-id');
  if (!externalUserId) return jsonResponse({ error: 'Missing x-external-user-id header' }, 400);

  const userId = await resolveLinkedUserId(ctx, externalUserId);
  if (!userId) return jsonResponse({ error: 'User not linked' }, 404);

  const { data } = await admin
    .from('user_preferences')
    .select('calendar_import_mode, ik_rate_override')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: home } = await admin
    .from('locations')
    .select('id')
    .eq('user_id', userId)
    .eq('label', 'Maison')
    .maybeSingle();

  const mode = (data?.calendar_import_mode as CalMode | undefined) ?? 'individual';
  const ikOverride = (data?.ik_rate_override as IkOverride | undefined) ?? 'auto';
  return jsonResponse({
    success: true,
    calendar_import_mode: mode,
    ik_rate_override: ikOverride,
    ik_rate_override_options: VALID_IK_OVERRIDES,
    has_home_address: !!home,
    note: mode === 'tour' && !home
      ? 'Tour mode active but no Maison address set — imports will fall back to individual trips.'
      : undefined,
  });
}

async function handleUpdatePreferences(req: Request, ctx: PartnerContext): Promise<Response> {
  if (!requireScope(ctx, 'preferences:write') && !requireScope(ctx, 'write')) {
    return jsonResponse({ error: 'Missing preferences:write scope' }, 403);
  }
  const externalUserId = req.headers.get('x-external-user-id');
  if (!externalUserId) return jsonResponse({ error: 'Missing x-external-user-id header' }, 400);

  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (body.calendar_import_mode !== undefined) {
    if (!VALID_CAL_MODES.includes(body.calendar_import_mode)) {
      return jsonResponse({ error: `calendar_import_mode must be one of: ${VALID_CAL_MODES.join(', ')}` }, 400);
    }
    patch.calendar_import_mode = body.calendar_import_mode;
  }
  if (body.ik_rate_override !== undefined) {
    if (!VALID_IK_OVERRIDES.includes(body.ik_rate_override)) {
      return jsonResponse({ error: `ik_rate_override must be one of: ${VALID_IK_OVERRIDES.join(', ')}` }, 400);
    }
    patch.ik_rate_override = body.ik_rate_override;
  }
  if (Object.keys(patch).length === 0) {
    return jsonResponse({ error: 'Provide at least one of: calendar_import_mode, ik_rate_override' }, 400);
  }

  const userId = await resolveLinkedUserId(ctx, externalUserId);
  if (!userId) return jsonResponse({ error: 'User not linked' }, 404);

  const { error } = await admin
    .from('user_preferences')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
  if (error) return jsonResponse({ error: error.message }, 500);

  const { data: updated } = await admin
    .from('user_preferences')
    .select('calendar_import_mode, ik_rate_override')
    .eq('user_id', userId)
    .maybeSingle();

  fireWebhook(ctx.partnerId, 'preferences.updated', {
    external_user_id: externalUserId,
    iktracker_user_id: userId,
    calendar_import_mode: updated?.calendar_import_mode,
    ik_rate_override: updated?.ik_rate_override,
    changed: Object.keys(patch),
  });

  return jsonResponse({
    success: true,
    calendar_import_mode: updated?.calendar_import_mode,
    ik_rate_override: updated?.ik_rate_override,
  });
}

// Internal endpoint called by a DB trigger when a user changes preferences in the app.
// Fans out preferences.updated to every partner that has linked this user.
async function handleInternalPreferencesChanged(req: Request): Promise<Response> {
  const secret = req.headers.get('x-internal-secret');
  if (secret !== SERVICE_ROLE_KEY) return jsonResponse({ error: 'Forbidden' }, 403);

  const { iktracker_user_id, calendar_import_mode, ik_rate_override, changed } = await req.json();
  if (!iktracker_user_id) return jsonResponse({ error: 'iktracker_user_id required' }, 400);

  const { data: mappings } = await admin
    .from('partner_users')
    .select('partner_id, external_user_id')
    .eq('iktracker_user_id', iktracker_user_id);

  for (const m of mappings ?? []) {
    fireWebhook(m.partner_id, 'preferences.updated', {
      external_user_id: m.external_user_id,
      iktracker_user_id,
      calendar_import_mode,
      ik_rate_override,
      changed: changed ?? [],
      source: 'in_app',
    });
  }
  return jsonResponse({ success: true, notified: mappings?.length ?? 0 });
}

// ---------- Main router ----------


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // Strip the function prefix: /partner-api/<route>
  const segments = url.pathname.split('/').filter(Boolean);
  const fnIdx = segments.indexOf('partner-api');
  const route = '/' + segments.slice(fnIdx + 1).join('/');
  const start = Date.now();

  // Public verify endpoint (no API key, called by /sso frontend page)
  if (route === '/sso/verify' && req.method === 'POST') {
    try {
      const res = await handleSsoVerify(req);
      return res;
    } catch (e) {
      return jsonResponse({ error: (e as Error).message }, 500);
    }
  }

  // Internal endpoint (service-role secret), called by a DB trigger
  if (route === '/internal/preferences-changed' && req.method === 'POST') {
    try { return await handleInternalPreferencesChanged(req); }
    catch (e) { return jsonResponse({ error: (e as Error).message }, 500); }
  }

  // All other routes require API key
  const auth = await authenticatePartner(req);
  if ('error' in auth) {
    await logRequest(null, req.method, route, auth.status, Date.now() - start, undefined, undefined, auth.error);
    return jsonResponse({ error: auth.error }, auth.status);
  }
  const ctx = auth as PartnerContext;

  try {
    let res: Response;
    if (route === '/health' && req.method === 'GET') {
      res = jsonResponse({ ok: true, partner: ctx.partnerName, quota_remaining: ctx.quotaRemaining });
    } else if (route === '/vehicle/lookup' && req.method === 'POST') {
      res = await handleVehicleLookup(req, ctx);
    } else if (route === '/ik/calculate' && req.method === 'POST') {
      res = await handleCalculateIk(req, ctx);
    } else if (route === '/trips' && req.method === 'POST') {
      res = await handleCreateTrip(req, ctx);
    } else if (route === '/stats' && req.method === 'GET') {
      res = await handleGetStats(req, ctx);
    } else if (route === '/dashboard' && req.method === 'GET') {
      res = await handleGetDashboard(req, ctx);
    } else if (route === '/sso/magic-link' && req.method === 'POST') {
      res = await handleSsoMagicLink(req, ctx);
    } else if (route === '/sso/dev' && req.method === 'POST') {
      res = await handleSsoDev(req, ctx);
    } else if (route === '/reports/generate' && req.method === 'POST') {
      res = await handleGenerateReport(req, ctx);
    } else if (route === '/reports/send-email' && req.method === 'POST') {
      res = await handleSendReportEmail(req, ctx);
    } else if (req.method === 'GET' && /^\/reports\/[^/]+\/pdf$/.test(route)) {
      const reportId = route.split('/')[2];
      res = await handleGetReportPdf(reportId, ctx);
    } else if (route === '/preferences' && req.method === 'GET') {
      res = await handleGetPreferences(req, ctx);
    } else if (route === '/preferences' && (req.method === 'PUT' || req.method === 'PATCH')) {
      res = await handleUpdatePreferences(req, ctx);

    } else {
      res = jsonResponse({ error: 'Route not found', route, method: req.method }, 404);
    }

    await logRequest(ctx.partnerId, req.method, route, res.status, Date.now() - start, req.headers.get('x-external-user-id') ?? undefined);
    return res;
  } catch (e) {
    const msg = (e as Error).message;
    console.error('partner-api error:', msg);
    await logRequest(ctx.partnerId, req.method, route, 500, Date.now() - start, undefined, undefined, msg);
    return jsonResponse({ error: msg }, 500);
  }
});
