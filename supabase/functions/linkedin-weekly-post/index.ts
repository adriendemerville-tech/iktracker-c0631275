// Monthly LinkedIn auto-post for Adrien de Volontat (IKtracker founder identity).
//
// Text generation:
//   • Primary  : Mistral via Wavespeed proxy (WAVESPEED_API_KEY)
//   • Fallback : Gemini via Lovable AI Gateway (LOVABLE_API_KEY)
//
// Media pipeline, chosen per topic via `mediaSource`:
//   • "browserless" → screencast of an actual UI feature (Browserless → MP4)
//   • "wavespeed"   → AI-generated image/video (Wavespeed → MP4 or IA-backed PDF carousel)
//
// Format still drives the LinkedIn upload:
//   • "video"    → LinkedIn VIDEO ugcPost (MP4)
//   • "carousel" → LinkedIn DOCUMENT ugcPost (PDF slides)
//
// Triggered by pg_cron the 1st Wednesday of each month at 07:00 UTC.
// Runtime overrides via query params:
//   ?topic=<slug>      force a specific topic
//   ?format=video|carousel  override the topic's default format
//   ?dry_run=1         generate text (+ slide plan) only, do not upload/post
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
const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";

// Wavespeed model ids (adjust to whatever the catalog exposes; safe defaults).
const WS_MISTRAL_MODEL = "mistral/mistral-large-latest";
const WS_IMAGE_MODEL = "wavespeed-ai/flux-dev";
const WS_VIDEO_MODEL = "wavespeed-ai/wan-2.1-t2v-720p";

type MediaFormat = "video" | "carousel";
type MediaSource = "browserless" | "wavespeed";

type Topic = {
  slug: string;
  title: string;
  url: string;
  focus: string;
  format: MediaFormat;
  mediaSource: MediaSource;
  durationMs: number;     // browserless screencast length
  visualPrompt?: string;  // Wavespeed image/video prompt (mediaSource='wavespeed')
  slideCount?: number;    // number of intermediate carousel slides (default 3 → 5 pages total)
};

