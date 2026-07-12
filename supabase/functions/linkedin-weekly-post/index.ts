// Weekly LinkedIn auto-post for Adrien de Volontat (IKtracker founder identity).
// Flow: pick topic (ISO-week rotation) → generate post text with Lovable AI →
// record scripted screencast of the topic page via Browserless → upload MP4 to
// LinkedIn via the /v2/assets flow → publish /v2/ugcPosts. Logs each run in
// public.linkedin_post_log.
//
// Triggered by pg_cron every Thursday at 07:00 UTC (~8h Paris CET).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/linkedin";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BROWSERLESS_BASE = "https://production-sfo.browserless.io";

type Topic = {
  slug: string;
  title: string;
  url: string;
  focus: string;
  durationMs: number;
};

// Rotation of 12 topics — covers ~3 months of Thursdays before repetition.
const TOPICS: Topic[] = [
  {
    slug: "simulateur",
    title: "Simulateur d'indemnités kilométriques 2026",
    url: "https://iktracker.fr/simulateur",
    focus:
      "Le simulateur calcule instantanément les IK selon le barème officiel progressif (5 000 / 20 000 km) et applique le bonus 20% pour véhicules 100% électriques. Utile pour un indépendant qui veut estimer son remboursement avant de facturer un client ou d'arbitrer entre véhicule perso et pro.",
    durationMs: 10000,
  },
  {
    slug: "mode-tournee",
    title: "Mode Tournée GPS",
    url: "https://iktracker.fr/mode-tournee",
    focus:
      "Détection automatique des arrêts pendant une tournée terrain (2 min à l'arrêt = nouvel arrêt). Pensé pour les visiteurs médicaux, commerciaux, artisans multi-chantiers, aides à domicile. Zéro saisie manuelle, le trajet complet est reconstruit à la fin de la journée.",
    durationMs: 12000,
  },
  {
    slug: "import-takeout",
    title: "Récupération des trajets passés (Google Takeout)",
    url: "https://iktracker.fr/import-google-timeline",
    focus:
      "Import des trajets Google Timeline depuis un export Takeout. Sauve les indépendants qui n'ont pas suivi leurs déplacements pros toute l'année et qui doivent rattraper en fin d'exercice. Import 100% côté client, aucune donnée transite sur des serveurs tiers.",
    durationMs: 10000,
  },
  {
    slug: "sync-calendrier",
    title: "Synchronisation Google Calendar & Outlook",
    url: "https://iktracker.fr/synchronisation-calendrier",
    focus:
      "Chaque rendez-vous professionnel dans l'agenda devient automatiquement un trajet indemnisable. Sync 4x par jour, gestion des adresses par défaut (bureau, domicile). Idéal pour les indépendants qui vivent déjà dans leur agenda.",
    durationMs: 10000,
  },
  {
    slug: "detection-plaque",
    title: "Détection véhicule par plaque d'immatriculation",
    url: "https://iktracker.fr/detection-vehicule",
    focus:
      "Saisir une plaque d'immatriculation renseigne automatiquement la puissance fiscale et la motorisation du véhicule. Le barème IK exact et le bonus électrique 20% s'appliquent sans effort. Fini les recherches sur la carte grise.",
    durationMs: 8000,
  },
  {
    slug: "bareme-progressif",
    title: "Barème progressif fiscal 2026",
    url: "https://iktracker.fr/bareme-kilometrique-2026",
    focus:
      "Le barème IK est progressif avec 3 tranches (0-5 000, 5 001-20 000, +20 000 km). Beaucoup d'indépendants perdent de l'argent en appliquant un taux moyen. IKtracker gère les tranches et le reset annuel fiscal automatiquement.",
    durationMs: 10000,
  },
  {
    slug: "bonus-electrique",
    title: "Bonus 20% véhicule électrique",
    url: "https://iktracker.fr/bonus-vehicule-electrique",
    focus:
      "Un véhicule 100% électrique donne droit à un bonus fiscal de 20% sur les indemnités kilométriques. C'est cumulable avec le barème standard et souvent oublié. Calculé automatiquement dès que le véhicule est identifié comme électrique.",
    durationMs: 8000,
  },
  {
    slug: "export-pdf",
    title: "Export PDF pour l'expert-comptable",
    url: "https://iktracker.fr/experts-comptables",
    focus:
      "Export PDF prêt à transmettre au comptable : tableau récapitulatif conforme, signature du dirigeant, détail par trajet, totaux par tranche fiscale. Adieu les Excel bricolés en fin d'exercice.",
    durationMs: 10000,
  },
  {
    slug: "ik-velo",
    title: "Indemnité kilométrique vélo",
    url: "https://iktracker.fr/indemnite-kilometrique-velo",
    focus:
      "L'IK vélo existe pour les indépendants qui pédalent en ville pour leurs rendez-vous pros. Fiscalement encadrée, souvent ignorée. IKtracker la calcule et la trace comme n'importe quel autre trajet.",
    durationMs: 8000,
  },
  {
    slug: "gratuit-a-vie",
    title: "Gratuit à vie — modèle communautaire",
    url: "https://iktracker.fr/",
    focus:
      "IKtracker est gratuit à vie : pas d'abonnement, pas de freemium castré, pas d'investisseurs à rémunérer. Outil créé par un dirigeant qui avait le même problème et qui le partage avec la communauté des indépendants.",
    durationMs: 10000,
  },
  {
    slug: "confidentialite",
    title: "Aucune exploitation commerciale des données",
    url: "https://iktracker.fr/confidentialite",
    focus:
      "Zéro revente de données, zéro publicité, zéro tracking commercial. Contrairement à la plupart des GPS trackers gratuits en apparence dont le vrai business est la donnée. Les trajets restent la propriété de l'utilisateur.",
    durationMs: 8000,
  },
  {
    slug: "comparatif",
    title: "IKtracker vs applications payantes",
    url: "https://iktracker.fr/comparatif-drivers-note",
    focus:
      "Face aux applications payantes du marché (Drivers Note, Izika, MileageWise) : mêmes fonctionnalités cœur, zéro euro, sans engagement, avec le barème français à jour et un focus indépendants français.",
    durationMs: 10000,
  },
];

