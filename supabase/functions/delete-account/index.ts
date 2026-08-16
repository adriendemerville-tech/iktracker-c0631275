// Permanently delete the authenticated user's account and their data.
// Auth: user JWT required. Deletes auth.users row (cascade removes related rows
// wherever FKs are ON DELETE CASCADE; other tables are cleaned best-effort).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid token" }, 401);

    const userId = user.id;

    // Best-effort cleanup of user data across app tables.
    // Order doesn't matter with service_role — RLS is bypassed.
    const tables = [
      "trips",
      "vehicles",
      "locations",
      "frequent_destinations",
      "recurring_trips",
      "tour_sessions",
      "tour_recovery_events",
      "user_preferences",
      "calendar_connections",
      "feedback",
      "survey_responses",
      "survey_impressions",
      "referral_sources",
      "share_events",
      "download_clicks",
      "report_shares",
      "takeout_import_attempts",
      "marketing_analytics",
      "user_roles",
    ];
    for (const t of tables) {
      try {
        await admin.from(t).delete().eq("user_id", userId);
      } catch (_) {
        // ignore per-table errors, continue cleanup
      }
    }

    // Finally, delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error("[delete-account] deleteUser failed", delErr);
      return json({ error: delErr.message }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("[delete-account] error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
