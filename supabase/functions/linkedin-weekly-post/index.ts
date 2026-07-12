// Weekly LinkedIn auto-post for Adrien de Volontat (IKtracker founder identity).
//
// Two media formats, chosen per topic:
//   • "video"    → scripted screencast via Browserless → LinkedIn VIDEO ugcPost
//   • "carousel" → 4-slide PDF rendered with pdf-lib   → LinkedIn DOCUMENT ugcPost
//
// Text is always AI-generated (Gemini via Lovable AI Gateway).
// Triggered by pg_cron every Thursday at 07:00 UTC (~8h Paris CET).
// Every run is logged in public.linkedin_post_log.

import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/linkedin";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BROWSERLESS_BASE = "https://production-sfo.browserless.io";

type MediaFormat = "video" | "carousel";

type Topic = {
  slug: string;
  title: string;
  url: string;
  focus: string;
  format: MediaFormat;
  durationMs: number; // only used for video
};

// Rotation of 12 topics — covers ~3 months of Thursdays before repetition.
// "video" = UI/feature we want to *show in motion*.
// "carousel" = data / narrative / comparison better told with typography.
const TOPICS: Topic[] = [
  {
    slug: "simulateur",
    title: "Simulateur d'indemnités kilométriques 2026",
    url: "https://iktracker.fr/simulateur",
    format: "video",
    focus:
      "Le simulateur calcule instantanément les IK selon le barème officiel progressif (5 000 / 20 000 km) et applique le bonus 20% pour véhicules 100% électriques. Utile pour un indépendant qui veut estimer son remboursement avant de facturer un client ou d'arbitrer entre véhicule perso et pro.",
    durationMs: 10000,
  },
  {
    slug: "mode-tournee",
    title: "Mode Tournée GPS",
    url: "https://iktracker.fr/mode-tournee",
    format: "video",
    focus:
      "Détection automatique des arrêts pendant une tournée terrain (2 min à l'arrêt = nouvel arrêt). Pensé pour les visiteurs médicaux, commerciaux, artisans multi-chantiers, aides à domicile. Zéro saisie manuelle, le trajet complet est reconstruit à la fin de la journée.",
    durationMs: 12000,
  },
  {
    slug: "import-takeout",
    title: "Récupération des trajets passés (Google Takeout)",
    url: "https://iktracker.fr/import-google-timeline",
    format: "carousel",
    focus:
      "Import des trajets Google Timeline depuis un export Takeout. Sauve les indépendants qui n'ont pas suivi leurs déplacements pros toute l'année et qui doivent rattraper en fin d'exercice. Import 100% côté client, aucune donnée transite sur des serveurs tiers.",
    durationMs: 10000,
  },
  {
    slug: "sync-calendrier",
    title: "Synchronisation Google Calendar & Outlook",
    url: "https://iktracker.fr/synchronisation-calendrier",
    format: "video",
    focus:
      "Chaque rendez-vous professionnel dans l'agenda devient automatiquement un trajet indemnisable. Sync 4x par jour, gestion des adresses par défaut (bureau, domicile). Idéal pour les indépendants qui vivent déjà dans leur agenda.",
    durationMs: 10000,
  },
  {
    slug: "detection-plaque",
    title: "Détection véhicule par plaque d'immatriculation",
    url: "https://iktracker.fr/detection-vehicule",
    format: "video",
    focus:
      "Saisir une plaque d'immatriculation renseigne automatiquement la puissance fiscale et la motorisation du véhicule. Le barème IK exact et le bonus électrique 20% s'appliquent sans effort. Fini les recherches sur la carte grise.",
    durationMs: 8000,
  },
  {
    slug: "bareme-progressif",
    title: "Barème progressif fiscal 2026",
    url: "https://iktracker.fr/bareme-kilometrique-2026",
    format: "carousel",
    focus:
      "Le barème IK est progressif avec 3 tranches (0-5 000, 5 001-20 000, +20 000 km). Beaucoup d'indépendants perdent de l'argent en appliquant un taux moyen. IKtracker gère les tranches et le reset annuel fiscal automatiquement.",
    durationMs: 10000,
  },
  {
    slug: "bonus-electrique",
    title: "Bonus 20% véhicule électrique",
    url: "https://iktracker.fr/bonus-vehicule-electrique",
    format: "carousel",
    focus:
      "Un véhicule 100% électrique donne droit à un bonus fiscal de 20% sur les indemnités kilométriques. C'est cumulable avec le barème standard et souvent oublié. Calculé automatiquement dès que le véhicule est identifié comme électrique.",
    durationMs: 8000,
  },
  {
    slug: "export-pdf",
    title: "Export PDF pour l'expert-comptable",
    url: "https://iktracker.fr/experts-comptables",
    format: "video",
    focus:
      "Export PDF prêt à transmettre au comptable : tableau récapitulatif conforme, signature du dirigeant, détail par trajet, totaux par tranche fiscale. Adieu les Excel bricolés en fin d'exercice.",
    durationMs: 10000,
  },
  {
    slug: "ik-velo",
    title: "Indemnité kilométrique vélo",
    url: "https://iktracker.fr/indemnite-kilometrique-velo",
    format: "carousel",
    focus:
      "L'IK vélo existe pour les indépendants qui pédalent en ville pour leurs rendez-vous pros. Fiscalement encadrée, souvent ignorée. IKtracker la calcule et la trace comme n'importe quel autre trajet.",
    durationMs: 8000,
  },
  {
    slug: "gratuit-a-vie",
    title: "Gratuit à vie — modèle communautaire",
    url: "https://iktracker.fr/",
    format: "carousel",
    focus:
      "IKtracker est gratuit à vie : pas d'abonnement, pas de freemium castré, pas d'investisseurs à rémunérer. Outil créé par un dirigeant qui avait le même problème et qui le partage avec la communauté des indépendants.",
    durationMs: 10000,
  },
  {
    slug: "confidentialite",
    title: "Aucune exploitation commerciale des données",
    url: "https://iktracker.fr/confidentialite",
    format: "carousel",
    focus:
      "Zéro revente de données, zéro publicité, zéro tracking commercial. Contrairement à la plupart des GPS trackers gratuits en apparence dont le vrai business est la donnée. Les trajets restent la propriété de l'utilisateur.",
    durationMs: 8000,
  },
  {
    slug: "comparatif",
    title: "IKtracker vs applications payantes",
    url: "https://iktracker.fr/comparatif-drivers-note",
    format: "carousel",
    focus:
      "Face aux applications payantes du marché (Drivers Note, Izika, MileageWise) : mêmes fonctionnalités cœur, zéro euro, sans engagement, avec le barème français à jour et un focus indépendants français.",
    durationMs: 10000,
  },
];