function pickTopicForThisWeek(now: Date = new Date()): Topic {
  // Week-of-year rotation — deterministic per calendar week
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor(
    (now.getTime() - start.getTime()) / 86400000,
  );
  const week = Math.floor(dayOfYear / 7);
  return TOPICS[week % TOPICS.length];
}

async function generatePostText(topic: Topic): Promise<string> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            `Tu rédiges un post LinkedIn pour Adrien de Volontat, dirigeant d'entreprise et fondateur d'IKtracker (iktracker.fr) — outil GRATUIT À VIE de suivi des indemnités kilométriques pour indépendants (auto-entrepreneurs, freelances, professions libérales, artisans, commerciaux, aides à domicile).

Règles STRICTES :
- Français, à la première personne (je / mon), ton pragmatique entrepreneurial
- 180 à 250 mots, 4 à 6 paragraphes courts
- AUCUN emoji, AUCUN gimmick marketing
- Commence par un problème concret vécu par un indépendant (accroche factuelle, pas une question rhétorique)
- Détaille la fonctionnalité et sa pertinence pour un indépendant français
- Termine par un appel doux vers iktracker.fr (utilise "accédez à" ou "jetez un œil à", JAMAIS "testez")
- 2 à 3 hashtags maximum en toute fin (dont #indépendants)
- Interdit : "🚀", "Découvrez", "révolutionnaire", "game-changer", "unlock", "boostez"
- Reste crédible, humain, factuel. Comme un dirigeant qui parle à ses pairs.`,
        },
        {
          role: "user",
          content:
            `Sujet de cette semaine : ${topic.title}\n\nContexte / faits sur la fonctionnalité :\n${topic.focus}\n\nRédige le post LinkedIn complet, prêt à publier.`,
        },
      ],
      temperature: 0.85,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI Gateway ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty AI response");
  return text;
}

