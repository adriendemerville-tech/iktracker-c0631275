// Detect and purge duplicate trips (same user + same date + same normalized destination)
// Modes:
//   - dry_run (default true for admins, false for cron): returns groups without deleting
//   - keep strategy: keep the OLDEST non-deleted trip; soft-delete the rest (deleted_at = now)
// Auth: admin user via JWT, OR cron via x-cron-secret header matching SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalizeLocation(s: string | null | undefined): string {
  if (!s) return '';
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await admin.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  return !!data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth: cron secret OR admin user
    const cronSecret = req.headers.get('x-cron-secret');
    const isCron = cronSecret && cronSecret === SERVICE_ROLE_KEY;

    let actor = 'cron';
    let scopeUserId: string | null = null;

    if (!isCron) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return jsonResponse({ error: 'Missing Authorization' }, 401);
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return jsonResponse({ error: 'Invalid token' }, 401);
      if (!(await isAdmin(user.id))) return jsonResponse({ error: 'Admin role required' }, 403);
      actor = `admin:${user.id}`;
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const dryRun = body.dry_run !== false; // default true; cron passes false explicitly
    scopeUserId = body.user_id ?? null;     // optional: limit to one user
    const daysBack = Number(body.days_back ?? 365);

    // Fetch candidate trips (only active ones; we won't touch already-archived ones)
    const since = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
    let q = admin.from('trips')
      .select('id, user_id, date, end_location, distance, source, created_at, deleted_at, calendar_event_id')
      .is('deleted_at', null)
      .gte('date', since)
      .order('created_at', { ascending: true });
    if (scopeUserId) q = q.eq('user_id', scopeUserId);

    const { data: trips, error } = await q;
    if (error) return jsonResponse({ error: error.message }, 500);

    // Group by user|date|normalized end_location
    const groups = new Map<string, typeof trips>();
    for (const t of trips || []) {
      const norm = normalizeLocation(t.end_location);
      if (!norm) continue;
      const key = `${t.user_id}|${t.date}|${norm}`;
      if (!groups.has(key)) groups.set(key, [] as any);
      groups.get(key)!.push(t);
    }

    const duplicateGroups: any[] = [];
    const toDelete: string[] = [];
    for (const [key, items] of groups) {
      if (items.length < 2) continue;
      // keep the oldest (already sorted ascending), delete the rest
      const [keep, ...dupes] = items;
      duplicateGroups.push({
        key,
        kept_trip_id: keep.id,
        deleted_count: dupes.length,
        duplicates: dupes.map(d => ({
          id: d.id, source: d.source, created_at: d.created_at,
          calendar_event_id: d.calendar_event_id, distance: d.distance,
        })),
      });
      for (const d of dupes) toDelete.push(d.id);
    }

    let deleted = 0;
    if (!dryRun && toDelete.length > 0) {
      // Soft-delete in batches of 500
      for (let i = 0; i < toDelete.length; i += 500) {
        const batch = toDelete.slice(i, i + 500);
        const { error: delErr, count } = await admin
          .from('trips')
          .update({ deleted_at: new Date().toISOString() }, { count: 'exact' })
          .in('id', batch);
        if (delErr) return jsonResponse({ error: delErr.message, deleted_so_far: deleted }, 500);
        deleted += count ?? batch.length;
      }
    }

    const summary = {
      actor,
      dry_run: dryRun,
      scope_user_id: scopeUserId,
      days_back: daysBack,
      candidate_trips: trips?.length ?? 0,
      duplicate_groups: duplicateGroups.length,
      duplicates_to_delete: toDelete.length,
      deleted,
      groups: dryRun ? duplicateGroups.slice(0, 200) : duplicateGroups.slice(0, 50),
    };

    // Log non-dry runs
    if (!dryRun) {
      await admin.from('error_logs').insert({
        error_type: 'maintenance',
        source: 'purge-duplicate-trips',
        message: `Purged ${deleted} duplicate trips (${duplicateGroups.length} groups)`,
        metadata: { actor, scope_user_id: scopeUserId, days_back: daysBack },
        resolved: true,
        resolved_at: new Date().toISOString(),
      }).then(() => {}, () => {});
    }

    return jsonResponse(summary);
  } catch (e) {
    return jsonResponse({ error: String(e?.message || e) }, 500);
  }
});
