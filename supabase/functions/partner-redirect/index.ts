// Edge function: server-side redirect for outbound partner links
// Records a click in partner_clicks then 302-redirects to the partner target URL.
// Public endpoint (no JWT required).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const page = url.searchParams.get("page") || null;
    const placement = url.searchParams.get("placement") || null;
    const persona = url.searchParams.get("persona") || null;
    const sessionId = url.searchParams.get("sid") || null;

    if (!slug || !/^[a-z0-9-]{1,64}$/.test(slug)) {
      return new Response(JSON.stringify({ error: "Invalid slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up partner
    const { data: partner, error: partnerErr } = await supabase
      .from("outbound_partners")
      .select("id, target_url, is_active")
      .eq("slug", slug)
      .maybeSingle();

    if (partnerErr || !partner || !partner.is_active) {
      return new Response("Partner not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Resolve user_id from optional bearer token (best effort)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const anonClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
        );
        const { data } = await anonClient.auth.getUser(token);
        userId = data?.user?.id ?? null;
      } catch {
        // Anonymous click — ignore
      }
    }

    // Extract IP (Cloudflare or x-forwarded-for)
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;

    // Record click (fire and forget, but await briefly so it persists)
    await supabase.from("partner_clicks").insert({
      partner_id: partner.id,
      user_id: userId,
      session_id: sessionId,
      page,
      placement,
      persona,
      referrer: req.headers.get("referer") || null,
      user_agent: req.headers.get("user-agent") || null,
      ip_address: ip,
    });

    // Build destination URL with UTM auto-injection
    const dest = new URL(partner.target_url);
    if (!dest.searchParams.has("utm_source")) {
      dest.searchParams.set("utm_source", "iktracker");
    }
    if (!dest.searchParams.has("utm_medium")) {
      dest.searchParams.set("utm_medium", "partner_card");
    }
    if (placement && !dest.searchParams.has("utm_content")) {
      dest.searchParams.set("utm_content", placement);
    }
    if (page && !dest.searchParams.has("utm_campaign")) {
      dest.searchParams.set("utm_campaign", page.replace(/^\//, "") || "home");
    }

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: dest.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("partner-redirect error", err);
    return new Response("Internal error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
