import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Edge Function `sitemap` — PROXY uniquement.
 *
 * La génération du sitemap est assurée par la route SSR TanStack
 * `src/routes/sitemap[.]xml.ts` (source de vérité unique : pages statiques +
 * articles `published`). Cette fonction ne fait plus que relayer cette route,
 * pour rester compatible avec le proxy du Worker Cloudflare
 * (cloudflare-worker/iktracker-bot-router.js → SUPABASE_SITEMAP).
 *
 * On interroge l'origine Lovable et non iktracker.fr : le Worker route déjà
 * /sitemap.xml vers cette fonction, viser l'apex créerait une boucle.
 */
const ORIGIN_SITEMAP = "https://iktracker.lovable.app/sitemap.xml";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const res = await fetch(ORIGIN_SITEMAP, {
      headers: { "User-Agent": req.headers.get("user-agent") || "iktracker-sitemap-proxy" },
    });

    if (!res.ok) {
      return new Response("Sitemap temporarily unavailable", {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "text/plain", "Retry-After": "300" },
      });
    }

    const xml = await res.text();
    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Sitemap-Source": "ssr-proxy",
      },
    });
  } catch (_e) {
    return new Response("Sitemap temporarily unavailable", {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "text/plain", "Retry-After": "300" },
    });
  }
});
