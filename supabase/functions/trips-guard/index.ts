import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

// ---------- Barème IK (source de vérité partagée avec recalculate-distances) ----------
interface IKBareme {
  upTo5000: number;
  from5001To20000: { rate: number; fixed: number };
  over20000: number;
}

const BAREMES: Record<number, IKBareme> = {
  3: { upTo5000: 0.529, from5001To20000: { rate: 0.316, fixed: 1065 }, over20000: 0.370 },
  4: { upTo5000: 0.606, from5001To20000: { rate: 0.340, fixed: 1330 }, over20000: 0.407 },
  5: { upTo5000: 0.636, from5001To20000: { rate: 0.357, fixed: 1395 }, over20000: 0.427 },
  6: { upTo5000: 0.665, from5001To20000: { rate: 0.374, fixed: 1457 }, over20000: 0.447 },
  7: { upTo5000: 0.697, from5001To20000: { rate: 0.394, fixed: 1515 }, over20000: 0.470 },
};

function getBareme(fiscalPower: number): IKBareme {
  if (fiscalPower <= 3) return BAREMES[3];
  if (fiscalPower >= 7) return BAREMES[7];
  return BAREMES[fiscalPower] ?? BAREMES[7];
}

function annualIK(km: number, fiscalPower: number): number {
  const b = getBareme(fiscalPower);
  if (km <= 5000) return km * b.upTo5000;
  if (km <= 20000) return km * b.from5001To20000.rate + b.from5001To20000.fixed;
  return km * b.over20000;
}

// ---------- Utilitaires géo ----------
function isUsableCoord(lat?: number | null, lng?: number | null): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false; // 0,0 placeholder
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function normalize(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function drivingDistanceKm(origin: string, destination: string): Promise<number | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      mode: 'driving',
      language: 'fr',
      key: GOOGLE_MAPS_API_KEY,
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK') return null;
    const el = data.rows?.[0]?.elements?.[0];
    if (el?.status === 'OK' && el.distance?.value) {
      return Math.round(el.distance.value / 100) / 10;
    }
    return null;
  } catch (_e) {
    return null;
  }
}

interface TripRow {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  date: string;
  start_location: string | null;
  end_location: string | null;
  start_address: string | null;
  end_address: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  distance: number | null;
  ik_amount: number | null;
  round_trip: boolean | null;
  tour_stops: unknown;
}

