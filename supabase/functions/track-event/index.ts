// Marketing analytics ingestion — captures client IP server-side (CF/Fly headers)
// so we don't depend on api.ipify.org (blocked by uBlock/Brave/Pi-hole).
//
// Public endpoint (verify_jwt = false). No auth required, but we validate the
// event shape and drop bot user-agents. If an Authorization header is present
// we resolve user_id from the JWT; otherwise the event is anonymous.

import { corsHeaders as defaultCorsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Restrict CORS to our own origins. Any other origin falls back to `null`
// (browsers refuse the response) — server-to-server callers (curl, edge tests)
// are unaffected because they don't enforce CORS.
const ALLOWED_ORIGIN_RE =
  /^https:\/\/(?:[a-z0-9-]+\.)*(?:iktracker\.fr|lovable\.app|lovableproject\.com)$/i;

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGIN_RE.test(origin) ? origin : "null";
  return {
    ...defaultCorsHeaders,
    "Access-Control-Allow-Origin": allow,
    Vary: "Origin",
  };
}

const ALLOWED_EVENTS = new Set([
  "page_view",
  "cta_click",
  "ik_simulation",
  "signup_click",
  "crawlers_click",
  "signup_view",
  "signup_oauth_start",
  "signup_oauth_return",
  "signup_oauth_denied",
  "signup_oauth_abandon",

  "signup_form_submit",
  "signup_error",
  "signup_success",
]);

const BOT_UA =
  /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|headlesschrome|lighthouse|pingdom|gtmetrix/i;

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xrl = req.headers.get("x-real-ip");
  if (xrl) return xrl.trim();
  return null;
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);

  try {
    const body = (await req.json().catch(() => null)) as any;
    if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400, cors);

    const eventType = String(body.event_type ?? "");
    const page = String(body.page ?? "");
    if (!ALLOWED_EVENTS.has(eventType)) return json({ error: "Invalid event_type" }, 400, cors);
    if (!page || page.length > 128) return json({ error: "Invalid page" }, 400, cors);

    const userAgent = req.headers.get("user-agent") ?? body.user_agent ?? "unknown";
    if (BOT_UA.test(userAgent)) return json({ ok: true, skipped: "bot" }, 200, cors);

    // Resolve user (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await anon.auth.getUser();
      userId = data.user?.id ?? null;

      // Skip admin tracking
      if (userId) {
        const { data: isAdmin } = await anon.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        if (isAdmin === true) return json({ ok: true, skipped: "admin" }, 200, cors);
      }
    }

    // Variante A/B (ex. "hero_h1_v1:B") — optionnelle et bornée
    const rawVariant = typeof body.variant === "string" ? body.variant.trim() : "";
    const variant = /^[a-z0-9_]{1,40}:[A-Z]$/.test(rawVariant) ? rawVariant : null;

    const ip = getClientIp(req);
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await admin.from("marketing_analytics").insert({
      event_type: eventType,
      page,
      device_type: body.device_type ?? null,
      session_id: body.session_id ?? null,
      referrer: body.referrer ?? null,
      user_agent: userAgent,
      user_id: userId,
      ip_address: ip,
      variant,
    });

    if (error) {
      console.error("track-event insert error:", error);
      return json({ error: "Insert failed" }, 500, cors);
    }
    return json({ ok: true }, 200, cors);
  } catch (e) {
    console.error("track-event error:", e);
    return json({ error: "Internal error" }, 500, cors);
  }
});