async function recordScreencast(topic: Topic): Promise<Uint8Array> {
  const token = Deno.env.get("BROWSERLESS_API_KEY");
  if (!token) throw new Error("BROWSERLESS_API_KEY missing");

  // Browserless v2 /function — records webm via Puppeteer's page.screencast()
  // then transcodes to LinkedIn-friendly MP4 (H.264 yuv420p, faststart) via ffmpeg.
  const code = `
export default async function ({ page, context }) {
  const { url, durationMs } = context;
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  // Give hero fonts / images a moment
  await new Promise(r => setTimeout(r, 2000));

  const recorder = await page.screencast({ path: '/tmp/rec.webm' });

  // Slow scroll pattern to reveal content over the duration
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const steps = 24;
  const stepDelay = Math.max(200, Math.floor(durationMs / steps));
  for (let i = 1; i <= steps; i++) {
    const y = Math.floor((totalHeight * i) / steps);
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'smooth' }), y);
    await new Promise(r => setTimeout(r, stepDelay));
  }
  await new Promise(r => setTimeout(r, 800));

  await recorder.stop();

  const { execSync } = require('child_process');
  execSync('ffmpeg -y -i /tmp/rec.webm -c:v libx264 -preset veryfast -pix_fmt yuv420p -movflags +faststart -r 24 -b:v 1200k -maxrate 1500k -bufsize 2000k -an /tmp/out.mp4', { stdio: 'pipe' });

  const fs = require('fs');
  const buf = fs.readFileSync('/tmp/out.mp4');
  return { mp4_base64: buf.toString('base64'), size: buf.length };
}
`;

  const res = await fetch(
    `${BROWSERLESS_BASE}/function?token=${token}&timeout=120000`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        context: { url: topic.url, durationMs: topic.durationMs },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Browserless ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  const json = await res.json();
  // Response may be direct object OR wrapped in { data, type }
  const payload = typeof json === "object" && "data" in json && typeof json.data === "string"
    ? JSON.parse(json.data)
    : json;
  const base64 = payload.mp4_base64;
  if (!base64) {
    throw new Error(
      `No mp4_base64 in Browserless response: ${JSON.stringify(json).slice(0, 400)}`,
    );
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  console.log(`Recorded MP4: ${bytes.length} bytes`);
  return bytes;
}

async function gatewayFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
  const linkedinKey = Deno.env.get("LINKEDIN_API_KEY")!;
  const url = path.startsWith("http")
    ? path
    : `${GATEWAY_URL}${path.startsWith("/") ? path : "/" + path}`;
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> || {}),
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": linkedinKey,
    },
  });
}