const MAX_GEO_CALLS = 120; // garde-fou coût API par exécution
const ABSURD_ONE_WAY_KM = 1200;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // --- Authentification : cron (service role / CRON_SECRET) ou admin connecté ---
  const cronSecret = Deno.env.get('CRON_SECRET');
  const altCronSecret = Deno.env.get('SYNC_CRON_TOKEN');
  const providedCronSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('Authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isCron = (bearer && bearer === SUPABASE_SERVICE_ROLE_KEY) ||
    (!!providedCronSecret && (providedCronSecret === cronSecret || providedCronSecret === altCronSecret));

  let triggeredBy = 'cron';
  let scopedUserId: string | null = null;

  if (!isCron) {
    if (!bearer) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    // Un utilisateur non-admin ne peut auditer que ses propres trajets
    scopedUserId = isAdmin ? null : userData.user.id;
    triggeredBy = isAdmin ? 'admin' : 'user';
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const dryRun = body?.dry_run === true || body?.dry_run === 1;
  const sinceDays = Number(body?.since_days) > 0 ? Number(body.since_days) : 400;
  const sinceDate = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10);

  // Pagination : PostgREST plafonne à 1000 lignes par requête
  const rows: TripRow[] = [];
  const PAGE = 1000;
  for (let offset = 0; offset < 20000; offset += PAGE) {
    let query = supabase
      .from('trips')
      .select('id, user_id, vehicle_id, date, start_location, end_location, start_address, end_address, start_lat, start_lng, end_lat, end_lng, distance, ik_amount, round_trip, tour_stops')
      .is('deleted_at', null)
      .gte('date', sinceDate)
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (scopedUserId) query = query.eq('user_id', scopedUserId);

    const { data, error: tripsError } = await query;
    if (tripsError) {
      console.error('trips-guard: fetch error', tripsError);
      return new Response(JSON.stringify({ error: 'Failed to load trips' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    rows.push(...((data || []) as TripRow[]));
    if (!data || data.length < PAGE) break;
  }


  // Caches
  const vehicleCache = new Map<string, { fiscal_power: number; is_electric: boolean } | null>();
  const homeCache = new Map<string, string | null>();

  // Cumul annuel réel (lu en base) avant la date du trajet, comme dans recalculate-distances
  async function annualKmBefore(userId: string, vehicleId: string, tripDate: string): Promise<number> {
    const startOfYear = `${tripDate.slice(0, 4)}-01-01`;
    const { data } = await supabase
      .from('trips')
      .select('distance')
      .eq('user_id', userId)
      .eq('vehicle_id', vehicleId)
      .is('deleted_at', null)
      .gte('date', startOfYear)
      .lt('date', tripDate);
    return (data || []).reduce((sum: number, t: { distance: number | null }) => sum + (Number(t.distance) || 0), 0);
  }


  async function getVehicle(id: string) {
    if (!vehicleCache.has(id)) {
      const { data } = await supabase
        .from('vehicles').select('fiscal_power, is_electric').eq('id', id).maybeSingle();
      vehicleCache.set(id, data ?? null);
    }
    return vehicleCache.get(id) ?? null;
  }

  async function getHome(userId: string) {
    if (!homeCache.has(userId)) {
      const { data } = await supabase
        .from('locations').select('address').eq('user_id', userId)
        .eq('type', 'home').not('address', 'is', null).limit(1);
      homeCache.set(userId, data?.[0]?.address ?? null);
    }
    return homeCache.get(userId) ?? null;
  }

  let geoCalls = 0;
  let fixed = 0, skipped = 0, failed = 0;
  const details: Array<Record<string, unknown>> = [];

  for (const trip of rows) {
    try {
      const issues: string[] = [];
      const update: Record<string, unknown> = {};

      const startText = trip.start_address || trip.start_location || '';
      const endText = trip.end_address || trip.end_location || '';
      // Une tournée en boucle part et revient au même point : ce n'est pas une anomalie
      const stopsCount = Array.isArray(trip.tour_stops) ? trip.tour_stops.length : 0;
      const isLoopTour = stopsCount > 0;
      const sameEndpoints = !isLoopTour && !!normalize(startText) && normalize(startText) === normalize(endText);

      // 1. Coordonnées invalides (0,0 ou hors bornes) -> on les purge
      if ((trip.start_lat !== null || trip.start_lng !== null) && !isUsableCoord(trip.start_lat, trip.start_lng)) {
        update.start_lat = null; update.start_lng = null;
        issues.push('invalid_start_coords');
      }
      if ((trip.end_lat !== null || trip.end_lng !== null) && !isUsableCoord(trip.end_lat, trip.end_lng)) {
        update.end_lat = null; update.end_lng = null;
        issues.push('invalid_end_coords');
      }

      const distance = Number(trip.distance) || 0;
      const multiplier = trip.round_trip ? 2 : 1;
      const oneWay = distance / multiplier;

      // 2. Détection d'incohérence de distance
      let needsGeoRecalc = false;

      if (distance <= 0 && !sameEndpoints && !isLoopTour && startText && endText) {
        issues.push('zero_distance');
        needsGeoRecalc = true;
      } else if (sameEndpoints && distance > 5) {
        issues.push('same_endpoints_nonzero');
        needsGeoRecalc = true;
      } else if (!isLoopTour && oneWay > ABSURD_ONE_WAY_KM) {
        issues.push('absurd_distance');
        needsGeoRecalc = true;
      } else if (
        !isLoopTour &&
        isUsableCoord(trip.start_lat, trip.start_lng) &&
        isUsableCoord(trip.end_lat, trip.end_lng) &&
        distance > 0
      ) {
        const crow = haversineKm(trip.start_lat!, trip.start_lng!, trip.end_lat!, trip.end_lng!);
        // Route réelle ≈ 1.0x–1.6x le vol d'oiseau. Au-delà de 2.5x (+20 km de marge) c'est incohérent.
        if (oneWay > crow * 2.5 + 20 || (crow > 5 && oneWay < crow * 0.7)) {
          issues.push('distance_vs_coords_mismatch');
          needsGeoRecalc = true;
        }
      }

      let newDistance = distance;

      if (needsGeoRecalc) {
        if (sameEndpoints) {
          newDistance = 0;
        } else if (geoCalls >= MAX_GEO_CALLS || !GOOGLE_MAPS_API_KEY) {
          skipped++;
          continue;
        } else {
          let origin = startText;
          if (!origin || normalize(origin).length < 4 || /^(maison|domicile|position)$/.test(normalize(origin))) {
            origin = (await getHome(trip.user_id)) || origin;
          }
          if (!origin || !endText) { skipped++; continue; }
          geoCalls++;
          const km = await drivingDistanceKm(origin, endText);
          if (km === null || km === 0) { skipped++; continue; }
          newDistance = Math.round(km * multiplier * 10) / 10;
        }
        if (newDistance !== distance) update.distance = newDistance;
      }

      // 3. Montant IK : recalculé uniquement si la distance a changé,
      //    ou si l'IK est manquant/nul alors que le trajet a une distance et un véhicule.
      const currentIk = Number(trip.ik_amount) || 0;
      const distanceChanged = update.distance !== undefined;
      const ikMissing = currentIk <= 0 && newDistance > 0 && !!trip.vehicle_id;

      if (distanceChanged || ikMissing) {
        let expectedIk = 0;
        if (trip.vehicle_id && newDistance > 0) {
          const vehicle = await getVehicle(trip.vehicle_id);
          if (vehicle) {
            const before = await annualKmBefore(trip.user_id, trip.vehicle_id, trip.date);
            const after = before + newDistance;
            expectedIk = annualIK(after, vehicle.fiscal_power) - annualIK(before, vehicle.fiscal_power);
            if (vehicle.is_electric) expectedIk *= 1.2;
            expectedIk = Math.round(expectedIk * 100) / 100;
          }
        }
        if (Math.abs(currentIk - expectedIk) > Math.max(0.5, expectedIk * 0.02)) {
          issues.push(ikMissing && !distanceChanged ? 'ik_missing' : 'ik_mismatch');
          update.ik_amount = expectedIk;
        }
      }


      if (issues.length === 0 || Object.keys(update).length === 0) continue;

      details.push({
        trip_id: trip.id,
        user_id: trip.user_id,
        date: trip.date,
        issues,
        before: { distance, ik_amount: currentIk },
        after: { distance: update.distance ?? distance, ik_amount: update.ik_amount ?? currentIk },
      });

      if (dryRun) { fixed++; continue; }

      const { error: updErr } = await supabase.from('trips').update(update).eq('id', trip.id);
      if (updErr) {
        console.error('trips-guard: update failed', trip.id, updErr);
        failed++;
      } else {
        fixed++;
      }
    } catch (e) {
      console.error('trips-guard: trip error', trip.id, e);
      failed++;
    }
  }

  const result = {
    success: true,
    dry_run: dryRun,
    scanned: rows.length,
    fixed,
    skipped,
    failed,
    geo_calls: geoCalls,
    details: details.slice(0, 200),
    timestamp: new Date().toISOString(),
  };

  if (!dryRun) {
    await supabase.from('trip_guard_runs').insert({
      scanned: rows.length,
      fixed,
      skipped,
      failed,
      triggered_by: triggeredBy,
      details: details.slice(0, 200),
    });
  }

  console.log('trips-guard done', JSON.stringify({ scanned: rows.length, fixed, skipped, failed, geoCalls }));

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