// Rotation of 12 topics — with a monthly cadence this covers ~1 year.
// mediaSource='browserless' → real UI screencast (features that must be *shown*).
// mediaSource='wavespeed'   → AI-generated visual (concepts, comparisons, values).
const TOPICS: Topic[] = [
  {
    slug: "simulateur",
    title: "Simulateur d'indemnités kilométriques 2026",
    url: "https://iktracker.fr/simulateur",
    format: "video",
    mediaSource: "browserless",
    focus:
      "Le simulateur calcule instantanément les IK selon le barème officiel progressif (5 000 / 20 000 km) et applique le bonus 20% pour véhicules 100% électriques. Utile pour un indépendant qui veut estimer son remboursement avant de facturer un client ou d'arbitrer entre véhicule perso et pro.",
    durationMs: 10000,
  },
  {
    slug: "mode-tournee",
    title: "Mode Tournée GPS",
    url: "https://iktracker.fr/mode-tournee",
    format: "video",
    mediaSource: "browserless",
    focus:
      "Détection automatique des arrêts pendant une tournée terrain (2 min à l'arrêt = nouvel arrêt). Pensé pour les visiteurs médicaux, commerciaux, artisans multi-chantiers, aides à domicile. Zéro saisie manuelle, le trajet complet est reconstruit à la fin de la journée.",
    durationMs: 12000,
  },
  {
    slug: "import-takeout",
    title: "Récupération des trajets passés (Google Takeout)",
    url: "https://iktracker.fr/import-google-timeline",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Import des trajets Google Timeline depuis un export Takeout. Sauve les indépendants qui n'ont pas suivi leurs déplacements pros toute l'année et qui doivent rattraper en fin d'exercice. Import 100% côté client, aucune donnée transite sur des serveurs tiers.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract representation of GPS trip data being imported, subtle map lines and timeline dots, flat design, clean typography-friendly composition with negative space on the right, no text",
  },
  {
    slug: "sync-calendrier",
    title: "Synchronisation Google Calendar & Outlook",
    url: "https://iktracker.fr/synchronisation-calendrier",
    format: "video",
    mediaSource: "browserless",
    focus:
      "Chaque rendez-vous professionnel dans l'agenda devient automatiquement un trajet indemnisable. Sync 4x par jour, gestion des adresses par défaut (bureau, domicile). Idéal pour les indépendants qui vivent déjà dans leur agenda.",
    durationMs: 10000,
  },
  {
    slug: "detection-plaque",
    title: "Détection véhicule par plaque d'immatriculation",
    url: "https://iktracker.fr/detection-vehicule",
    format: "video",
    mediaSource: "browserless",
    focus:
      "Saisir une plaque d'immatriculation renseigne automatiquement la puissance fiscale et la motorisation du véhicule. Le barème IK exact et le bonus électrique 20% s'appliquent sans effort. Fini les recherches sur la carte grise.",
    durationMs: 8000,
  },
  {
    slug: "bareme-progressif",
    title: "Barème progressif fiscal 2026",
    url: "https://iktracker.fr/bareme-kilometrique-2026",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Le barème IK est progressif avec 3 tranches (0-5 000, 5 001-20 000, +20 000 km). Beaucoup d'indépendants perdent de l'argent en appliquant un taux moyen. IKtracker gère les tranches et le reset annuel fiscal automatiquement.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract layered bar-chart representing progressive tax tiers, three tiers of ascending height, clean flat design, ample negative space, no text",
  },
  {
    slug: "bonus-electrique",
    title: "Bonus 20% véhicule électrique",
    url: "https://iktracker.fr/bonus-vehicule-electrique",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Un véhicule 100% électrique donne droit à un bonus fiscal de 20% sur les indemnités kilométriques. C'est cumulable avec le barème standard et souvent oublié. Calculé automatiquement dès que le véhicule est identifié comme électrique.",
    durationMs: 8000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, sleek profile of a modern electric car with a subtle green leaf accent, flat design, clean lines, generous negative space on the right, no text, no logos",
  },
  {
    slug: "export-pdf",
    title: "Export PDF pour l'expert-comptable",
    url: "https://iktracker.fr/experts-comptables",
    format: "video",
    mediaSource: "browserless",
    focus:
      "Export PDF prêt à transmettre au comptable : tableau récapitulatif conforme, signature du dirigeant, détail par trajet, totaux par tranche fiscale. Adieu les Excel bricolés en fin d'exercice.",
    durationMs: 10000,
  },
  {
    slug: "ik-velo",
    title: "Indemnité kilométrique vélo",
    url: "https://iktracker.fr/indemnite-kilometrique-velo",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "L'IK vélo existe pour les indépendants qui pédalent en ville pour leurs rendez-vous pros. Fiscalement encadrée, souvent ignorée. IKtracker la calcule et la trace comme n'importe quel autre trajet.",
    durationMs: 8000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, elegant urban bicycle silhouette from side view, flat design, clean lines, ample negative space on the right, no text, no logos",
  },
  {
    slug: "gratuit-a-vie",
    title: "Gratuit à vie — modèle communautaire",
    url: "https://iktracker.fr/",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "IKtracker est gratuit à vie : pas d'abonnement, pas de freemium castré, pas d'investisseurs à rémunérer. Outil créé par un dirigeant qui avait le même problème et qui le partage avec la communauté des indépendants.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract concept of an open community: interconnected human silhouettes forming a light circle, flat design, generous negative space, no text",
  },
  {
    slug: "confidentialite",
    title: "Aucune exploitation commerciale des données",
    url: "https://iktracker.fr/confidentialite",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Zéro revente de données, zéro publicité, zéro tracking commercial. Contrairement à la plupart des GPS trackers gratuits en apparence dont le vrai business est la donnée. Les trajets restent la propriété de l'utilisateur.",
    durationMs: 8000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract closed padlock over a subtle map grid, flat design, clean lines, generous negative space on the right, no text",
  },
  {
    slug: "comparatif",
    title: "IKtracker vs applications payantes",
    url: "https://iktracker.fr/comparatif-drivers-note",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Face aux applications payantes du marché (Drivers Note, Izika, MileageWise) : mêmes fonctionnalités cœur, zéro euro, sans engagement, avec le barème français à jour et un focus indépendants français.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract split composition contrasting a heavy price tag with a light feather, flat design, clean lines, no text, no logos",
  },
  {
    slug: "trajets-recurrents",
    title: "Trajets récurrents automatisés",
    url: "https://iktracker.fr/",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "IKtracker permet de définir des trajets récurrents (visite client hebdomadaire, tournée du mardi, aller-retour bureau chez un partenaire) qui se génèrent automatiquement à la fréquence choisie. L'indépendant configure une fois, l'outil crée les entrées chaque semaine ou chaque mois. Fini les oublis en fin d'exercice et la saisie répétitive des mêmes adresses. Compatible avec le barème progressif, le bonus électrique et l'export comptable.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract representation of a repeating calendar loop with a subtle route line arcing between two points, cyclical pattern, flat design, clean lines, generous negative space on the right, no text, no logos",
    slideCount: 4,
  },
];

// Monthly cadence: pick topic by (year*12 + month) % TOPICS.length
function pickTopicForThisMonth(now: Date = new Date()): Topic {
  const idx = (now.getUTCFullYear() * 12 + now.getUTCMonth()) % TOPICS.length;
  return TOPICS[idx];
}

