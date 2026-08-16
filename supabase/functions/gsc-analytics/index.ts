import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
    if (!LOVABLE_API_KEY || !GSC_KEY) {
      return json({ error: "GSC connector not configured" }, 500);
    }

    // Auth + admin check
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    const { data: isViewer } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "viewer",
    });
    if (!isAdmin && !isViewer) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "summary";

    const gwHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GSC_KEY,
      "Content-Type": "application/json",
    };

    if (action === "sites") {
      const r = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers: gwHeaders });
      const text = await r.text();
      if (!r.ok) return json({ error: "Gateway error", status: r.status, details: text }, r.status);
      return json(JSON.parse(text));
    }

    if (action === "summary" || action === "query") {
      const siteUrl: string | undefined = body.siteUrl;
      if (!siteUrl) return json({ error: "siteUrl required" }, 400);
      const days = Math.min(Math.max(Number(body.days ?? 28), 1), 480);
      const dimensions: string[] = body.dimensions ?? [];
      const rowLimit = Math.min(Number(body.rowLimit ?? 10), 1000);

      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const path = `/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
      const r = await fetch(`${GATEWAY}${path}`, {
        method: "POST",
        headers: gwHeaders,
        body: JSON.stringify({
          startDate: fmt(start),
          endDate: fmt(end),
          dimensions,
          rowLimit,
        }),
      });
      const text = await r.text();
      if (!r.ok) return json({ error: "Gateway error", status: r.status, details: text }, r.status);
      return json(JSON.parse(text));
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("gsc-analytics error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