async function getMemberUrn(): Promise<string> {
  const res = await gatewayFetch("/v2/userinfo");
  if (!res.ok) throw new Error(`userinfo ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (!json.sub) throw new Error("No sub in /v2/userinfo response");
  return `urn:li:person:${json.sub}`;
}

async function registerVideoUpload(ownerUrn: string): Promise<{
  uploadUrl: string;
  assetUrn: string;
  extraHeaders: Record<string, string>;
}> {
  const res = await gatewayFetch("/v2/assets?action=registerUpload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
        owner: ownerUrn,
        serviceRelationships: [{
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        }],
      },
    }),
  });
  if (!res.ok) throw new Error(`registerUpload ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const mech = json.value?.uploadMechanism?.[
    "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
  ];
  if (!mech?.uploadUrl || !json.value?.asset) {
    throw new Error(`Unexpected registerUpload payload: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return {
    uploadUrl: mech.uploadUrl,
    assetUrn: json.value.asset,
    extraHeaders: mech.headers || {},
  };
}

function toGatewayUrl(linkedinUrl: string): string {
  // LinkedIn uploadUrl points at api.linkedin.com / www.linkedin.com paths.
  // The gateway proxies arbitrary LinkedIn paths under /linkedin/{path}.
  const u = new URL(linkedinUrl);
  return `${GATEWAY_URL}${u.pathname}${u.search}`;
}

async function uploadVideoBytes(
  uploadUrl: string,
  bytes: Uint8Array,
  extraHeaders: Record<string, string>,
): Promise<void> {
  const gatewayUrl = toGatewayUrl(uploadUrl);
  const res = await gatewayFetch(gatewayUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      ...extraHeaders,
    },
    body: bytes,
  });
  if (!res.ok) {
    throw new Error(`uploadVideoBytes ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  console.log("Video bytes uploaded to LinkedIn");
}

async function waitForAssetReady(assetUrn: string): Promise<void> {
  const assetId = assetUrn.split(":").pop()!;
  const deadline = Date.now() + 5 * 60 * 1000; // 5 min
  while (Date.now() < deadline) {
    const res = await gatewayFetch(`/v2/assets/${assetId}`);
    if (res.ok) {
      const json = await res.json();
      const status = json.recipes?.[0]?.status;
      console.log(`Asset ${assetId} status: ${status}`);
      if (status === "AVAILABLE") return;
      if (
        status === "PROCESSING_FAILED" ||
        status === "CLIENT_ERROR" ||
        status === "SERVER_ERROR"
      ) {
        throw new Error(`Asset processing failed (${status})`);
      }
    } else {
      console.warn(`Asset poll ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    await new Promise(r => setTimeout(r, 8000));
  }
  throw new Error("Asset not AVAILABLE within 5 minutes");
}

async function createUgcPost(
  ownerUrn: string,
  text: string,
  assetUrn: string,
  topic: Topic,
): Promise<string> {
  const body = {
    author: ownerUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "VIDEO",
        media: [{
          status: "READY",
          description: { text: topic.title },
          media: assetUrn,
          title: { text: `IKtracker — ${topic.title}` },
        }],
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };
  const res = await gatewayFetch("/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`ugcPosts ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.id || json["x-restli-id"] || "unknown";
}

async function logRun(supabase: ReturnType<typeof createClient>, row: Record<string, unknown>) {
  const { error } = await supabase.from("linkedin_post_log").insert(row);
  if (error) console.error("Failed to log run:", error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";

  // Auth: CRON_SECRET (or SYNC_CRON_TOKEN fallback) header OR admin JWT
  const cronSecret = Deno.env.get("CRON_SECRET");
  const altCronSecret = Deno.env.get("SYNC_CRON_TOKEN");
  const xCronSecret = req.headers.get("x-cron-secret");
  const isCron = !!xCronSecret && (
    (cronSecret && xCronSecret === cronSecret) ||
    (altCronSecret && xCronSecret === altCronSecret)
  );
  console.log(`[linkedin-weekly-post] auth: hasHeader=${!!xCronSecret} hasCronEnv=${!!cronSecret} hasAltEnv=${!!altCronSecret} isCron=${isCron}`);

  let triggeredBy: "cron" | "admin" = isCron ? "cron" : "admin";

  if (!isCron) {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuthed = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabaseAuthed.auth.getUser(token);
    if (error || !data.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabaseAuthed.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = Date.now();
  const topic = pickTopicForThisWeek();
  console.log(`[linkedin-weekly-post] topic=${topic.slug} dryRun=${dryRun}`);

  let postText = "";
  let videoBytes = 0;
  let assetUrn: string | null = null;
  let postId: string | null = null;

  try {
    // 1) Generate post text (always)
    postText = await generatePostText(topic);
    console.log(`Generated post text (${postText.length} chars)`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          topic,
          post_text: postText,
        }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Get LinkedIn member URN
    const ownerUrn = await getMemberUrn();
    console.log(`LinkedIn owner: ${ownerUrn}`);

    // 3) Record screencast MP4
    const mp4 = await recordScreencast(topic);
    videoBytes = mp4.length;

    // 4) Register upload
    const upload = await registerVideoUpload(ownerUrn);
    assetUrn = upload.assetUrn;
    console.log(`Registered upload, asset=${assetUrn}`);

    // 5) PUT bytes
    await uploadVideoBytes(upload.uploadUrl, mp4, upload.extraHeaders);

    // 6) Wait for AVAILABLE
    await waitForAssetReady(assetUrn);

    // 7) Publish
    postId = await createUgcPost(ownerUrn, postText, assetUrn, topic);
    console.log(`Published UGC post ${postId}`);

    await logRun(admin, {
      topic_slug: topic.slug,
      topic_title: topic.title,
      post_text: postText,
      linkedin_post_id: postId,
      linkedin_asset_urn: assetUrn,
      video_bytes: videoBytes,
      status: "success",
      duration_ms: Date.now() - startedAt,
      triggered_by: triggeredBy,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        topic_slug: topic.slug,
        post_id: postId,
        asset_urn: assetUrn,
        video_bytes: videoBytes,
        duration_ms: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[linkedin-weekly-post] failed:", message);
    await logRun(admin, {
      topic_slug: topic.slug,
      topic_title: topic.title,
      post_text: postText || null,
      linkedin_asset_urn: assetUrn,
      video_bytes: videoBytes || null,
      status: "failed",
      error_message: message.slice(0, 2000),
      duration_ms: Date.now() - startedAt,
      triggered_by: triggeredBy,
    });
    return new Response(
      JSON.stringify({ ok: false, error: message, topic_slug: topic.slug }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