function findTopic(slug: string | null): Topic | null {
  if (!slug) return null;
  return TOPICS.find((t) => t.slug === slug) ?? null;
}

// ─── Wavespeed helpers ─────────────────────────────────────────────────────

async function wavespeedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const key = Deno.env.get("WAVESPEED_API_KEY");
  if (!key) throw new Error("WAVESPEED_API_KEY missing");
  const url = `${WAVESPEED_BASE}/${path.replace(/^\/+/, "")}`;
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${key}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers });
}

async function wavespeedPollUntilDone(requestId: string, timeoutMs = 180_000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await wavespeedFetch(`predictions/${requestId}/result`);
    if (r.ok) {
      const d = await r.json();
      const status = d?.data?.status ?? d?.status;
      if (status === "completed" || status === "failed") return d;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  throw new Error(`Wavespeed polling timeout for ${requestId}`);
}

// ─── Text generation ─── Mistral (Wavespeed) with Gemini fallback ─────────

async function callMistralViaWavespeed(system: string, userMsg: string, opts: { json?: boolean; temperature?: number } = {}): Promise<string> {
  // Wavespeed-hosted LLMs are called through the standard /predictions endpoint.
  // Endpoint shape follows Wavespeed's OpenAI-compatible chat schema.
  const res = await wavespeedFetch(`${WS_MISTRAL_MODEL}`, {
    method: "POST",
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      temperature: opts.temperature ?? 0.8,
      max_tokens: 1500,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Wavespeed/Mistral ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const raw = await res.json();
  // Wavespeed may return an OpenAI-style response directly, or a prediction envelope.
  // Try both shapes.
  const direct = raw?.choices?.[0]?.message?.content;
  if (direct) return String(direct).trim();
  const outputs: unknown = raw?.data?.outputs ?? raw?.outputs;
  if (Array.isArray(outputs) && outputs.length > 0 && typeof outputs[0] === "string") {
    return (outputs[0] as string).trim();
  }
  // Prediction envelope: poll if we got a request id back.
  const requestId = raw?.data?.id ?? raw?.id;
  if (requestId) {
    const polled = await wavespeedPollUntilDone(String(requestId));
    const pOutputs: unknown = polled?.data?.outputs ?? polled?.outputs;
    const content = polled?.data?.choices?.[0]?.message?.content ?? polled?.choices?.[0]?.message?.content;
    if (content) return String(content).trim();
    if (Array.isArray(pOutputs) && pOutputs.length > 0 && typeof pOutputs[0] === "string") {
      return (pOutputs[0] as string).trim();
    }
  }
  throw new Error(`Unrecognized Wavespeed/Mistral response: ${JSON.stringify(raw).slice(0, 300)}`);
}

async function callGeminiFallback(system: string, userMsg: string, opts: { json?: boolean; temperature?: number } = {}): Promise<string> {
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
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      temperature: opts.temperature ?? 0.8,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Gemini fallback ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

async function callLLM(system: string, userMsg: string, opts: { json?: boolean; temperature?: number } = {}): Promise<{ text: string; source: "mistral" | "gemini" }> {
  try {
    const text = await callMistralViaWavespeed(system, userMsg, opts);
    return { text, source: "mistral" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[llm] Mistral failed, falling back to Gemini: ${message}`);
    const text = await callGeminiFallback(system, userMsg, opts);
    return { text, source: "gemini" };
  }
}

// ─── Style profiling ───────────────────────────────────────────────────────
// Analyse déterministe des posts passés pour extraire les motifs stylistiques
// (longueurs, rythme, vocabulaire). Injecté dans le prompt en plus des exemples
// bruts, pour guider le modèle avec des cibles chiffrées imitables.

export type StyleProfile = {
  samples_count: number;
  avg_char_length: number;
  avg_word_count: number;
  avg_sentence_count: number;
  avg_sentence_words: number;
  avg_paragraph_count: number;
  avg_paragraph_words: number;
  short_sentence_ratio: number;   // % phrases <= 8 mots (rythme sec)
  first_person_ratio: number;     // % phrases commençant par "je"
  question_ratio: number;         // % phrases interrogatives
  top_opening_words: string[];    // mots typiques de première ligne
  frequent_bigrams: string[];     // bigrammes récurrents (signature lexicale)
  frequent_content_words: string[]; // vocabulaire fort récurrent
};

const FR_STOPWORDS = new Set<string>([
  "le","la","les","un","une","des","de","du","d","l","et","ou","mais","donc","or","ni","car",
  "je","tu","il","elle","on","nous","vous","ils","elles","me","te","se","lui","leur","y","en",
  "mon","ma","mes","ton","ta","tes","son","sa","ses","notre","votre","nos","vos","leurs",
  "ce","cet","cette","ces","ça","cela","celui","celle","ceux","celles",
  "que","qui","quoi","dont","où","quand","comme","si","pour","par","sur","sous","avec","sans","dans","chez","vers","entre","aussi","très","plus","moins","bien","peu","tout","toute","tous","toutes","aux","au","à","a","est","être","été","suis","es","sommes","êtes","sont","était","étaient","serai","sera","seront","fait","faire","fais","font","ai","as","avons","avez","ont","avait","avaient",
  "pas","ne","n","oui","non","déjà","encore","toujours","jamais","alors","puis","ensuite","enfin","ici","là","hier","aujourd","demain","c","s","t","m","qu",
]);

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, " ")
    .split(/[^\p{L}\p{N}\-]+/u)
    .filter((w) => w.length > 0);
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ý"«])/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
}

function topK<T extends string>(counter: Map<T, number>, k: number): T[] {
  return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([w]) => w);
}

export function analyzeStyle(samples: string[]): StyleProfile {
  const n = samples.length;
  if (n === 0) {
    return {
      samples_count: 0,
      avg_char_length: 0, avg_word_count: 0,
      avg_sentence_count: 0, avg_sentence_words: 0,
      avg_paragraph_count: 0, avg_paragraph_words: 0,
      short_sentence_ratio: 0, first_person_ratio: 0, question_ratio: 0,
      top_opening_words: [], frequent_bigrams: [], frequent_content_words: [],
    };
  }

  let totalChars = 0, totalWords = 0, totalSentences = 0, totalParagraphs = 0;
  let shortSent = 0, firstPersonSent = 0, questionSent = 0, totalSentWords = 0, totalParaWords = 0;
  const openings = new Map<string, number>();
  const bigrams = new Map<string, number>();
  const contentWords = new Map<string, number>();

  for (const raw of samples) {
    const t = raw.trim();
    totalChars += t.length;
    const words = tokenizeWords(t);
    totalWords += words.length;

    const sentences = splitSentences(t);
    totalSentences += sentences.length;
    for (const s of sentences) {
      const sw = tokenizeWords(s);
      totalSentWords += sw.length;
      if (sw.length > 0 && sw.length <= 8) shortSent += 1;
      if (sw[0] === "je" || sw[0] === "j") firstPersonSent += 1;
      if (/\?\s*$/.test(s)) questionSent += 1;
    }

    const paragraphs = splitParagraphs(t);
    totalParagraphs += paragraphs.length;
    for (const p of paragraphs) totalParaWords += tokenizeWords(p).length;

    // opening: premier mot significatif de la première phrase
    const firstSentWords = sentences[0] ? tokenizeWords(sentences[0]) : [];
    const opener = firstSentWords.find((w) => !FR_STOPWORDS.has(w) && w.length > 2);
    if (opener) openings.set(opener, (openings.get(opener) ?? 0) + 1);

    // content words + bigrams (hors stopwords)
    const content = words.filter((w) => !FR_STOPWORDS.has(w) && w.length > 3);
    for (const w of content) contentWords.set(w, (contentWords.get(w) ?? 0) + 1);
    for (let i = 0; i < words.length - 1; i++) {
      const a = words[i], b = words[i + 1];
      if (FR_STOPWORDS.has(a) || FR_STOPWORDS.has(b)) continue;
      if (a.length < 3 || b.length < 3) continue;
      const bg = `${a} ${b}`;
      bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
    }
  }

  const round = (x: number, p = 1) => Math.round(x * 10 ** p) / 10 ** p;
  return {
    samples_count: n,
    avg_char_length: Math.round(totalChars / n),
    avg_word_count: Math.round(totalWords / n),
    avg_sentence_count: round(totalSentences / n),
    avg_sentence_words: totalSentences ? round(totalSentWords / totalSentences) : 0,
    avg_paragraph_count: round(totalParagraphs / n),
    avg_paragraph_words: totalParagraphs ? round(totalParaWords / totalParagraphs) : 0,
    short_sentence_ratio: totalSentences ? round((shortSent / totalSentences) * 100, 0) : 0,
    first_person_ratio: totalSentences ? round((firstPersonSent / totalSentences) * 100, 0) : 0,
    question_ratio: totalSentences ? round((questionSent / totalSentences) * 100, 0) : 0,
    top_opening_words: topK(openings, 6),
    frequent_bigrams: topK(bigrams, 8).filter((b) => (bigrams.get(b as string) ?? 0) >= 2),
    frequent_content_words: topK(contentWords, 15).filter((w) => (contentWords.get(w as string) ?? 0) >= 2),
  };
}

function styleProfileToPromptBlock(p: StyleProfile): string {
  if (p.samples_count === 0) return "(aucun profil de style calculé)";
  const targetWords = Math.max(140, Math.min(240, p.avg_word_count || 190));
  const lines = [
    `Longueur cible : environ ${targetWords} mots (moyenne observée sur ${p.samples_count} posts : ${p.avg_word_count} mots, ${p.avg_char_length} caractères).`,
    `Rythme : ${p.avg_sentence_count} phrases par post, ${p.avg_sentence_words} mots par phrase en moyenne. ${p.short_sentence_ratio}% des phrases font 8 mots ou moins — garde cette proportion de phrases courtes et sèches.`,
    `Structure : ${p.avg_paragraph_count} paragraphes en moyenne, ${p.avg_paragraph_words} mots par paragraphe. Aère avec des sauts de ligne.`,
    `Première personne : ${p.first_person_ratio}% des phrases commencent par "je" ou "j'". Reste dans cette proportion.`,
    p.question_ratio > 0
      ? `Questions rhétoriques : ${p.question_ratio}% (rare, n'en abuse pas).`
      : `Pas de questions rhétoriques dans le corpus, n'en introduis pas.`,
    p.top_opening_words.length
      ? `Mots d'ouverture typiques (première ligne) : ${p.top_opening_words.join(", ")}.`
      : "",
    p.frequent_content_words.length
      ? `Vocabulaire signature récurrent : ${p.frequent_content_words.join(", ")}. Puise dedans quand c'est naturel, ne force pas.`
      : "",
    p.frequent_bigrams.length
      ? `Bigrammes récurrents : ${p.frequent_bigrams.join(" · ")}.`
      : "",
  ].filter(Boolean);
  return lines.join("\n");
}

async function generatePostText(
  topic: Topic,
  styleSamples: string[],
  styleProfile: StyleProfile,
): Promise<{ text: string; source: string }> {
  const samplesBlock = styleSamples.length
    ? styleSamples
        .slice(0, 6)
        .map((s, i) => `--- Exemple ${i + 1} ---\n${s.trim()}`)
        .join("\n\n")
    : "(aucun exemple disponible — reste sobre et factuel)";

  const profileBlock = styleProfileToPromptBlock(styleProfile);

  const system = `Tu rédiges un post LinkedIn pour Adrien de Volontat, dirigeant d'entreprise et fondateur d'IKtracker (iktracker.fr) — outil GRATUIT À VIE de suivi des indemnités kilométriques pour indépendants (auto-entrepreneurs, freelances, professions libérales, artisans, commerciaux, aides à domicile).

TON & STYLE :
- Imite le style d'écriture des exemples fournis plus bas : rythme des phrases, vocabulaire, ponctuation, longueur des paragraphes, façon d'aborder un sujet.
- Français, première personne (je / mon), pragmatique, humain, factuel. Comme un dirigeant qui parle à ses pairs.

PROFIL DE STYLE MESURÉ SUR LES POSTS PASSÉS (cibles à respecter) :
${profileBlock}

STRUCTURE :
- HOOK obligatoire en toute première ligne : une phrase courte, concrète, qui accroche l'œil dans le feed (fait brut, chiffre, anecdote, tension). Pas de question rhétorique, pas de citation, pas de "Vous savez quoi ?".
- Respecte la longueur cible et le rythme indiqués ci-dessus (nombre de phrases, phrases courtes, paragraphes).
- PAS DE CHUTE : ne termine pas par une conclusion, une morale, une leçon, un appel à l'action, un CTA, un lien, une invitation à commenter, ni une phrase de synthèse. Le post s'arrête sur un fait ou un détail, sec.

GARDE-FOUS ANTI-IA (RESPECT ABSOLU) :
- INTERDIT : les tirets cadratins (—), demi-cadratins (–) et les tirets d'incise "-" utilisés comme ponctuation. Utilise des points, des virgules, des points-virgules, des deux-points, ou des retours à la ligne à la place. Les traits d'union à l'intérieur d'un mot composé (ex : "auto-entrepreneur") restent autorisés.
- INTERDIT : emojis, hashtags, listes à puces, gras/italique markdown, guillemets français décoratifs.
- INTERDIT (formulations IA typiques) : "Découvrez", "révolutionnaire", "game-changer", "unlock", "boostez", "solution ultime", "en un clin d'œil", "à l'ère de", "dans un monde où", "il est essentiel de", "n'hésitez pas à", "je suis ravi/fier de", "spoiler", "TL;DR".
- Pas d'appel vers iktracker.fr, pas de lien, pas de hashtag final.

EXEMPLES DE POSTS DÉJÀ ÉCRITS PAR ADRIEN (source d'inspiration stylistique — ne recopie aucune phrase, imite le ton) :
${samplesBlock}`;

  const user = `Sujet du mois : ${topic.title}\n\nContexte / faits sur la fonctionnalité :\n${topic.focus}\n\nRédige le post LinkedIn complet, prêt à publier. Rappel : hook en première ligne, pas de chute, aucun tiret (—, –, -) comme ponctuation, respect strict des cibles de longueur et de rythme.`;
  const { text, source } = await callLLM(system, user, { temperature: 0.85 });
  return { text, source };
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

// ─── Wavespeed media generation ────────────────────────────────────────────

async function submitWavespeedJob(modelPath: string, input: Record<string, unknown>): Promise<any> {
  const res = await wavespeedFetch(`${modelPath}?wait=1`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Wavespeed ${modelPath} ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const status = json?.data?.status ?? json?.status;
  if (status === "completed") return json;
  // Wait=1 timed out on gateway side → poll ourselves
  const id = json?.data?.id ?? json?.id;
  if (!id) throw new Error(`No request id in Wavespeed response: ${JSON.stringify(json).slice(0, 300)}`);
  return await wavespeedPollUntilDone(String(id));
}

function extractOutputs(payload: any): string[] {
  const outputs = payload?.data?.outputs ?? payload?.outputs;
  if (!Array.isArray(outputs)) throw new Error("Wavespeed response has no outputs[]");
  return outputs.filter((u: unknown): u is string => typeof u === "string");
}

async function downloadBinary(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${url} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function generateWavespeedImage(prompt: string): Promise<Uint8Array> {
  const payload = await submitWavespeedJob(WS_IMAGE_MODEL, {
    prompt,
    size: "1024*1024",
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,
  });
  const outputs = extractOutputs(payload);
  if (outputs.length === 0) throw new Error("Wavespeed image job returned no output");
  return await downloadBinary(outputs[0]);
}

async function generateWavespeedVideo(prompt: string): Promise<Uint8Array> {
  const payload = await submitWavespeedJob(WS_VIDEO_MODEL, {
    prompt,
    duration: 5,
    aspect_ratio: "16:9",
  });
  const outputs = extractOutputs(payload);
  if (outputs.length === 0) throw new Error("Wavespeed video job returned no output");
  return await downloadBinary(outputs[0]);
}

// ─── Carousel pipeline (AI slide plan → pdf-lib PDF) ───────────────────────

type SlidePlan = {
  cover_title: string;
  cover_subtitle: string;
  slides: Array<{ heading: string; body: string }>; // exactly 3
  cta: string;
};

async function generateSlidePlan(topic: Topic): Promise<{ plan: SlidePlan; source: string }> {
  const count = topic.slideCount ?? 3;
  const system = `Tu structures un carrousel LinkedIn éditorial sobre pour IKtracker (iktracker.fr), outil gratuit à vie de suivi des indemnités kilométriques pour indépendants français.

Contraintes ABSOLUES :
- Français, ton pragmatique entrepreneurial
- AUCUN emoji
- Phrases courtes, factuelles, sans marketing
- Interdit : "Découvrez", "révolutionnaire", "boostez", "unlock", "testez"
- Respecte STRICTEMENT les limites de caractères (cover_title ≤ 60, cover_subtitle ≤ 90, heading ≤ 40, body ≤ 180, cta ≤ 60)
- Exactement ${count} slides intermédiaires (heading + body)`;
  const user = `Sujet : ${topic.title}\n\nContexte :\n${topic.focus}\n\nProduis le plan du carrousel au format JSON strict avec les clés cover_title, cover_subtitle, slides (array de ${count} objets {heading, body}), cta. Rien d'autre.`;
  const { text, source } = await callLLM(system, user, { json: true, temperature: 0.7 });
  const plan = JSON.parse(text) as SlidePlan;
  if (!plan.cover_title || !Array.isArray(plan.slides) || plan.slides.length !== count) {
    throw new Error(`Malformed slide plan (expected ${count} slides): ${text.slice(0, 300)}`);
  }
  return { plan, source };
}

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

async function renderCarouselPdf(
  topic: Topic,
  plan: SlidePlan,
  coverBg: Uint8Array | null,
): Promise<Uint8Array> {
  const W = 1200;
  const H = 1200;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`IKtracker — ${topic.title}`);
  pdf.setAuthor("Adrien de Volontat");
  pdf.setSubject(topic.focus.slice(0, 200));

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const bg = rgb(0.984, 0.973, 0.949);
  const ink = rgb(0.09, 0.09, 0.13);
  const primary = rgb(0.361, 0.294, 0.902);
  const muted = rgb(0.38, 0.38, 0.44);

  const coverImage = coverBg
    ? await (async () => {
        try { return await pdf.embedJpg(coverBg); }
        catch { return await pdf.embedPng(coverBg); }
      })()
    : null;

  const drawFrame = (page: import("npm:pdf-lib@1.17.1").PDFPage, slideNum: number, total: number) => {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg });
    page.drawRectangle({ x: 80, y: H - 100, width: 60, height: 4, color: primary });
    page.drawText("IKtracker", { x: 80, y: H - 140, size: 22, font: helvBold, color: ink });
    const counter = `${slideNum} / ${total}`;
    const cw = helv.widthOfTextAtSize(counter, 18);
    page.drawText(counter, { x: W - 80 - cw, y: H - 140, size: 18, font: helv, color: muted });
    page.drawText("iktracker.fr", { x: 80, y: 80, size: 16, font: helv, color: muted });
    page.drawRectangle({ x: 80, y: 74, width: 40, height: 2, color: primary });
  };

  const totalSlides = plan.slides.length + 2; // cover + N + CTA

  // Cover
  {
    const page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg });
    if (coverImage) {
      // AI-generated visual as a soft right-side panel (60% width, faded via low opacity rectangle overlay).
      page.drawImage(coverImage, { x: W * 0.42, y: 0, width: W * 0.58, height: H });
      // Soft ivory scrim on the left for text legibility
      page.drawRectangle({ x: 0, y: 0, width: W * 0.55, height: H, color: bg, opacity: 0.92 });
    }
    drawFrame(page, 1, totalSlides);

    const titleSize = 68;
    const titleLines = wrapText(plan.cover_title, helvBold, titleSize, W * 0.55 - 100);
    let y = H / 2 + (titleLines.length * titleSize) / 2 + 40;
    for (const line of titleLines) {
      page.drawText(line, { x: 80, y, size: titleSize, font: helvBold, color: ink });
      y -= titleSize + 8;
    }
    y -= 20;
    const subSize = 26;
    for (const line of wrapText(plan.cover_subtitle, helv, subSize, W * 0.55 - 100)) {
      page.drawText(line, { x: 80, y, size: subSize, font: helv, color: muted });
      y -= subSize + 8;
    }
  }

  // Content slides
  plan.slides.forEach((s, i) => {
    const page = pdf.addPage([W, H]);
    drawFrame(page, i + 2, totalSlides);
    const badge = `0${i + 1}`;
    page.drawText(badge, { x: 80, y: H - 260, size: 96, font: helvBold, color: primary });
    const headSize = 52;
    const headLines = wrapText(s.heading, helvBold, headSize, W - 160);
    let y = H - 380;
    for (const line of headLines) {
      page.drawText(line, { x: 80, y, size: headSize, font: helvBold, color: ink });
      y -= headSize + 6;
    }
    y -= 20;
    page.drawRectangle({ x: 80, y, width: 80, height: 3, color: primary });
    y -= 40;
    const bodySize = 30;
    for (const line of wrapText(s.body, helv, bodySize, W - 160)) {
      page.drawText(line, { x: 80, y, size: bodySize, font: helv, color: ink });
      y -= bodySize + 10;
    }
  });

  // CTA
  {
    const page = pdf.addPage([W, H]);
    drawFrame(page, totalSlides, totalSlides);
    page.drawRectangle({ x: 80, y: H / 2 - 60, width: W - 160, height: 8, color: primary });
    const ctaSize = 56;
    const ctaLines = wrapText(plan.cta, helvBold, ctaSize, W - 160);
    let y = H / 2 + 40;
    for (const line of ctaLines) {
      page.drawText(line, { x: 80, y, size: ctaSize, font: helvBold, color: ink });
      y -= ctaSize + 8;
    }
    const sub = "Outil gratuit a vie pour les independants francais.";
    page.drawText(toWinAnsi(sub), { x: 80, y: H / 2 - 120, size: 26, font: helv, color: muted });
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

// Récupère les derniers posts LinkedIn de l'auteur pour servir d'échantillons de style.
// Renvoie [] silencieusement si l'endpoint échoue (scope manquant, quota, etc.) — le
// prompt reste fonctionnel sans échantillons.
async function fetchRecentAuthorPosts(ownerUrn: string, count = 10): Promise<string[]> {
  try {
    const encoded = encodeURIComponent(ownerUrn);
    const url = `/v2/ugcPosts?q=authors&authors=List(${encoded})&count=${count}&sortBy=LAST_MODIFIED`;
    const res = await gatewayFetch(url, {
      headers: { "X-Restli-Protocol-Version": "2.0.0" },
    });
    if (!res.ok) {
      console.warn(`[style-samples] ugcPosts list ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return [];
    }
    const json = await res.json();
    const elements: any[] = Array.isArray(json.elements) ? json.elements : [];
    const texts = elements
      .map((el) => el?.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text)
      .filter((t): t is string => typeof t === "string" && t.trim().length >= 80)
      .map((t) => t.trim());
    console.log(`[style-samples] fetched ${texts.length} past posts for style reference`);
    return texts;
  } catch (err) {
    console.warn(`[style-samples] failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

// Nettoie les tirets d'incise (— – -) laissés par le modèle malgré la consigne.
// Conserve les traits d'union intra-mots (ex : auto-entrepreneur).
function sanitizePostText(text: string): string {
  let out = text.replace(/[—–]/g, ",");
  // " - " (tiret d'incise entouré d'espaces) → ", "
  out = out.replace(/\s-\s/g, ", ");
  // "- " en début de ligne (puce résiduelle) → ""
  out = out.replace(/^-\s+/gm, "");
  return out;
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
  const textOnly = url.searchParams.get("text_only") === "1";
  const forceFormat = url.searchParams.get("format") as MediaFormat | null;
  const forcedTopicSlug = url.searchParams.get("topic");

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
  const topic = findTopic(forcedTopicSlug) ?? pickTopicForThisMonth();
  const format: MediaFormat = forceFormat === "video" || forceFormat === "carousel"
    ? forceFormat
    : topic.format;
  console.log(`[linkedin-monthly-post] topic=${topic.slug} format=${format} mediaSource=${topic.mediaSource} dryRun=${dryRun} triggeredBy=${triggeredBy}`);

  let postText = "";
  let textSource = "";
  let mediaBytes = 0;
  let assetUrn: string | null = null;
  let postId: string | null = null;
  let slidePlan: SlidePlan | null = null;
  let slideSource = "";

  try {
    // 1) Récupération de l'URN + des posts passés (échantillons de style)
    //    On le fait avant la génération pour que le prompt puisse imiter le ton d'Adrien,
    //    y compris en dry-run. En cas d'échec, on continue sans échantillon.
    let ownerUrn: string | null = null;
    let styleSamples: string[] = [];
    try {
      ownerUrn = await getMemberUrn();
      console.log(`LinkedIn owner: ${ownerUrn}`);
      styleSamples = await fetchRecentAuthorPosts(ownerUrn, 10);
    } catch (err) {
      console.warn(`[style-samples] URN/list unavailable, continuing without samples: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 1bis) Profil de style déterministe (longueurs, rythme, vocabulaire)
    const styleProfile = analyzeStyle(styleSamples);
    console.log(`[style-profile] ${styleProfile.samples_count} samples · avg ${styleProfile.avg_word_count} mots · ${styleProfile.avg_sentence_count} phrases · ${styleProfile.short_sentence_ratio}% phrases courtes`);

    // 2) Text
    const t = await generatePostText(topic, styleSamples, styleProfile);
    postText = sanitizePostText(t.text);
    textSource = t.source;
    console.log(`Generated post text (${postText.length} chars) via ${textSource}, ${styleSamples.length} style samples`);

    // 2bis) Carousel → slide plan up front (needed for dry-run preview too)
    if (format === "carousel") {
      const sp = await generateSlidePlan(topic);
      slidePlan = sp.plan;
      slideSource = sp.source;
      console.log(`Slide plan ready (${slidePlan.slides.length} content slides) via ${slideSource}`);
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          topic,
          format,
          media_source: topic.mediaSource,
          post_text: postText,
          text_source: textSource,
          style_samples_count: styleSamples.length,
          style_profile: styleProfile,
          slide_plan: slidePlan,
          slide_source: slideSource || null,
        }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) LinkedIn owner URN (fallback si non résolu plus haut)
    if (!ownerUrn) ownerUrn = await getMemberUrn();

    // 3) Build media + upload
    if (format === "video") {
      const mp4 = topic.mediaSource === "browserless"
        ? await recordScreencast(topic)
        : await generateWavespeedVideo(topic.visualPrompt || topic.focus);
      mediaBytes = mp4.length;

      const upload = await registerUpload(ownerUrn, "feedshare-video");
      assetUrn = upload.assetUrn;
      await uploadBytes(upload.uploadUrl, mp4, "application/octet-stream", upload.extraHeaders);
      await waitForAssetReady(assetUrn);
      postId = await createUgcPost(ownerUrn, postText, assetUrn, topic, "VIDEO");
    } else {
      // Carousel: optionally generate a Wavespeed cover background
      let coverBg: Uint8Array | null = null;
      if (topic.mediaSource === "wavespeed" && topic.visualPrompt) {
        try {
          coverBg = await generateWavespeedImage(topic.visualPrompt);
          console.log(`Wavespeed cover image: ${coverBg.length} bytes`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`Wavespeed cover image failed, falling back to plain typography: ${message}`);
        }
      }
      const pdf = await renderCarouselPdf(topic, slidePlan!, coverBg);
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
        media_source: topic.mediaSource,
        text_source: textSource,
        post_id: postId,
        asset_urn: assetUrn,
        media_bytes: mediaBytes,
        duration_ms: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[linkedin-monthly-post] failed:", message);
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