function pickTopicForThisWeek(now: Date = new Date()): Topic {
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(dayOfYear / 7);
  return TOPICS[week % TOPICS.length];
}

// ─── Post text (shared between video and carousel) ─────────────────────────

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

  if (!res.ok) throw new Error(`AI Gateway ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty AI response");
  return text;
}

// ─── Video pipeline (Browserless screencast → MP4) ─────────────────────────

async function recordScreencast(topic: Topic): Promise<Uint8Array> {
  const token = Deno.env.get("BROWSERLESS_API_KEY");
  if (!token) throw new Error("BROWSERLESS_API_KEY missing");

  const code = `
export default async function ({ page, context }) {
  const { url, durationMs } = context;
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const recorder = await page.screencast({ path: '/tmp/rec.webm' });

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

  if (!res.ok) throw new Error(`Browserless ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const json = await res.json();
  const payload = typeof json === "object" && "data" in json && typeof json.data === "string"
    ? JSON.parse(json.data)
    : json;
  const base64 = payload.mp4_base64;
  if (!base64) throw new Error(`No mp4_base64: ${JSON.stringify(json).slice(0, 400)}`);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  console.log(`Recorded MP4: ${bytes.length} bytes`);
  return bytes;
}

// ─── Carousel pipeline (AI slide plan → pdf-lib PDF) ───────────────────────

type SlidePlan = {
  cover_title: string;      // ≤ 60 chars, punchy
  cover_subtitle: string;   // ≤ 90 chars, sub-line
  slides: Array<{
    heading: string;        // ≤ 40 chars
    body: string;           // ≤ 180 chars, one clear idea
  }>;                       // exactly 3 items
  cta: string;              // ≤ 60 chars, e.g. "iktracker.fr — gratuit à vie"
};

async function generateSlidePlan(topic: Topic): Promise<SlidePlan> {
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
            `Tu structures un carrousel LinkedIn éditorial sobre pour IKtracker (iktracker.fr), outil gratuit à vie de suivi des indemnités kilométriques pour indépendants français.

Contraintes ABSOLUES :
- Français, ton pragmatique entrepreneurial
- AUCUN emoji
- Phrases courtes, factuelles, sans marketing
- Interdit : "Découvrez", "révolutionnaire", "boostez", "unlock", "testez"
- Respecte STRICTEMENT les limites de caractères indiquées dans le schéma
- Exactement 3 slides intermédiaires (heading + body)`,
        },
        {
          role: "user",
          content:
            `Sujet : ${topic.title}\n\nContexte :\n${topic.focus}\n\nProduis le plan du carrousel au format JSON strict avec les clés cover_title, cover_subtitle, slides (array de 3 objets {heading, body}), cta. Rien d'autre.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`AI slide plan ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty slide plan");
  const plan = JSON.parse(raw) as SlidePlan;
  if (!plan.cover_title || !Array.isArray(plan.slides) || plan.slides.length !== 3) {
    throw new Error(`Malformed slide plan: ${raw.slice(0, 300)}`);
  }
  return plan;
}

// Latin-1 safe text (StandardFonts don't support arbitrary unicode).
// Replace common French curly quotes / dashes / non-breaking chars so pdf-lib
// doesn't throw "WinAnsi cannot encode …".
function toWinAnsi(s: string): string {
  return s
    .replace(/[’‘‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/•/g, "-");
}

function wrapText(
  text: string,
  font: import("npm:pdf-lib@1.17.1").PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = toWinAnsi(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? current + " " + w : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function renderCarouselPdf(topic: Topic, plan: SlidePlan): Promise<Uint8Array> {
  // Square 1200x1200 slides — LinkedIn documents render best in square/portrait.
  const W = 1200;
  const H = 1200;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`IKtracker — ${topic.title}`);
  pdf.setAuthor("Adrien de Volontat");
  pdf.setSubject(topic.focus.slice(0, 200));

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Editorial sobre iktracker palette
  const bg = rgb(0.984, 0.973, 0.949);        // warm ivory  #FBF8F2
  const ink = rgb(0.09, 0.09, 0.13);           // near-black indigo #171721
  const primary = rgb(0.361, 0.294, 0.902);    // indigo-violet #5C4BE6
  const muted = rgb(0.38, 0.38, 0.44);         // #616170

  const drawFrame = (page: import("npm:pdf-lib@1.17.1").PDFPage, slideNum: number, total: number) => {
    // Full ivory background
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg });
    // Top accent bar
    page.drawRectangle({ x: 80, y: H - 100, width: 60, height: 4, color: primary });
    // Brand mark (top-left)
    page.drawText("IKtracker", {
      x: 80, y: H - 140, size: 22, font: helvBold, color: ink,
    });
    // Slide counter (top-right)
    const counter = `${slideNum} / ${total}`;
    const cw = helv.widthOfTextAtSize(counter, 18);
    page.drawText(counter, { x: W - 80 - cw, y: H - 140, size: 18, font: helv, color: muted });
    // Footer URL
    page.drawText("iktracker.fr", { x: 80, y: 80, size: 16, font: helv, color: muted });
    // Footer accent
    page.drawRectangle({ x: 80, y: 74, width: 40, height: 2, color: primary });
  };

  const totalSlides = 5; // cover + 3 content + cta

  // Slide 1: cover
  {
    const page = pdf.addPage([W, H]);
    drawFrame(page, 1, totalSlides);

    const titleSize = 72;
    const titleLines = wrapText(plan.cover_title, helvBold, titleSize, W - 160);
    let y = H / 2 + (titleLines.length * titleSize) / 2 + 40;
    for (const line of titleLines) {
      page.drawText(line, { x: 80, y, size: titleSize, font: helvBold, color: ink });
      y -= titleSize + 8;
    }
    y -= 20;
    const subSize = 28;
    for (const line of wrapText(plan.cover_subtitle, helv, subSize, W - 160)) {
      page.drawText(line, { x: 80, y, size: subSize, font: helv, color: muted });
      y -= subSize + 8;
    }
  }

  // Slides 2-4: content
  plan.slides.forEach((s, i) => {
    const page = pdf.addPage([W, H]);
    drawFrame(page, i + 2, totalSlides);

    // Slide number badge
    const badge = `0${i + 1}`;
    page.drawText(badge, { x: 80, y: H - 260, size: 96, font: helvBold, color: primary });

    // Heading
    const headSize = 52;
    const headLines = wrapText(s.heading, helvBold, headSize, W - 160);
    let y = H - 380;
    for (const line of headLines) {
      page.drawText(line, { x: 80, y, size: headSize, font: helvBold, color: ink });
      y -= headSize + 6;
    }

    // Divider
    y -= 20;
    page.drawRectangle({ x: 80, y, width: 80, height: 3, color: primary });
    y -= 40;

    // Body
    const bodySize = 30;
    for (const line of wrapText(s.body, helv, bodySize, W - 160)) {
      page.drawText(line, { x: 80, y, size: bodySize, font: helv, color: ink });
      y -= bodySize + 10;
    }
  });

  // Slide 5: CTA
  {
    const page = pdf.addPage([W, H]);
    drawFrame(page, totalSlides, totalSlides);

    // Big primary block
    page.drawRectangle({ x: 80, y: H / 2 - 60, width: W - 160, height: 8, color: primary });

    const ctaSize = 56;
    const ctaLines = wrapText(plan.cta, helvBold, ctaSize, W - 160);
    let y = H / 2 + 40;
    for (const line of ctaLines) {
      page.drawText(line, { x: 80, y, size: ctaSize, font: helvBold, color: ink });
      y -= ctaSize + 8;
    }

    const sub = "Outil gratuit a vie pour les independants francais.";
    page.drawText(toWinAnsi(sub), {
      x: 80, y: H / 2 - 120, size: 26, font: helv, color: muted,
    });
  }

  const bytes = await pdf.save();
  console.log(`Rendered PDF carousel: ${bytes.length} bytes, ${totalSlides} slides`);
  return bytes;
}

// ─── LinkedIn upload (shared for video / document) ─────────────────────────

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
  if (!json.sub) throw new Error("No sub in /v2/userinfo");
  return `urn:li:person:${json.sub}`;
}

function toGatewayUrl(linkedinUrl: string): string {
  const u = new URL(linkedinUrl);
  return `${GATEWAY_URL}${u.pathname}${u.search}`;
}

type UploadTarget = { uploadUrl: string; assetUrn: string; extraHeaders: Record<string, string> };

async function registerUpload(
  ownerUrn: string,
  recipe: "feedshare-video" | "feedshare-document",
): Promise<UploadTarget> {
  const res = await gatewayFetch("/v2/assets?action=registerUpload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [`urn:li:digitalmediaRecipe:${recipe}`],
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

async function uploadBytes(
  uploadUrl: string,
  bytes: Uint8Array,
  contentType: string,
  extraHeaders: Record<string, string>,
): Promise<void> {
  const gatewayUrl = toGatewayUrl(uploadUrl);
  const res = await gatewayFetch(gatewayUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType, ...extraHeaders },
    body: bytes,
  });
  if (!res.ok) {
    throw new Error(`uploadBytes ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  console.log(`Uploaded ${bytes.length} bytes to LinkedIn (${contentType})`);
}

async function waitForAssetReady(assetUrn: string, maxMs = 5 * 60 * 1000): Promise<void> {
  const assetId = assetUrn.split(":").pop()!;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const res = await gatewayFetch(`/v2/assets/${assetId}`);
    if (res.ok) {
      const json = await res.json();
      const status = json.recipes?.[0]?.status;
      console.log(`Asset ${assetId} status: ${status}`);
      if (status === "AVAILABLE") return;
      if (status === "PROCESSING_FAILED" || status === "CLIENT_ERROR" || status === "SERVER_ERROR") {
        throw new Error(`Asset processing failed (${status})`);
      }
    } else {
      console.warn(`Asset poll ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    await new Promise(r => setTimeout(r, 8000));
  }
  throw new Error("Asset not AVAILABLE within timeout");
}

async function createUgcPost(
  ownerUrn: string,
  text: string,
  assetUrn: string,
  topic: Topic,
  mediaCategory: "VIDEO" | "DOCUMENT",
): Promise<string> {
  const body = {
    author: ownerUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: mediaCategory,
        media: [{
          status: "READY",
          description: { text: topic.title },
          media: assetUrn,
          title: { text: `IKtracker - ${topic.title}` },
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
  if (!res.ok) throw new Error(`ugcPosts ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.id || json["x-restli-id"] || "unknown";
}

// ─── Logging ────────────────────────────────────────────────────────────────

async function logRun(supabase: ReturnType<typeof createClient>, row: Record<string, unknown>) {
  const { error } = await supabase.from("linkedin_post_log").insert(row);
  if (error) console.error("Failed to log run:", error);
}

// ─── Entrypoint ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const forceFormat = url.searchParams.get("format") as MediaFormat | null;

  // Auth: cron secret OR admin JWT
  const cronSecret = Deno.env.get("CRON_SECRET");
  const altCronSecret = Deno.env.get("SYNC_CRON_TOKEN");
  const xCronSecret = req.headers.get("x-cron-secret");
  const isCron = !!xCronSecret && (
    (cronSecret && xCronSecret === cronSecret) ||
    (altCronSecret && xCronSecret === altCronSecret)
  );
  const triggeredBy: "cron" | "admin" = isCron ? "cron" : "admin";

  if (!isCron) {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabaseAuthed.rpc("has_role", {
      _user_id: data.user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = Date.now();
  const topic = pickTopicForThisWeek();
  const format: MediaFormat = forceFormat === "video" || forceFormat === "carousel"
    ? forceFormat
    : topic.format;
  console.log(`[linkedin-weekly-post] topic=${topic.slug} format=${format} dryRun=${dryRun}`);

  let postText = "";
  let mediaBytes = 0;
  let assetUrn: string | null = null;
  let postId: string | null = null;
  let slidePlan: SlidePlan | null = null;

  try {
    // 1) Post text (always)
    postText = await generatePostText(topic);
    console.log(`Generated post text (${postText.length} chars)`);

    // 1bis) If carousel, also generate slide plan up front so dry-run can preview it
    if (format === "carousel") {
      slidePlan = await generateSlidePlan(topic);
      console.log(`Slide plan ready (${slidePlan.slides.length} content slides)`);
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true, topic, format, post_text: postText, slide_plan: slidePlan,
        }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) LinkedIn owner URN
    const ownerUrn = await getMemberUrn();
    console.log(`LinkedIn owner: ${ownerUrn}`);

    // 3) Build media + upload
    if (format === "video") {
      const mp4 = await recordScreencast(topic);
      mediaBytes = mp4.length;

      const upload = await registerUpload(ownerUrn, "feedshare-video");
      assetUrn = upload.assetUrn;
      await uploadBytes(upload.uploadUrl, mp4, "application/octet-stream", upload.extraHeaders);
      await waitForAssetReady(assetUrn);
      postId = await createUgcPost(ownerUrn, postText, assetUrn, topic, "VIDEO");
    } else {
      const pdf = await renderCarouselPdf(topic, slidePlan!);
      mediaBytes = pdf.length;

      const upload = await registerUpload(ownerUrn, "feedshare-document");
      assetUrn = upload.assetUrn;
      await uploadBytes(upload.uploadUrl, pdf, "application/pdf", upload.extraHeaders);
      await waitForAssetReady(assetUrn);
      postId = await createUgcPost(ownerUrn, postText, assetUrn, topic, "DOCUMENT");
    }
    console.log(`Published UGC post ${postId}`);

    await logRun(admin, {
      topic_slug: topic.slug,
      topic_title: topic.title,
      post_text: postText,
      linkedin_post_id: postId,
      linkedin_asset_urn: assetUrn,
      video_bytes: mediaBytes,
      media_type: format,
      status: "success",
      duration_ms: Date.now() - startedAt,
      triggered_by: triggeredBy,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        topic_slug: topic.slug,
        format,
        post_id: postId,
        asset_urn: assetUrn,
        media_bytes: mediaBytes,
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
      video_bytes: mediaBytes || null,
      media_type: format,
      status: "failed",
      error_message: message.slice(0, 2000),
      duration_ms: Date.now() - startedAt,
      triggered_by: triggeredBy,
    });
    return new Response(
      JSON.stringify({ ok: false, error: message, topic_slug: topic.slug, format }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
