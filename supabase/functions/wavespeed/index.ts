// Wavespeed.ai proxy edge function — generic passthrough
//
// Forwards any request to https://api.wavespeed.ai/api/v3/<path> with the
// server-side API key injected. All Wavespeed endpoints are exposed:
//
//   POST   /wavespeed/<model_path>                      -> submit prediction
//          body: model input JSON. Optional `?wait=1` polls until completion.
//   GET    /wavespeed/predictions/<request_id>/result   -> fetch result
//   GET    /wavespeed/balance                           -> account balance
//   GET|POST|... /wavespeed/<any-other-path>            -> generic passthrough
//
// Docs: https://wavespeed.ai/docs
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  assertAIBudget,
  BudgetExceededError,
  COST_ESTIMATES,
  trackAICost,
} from "../_shared/cost-guard.ts";

const WAVESPEED_API_KEY = Deno.env.get("WAVESPEED_API_KEY");
const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: "Unauthorized" }, 401);
  const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
    _user_id: data.user.id,
    _role: "admin",
  });
  if (roleErr || isAdmin !== true) return json({ error: "Forbidden: admin role required" }, 403);
  return { userId: data.user.id };
}

async function upstream(path: string, init: RequestInit) {
  const url = `${WAVESPEED_BASE}/${path.replace(/^\/+/, "")}`;
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${WAVESPEED_API_KEY}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

async function pollUntilDone(requestId: string, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await upstream(`predictions/${requestId}/result`, { method: "GET" });
    if (!r.ok) return r;
    const d = r.body as any;
    const status = d?.data?.status ?? d?.status;
    if (status === "completed" || status === "failed") return r;
    await new Promise((res) => setTimeout(res, 1500));
  }
  return { ok: false, status: 504, body: { error: "Polling timeout" } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!WAVESPEED_API_KEY) return json({ error: "WAVESPEED_API_KEY not configured" }, 500);

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  // Centralized AI budget guard (monthly cap in site_config.api_budget)
  const adminClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    await assertAIBudget(adminClient, "wavespeed");
  } catch (e) {
    if (e instanceof BudgetExceededError) return json({ error: e.message }, 402);
    throw e;
  }

  try {
    const url = new URL(req.url);
    // Strip the "/wavespeed" function prefix if present
    const path = url.pathname.replace(/^\/+/, "").replace(/^wavespeed\/?/, "");
    if (!path) {
      return json(
        {
          error: "Missing upstream path",
          usage: {
            submit:
              "POST /wavespeed/<model_path> with JSON input body (append ?wait=1 to auto-poll)",
            result: "GET /wavespeed/predictions/<request_id>/result",
            balance: "GET /wavespeed/balance",
            passthrough:
              "Any other method/path is forwarded to https://api.wavespeed.ai/api/v3/<path>",
          },
        },
        400,
      );
    }

    // Forward query params (minus our own `wait` control flag)
    const wait = url.searchParams.get("wait");
    url.searchParams.delete("wait");
    const qs = url.searchParams.toString();
    const forwardPath = qs ? `${path}?${qs}` : path;

    const method = req.method.toUpperCase();
    const init: RequestInit = { method };
    if (method !== "GET" && method !== "HEAD") {
      const raw = await req.text();
      if (raw) init.body = raw;
      const ct = req.headers.get("Content-Type");
      if (ct) init.headers = { "Content-Type": ct };
    }

    const r = await upstream(forwardPath, init);
    if (!r.ok) {
      return json({ error: "Wavespeed error", status: r.status, details: r.body }, r.status);
    }
    // Only POST submits create a billable prediction; result polls are free.
    if (method === "POST") {
      trackAICost(adminClient, {
        functionName: "wavespeed",
        model: path,
        costEuros: COST_ESTIMATES.wavespeed_prediction,
        userId: auth.userId,
        metadata: { path },
      });
    }

    // Convenience: if this was a submit + ?wait=1, poll for the result
    if (wait && method === "POST") {
      const d = r.body as any;
      const requestId = d?.data?.id ?? d?.id;
      if (requestId) {
        const polled = await pollUntilDone(requestId);
        if (!polled.ok) {
          return json(
            { error: "Wavespeed polling failed", status: polled.status, details: polled.body },
            polled.status,
          );
        }
        return json(polled.body);
      }
    }

    return json(r.body);
  } catch (e) {
    console.error("wavespeed function error:", e);
    return json(
      { error: "Internal error", details: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});
