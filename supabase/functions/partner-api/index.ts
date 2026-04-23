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

  // 5. Trigger webhook user.linked
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
      const key = await importHmacKey(hook.hmac_secret);
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
    } else if (route === '/sso/magic-link' && req.method === 'POST') {
      res = await handleSsoMagicLink(req, ctx);
    } else if (route === '/sso/dev' && req.method === 'POST') {
      res = await handleSsoDev(req, ctx);
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
