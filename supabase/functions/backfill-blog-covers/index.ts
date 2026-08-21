// One-off/batched backfill: generate photorealistic cover images with Wavespeed
// for published blog posts that have no usable featured_image_url.
//
// POST /backfill-blog-covers  { "limit": 5, "dryRun": false }
// Auth: service-role key (Authorization: Bearer <service_role>) or admin JWT.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  assertAIBudget,
  BudgetExceededError,
  trackAICost,
} from "../_shared/cost-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAVESPEED_API_KEY = Deno.env.get("WAVESPEED_API_KEY");
const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const MODEL = "wavespeed-ai/flux-dev";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isAuthorized(req: Request): Promise<boolean> {
  // Maintenance switch: the job only runs while the flag row is enabled in the DB.
  const flagClient = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: flag } = await flagClient
    .from("maintenance_flags")
    .select("enabled")
    .eq("key", "backfill_blog_covers")
    .maybeSingle();
  if (flag?.enabled === true) return true;
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  if (token === SERVICE_ROLE) return true;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: header } },
  });
  const { data } = await sb.auth.getUser();
  if (!data?.user) return false;
  const { data: isAdmin } = await sb.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  return isAdmin === true;
}

function buildPrompt(title: string): string {
  const t = title.toLowerCase();
  let scene =
    "a French independent professional reviewing paperwork and a laptop in a bright modern office";
  if (
    t.includes("urssaf") ||
    t.includes("contrôle") ||
    t.includes("redressement") ||
    t.includes("fiscal") ||
    t.includes("impôt")
  )
    scene =
      "an organised desk with official French tax paperwork, a calculator, a laptop and a cup of coffee, natural window light";
  if (t.includes("électrique") || t.includes("electrique"))
    scene = "a modern electric car charging in a clean city street at golden hour";
  if (t.includes("vélo") || t.includes("velo"))
    scene = "a commuter bicycle parked on a European city street in the morning light";
  if (
    t.includes("tournée") ||
    t.includes("tournee") ||
    t.includes("artisan") ||
    t.includes("chantier")
  )
    scene =
      "a craftsman utility car parked near a worksite in a French village, early morning light";
  if (t.includes("kilométr") || t.includes("trajet") || t.includes("gps") || t.includes("suivi"))
    scene =
      "a car dashboard with an odometer and a smartphone mounted on the windshield, French countryside road ahead";
  if (t.includes("comptable") || t.includes("comptabilité"))
    scene = "an accountant desk with financial documents, glasses and a laptop, soft daylight";
  if (t.includes("salarié") || t.includes("rgpd") || t.includes("employeur"))
    scene = "a small business team meeting around a table with laptops in a bright office";
  return `Editorial photorealistic photograph, ${scene}. Professional stock photography, shallow depth of field, natural lighting, muted warm tones, no text, no logo, no watermark, no people faces in close-up, 35mm lens, high detail.`;
}

async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(`${WAVESPEED_BASE}/${MODEL}?wait=1`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAVESPEED_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      size: "1216*640",
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true,
    }),
  });
  const body = await res.json();
  const data = body?.data ?? body;
  let outputs: string[] = data?.outputs ?? [];
  const requestId = data?.id;
  let status = data?.status;
  const start = Date.now();
  while (
    (!outputs || outputs.length === 0) &&
    requestId &&
    status !== "failed" &&
    Date.now() - start < 90_000
  ) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(`${WAVESPEED_BASE}/predictions/${requestId}/result`, {
      headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
    });
    const pb = await poll.json();
    const pd = pb?.data ?? pb;
    status = pd?.status;
    outputs = pd?.outputs ?? [];
  }
  if (!outputs || outputs.length === 0) {
    throw new Error(`Wavespeed: aucune image (status=${status ?? "unknown"})`);
  }
  return outputs[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!WAVESPEED_API_KEY) return json({ error: "WAVESPEED_API_KEY not configured" }, 500);
  if (!(await isAuthorized(req))) return json({ error: "Unauthorized" }, 401);

  let limit = 5;
  let dryRun = false;
  try {
    const b = await req.json();
    if (typeof b?.limit === "number") limit = Math.min(Math.max(1, b.limit), 10);
    dryRun = b?.dryRun === true;
  } catch {
    /* defaults */
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Centralized AI budget guard (monthly cap in site_config.api_budget)
  try {
    await assertAIBudget(admin, "backfill-blog-covers");
  } catch (e) {
    if (e instanceof BudgetExceededError) return json({ error: e.message }, 402);
    throw e;
  }

  const { data: posts, error } = await admin
    .from("blog_posts")
    .select("id, slug, title, featured_image_url")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) return json({ error: error.message }, 500);

  const own = `${SUPABASE_URL}/storage`;
  const todo = (posts ?? []).filter((p) => {
    const u = (p.featured_image_url ?? "").trim();
    if (!u) return true;
    // external Supabase project storage → broken (400)
    if (u.includes(".supabase.co/storage") && !u.startsWith(own)) return true;
    return false;
  });

  if (dryRun) return json({ pending: todo.length, sample: todo.slice(0, limit) });

  const batch = todo.slice(0, limit);
  const run = async () => {
    const results: { id: string; slug: string; url?: string; error?: string }[] = [];
    for (const post of batch) {
      try {
        const imageUrl = await generateImage(buildPrompt(post.title));
        trackAICost(admin, {
          functionName: "backfill-blog-covers",
          model: MODEL,
          costEuros: 0.04, // estimation génération image Wavespeed
          metadata: { post_id: post.id, slug: post.slug },
        });
        const img = await fetch(imageUrl);
        if (!img.ok) throw new Error(`download ${img.status}`);
        const bytes = new Uint8Array(await img.arrayBuffer());
        const filename = `cover-${post.id.slice(0, 8)}-${Date.now()}.jpg`;
        const { error: upErr } = await admin.storage.from("blog-images").upload(filename, bytes, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = admin.storage.from("blog-images").getPublicUrl(filename);
        const { error: updErr } = await admin
          .from("blog_posts")
          .update({ featured_image_url: pub.publicUrl })
          .eq("id", post.id);
        if (updErr) throw updErr;
        results.push({ id: post.id, slug: post.slug, url: pub.publicUrl });
      } catch (e) {
        results.push({
          id: post.id,
          slug: post.slug,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    console.log("backfill batch done", JSON.stringify(results));
  };
  // @ts-expect-error EdgeRuntime est fourni par le runtime edge Supabase
  EdgeRuntime.waitUntil(run());
  return json({ started: batch.length, pending: todo.length });
});
