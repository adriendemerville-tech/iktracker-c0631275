// Boucle qualité LinkedIn : relit un post publié ~5 min après sa mise en ligne,
// l'audite face aux règles de rédaction (hook + potentiel d'impressions), et le
// corrige automatiquement via le mode "repost" de linkedin-weekly-post
// (suppression + republication avec le même asset média).
//
// Déclenché par pg_cron toutes les 5 minutes. Ne traite qu'un post à la fois :
// le dernier run "success" publié il y a plus de 5 min, moins de 24 h, non audité.
//
// Paramètres :
//   ?post_id=<urn>   force l'audit d'un post précis
//   ?dry_run=1       audite et journalise sans republier
//   ?min_age_min=N   âge minimum du post (défaut 5)

import { createClient } from "npm:@supabase/supabase-js@2";
import { DOC_SECTIONS } from "./docs-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/linkedin";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const WS_MISTRAL_MODEL = "mistral/mistral-large-latest";
const LI_VERSION = "202506";

// Conditions d'arrêt de la boucle d'amélioration.
const SCORE_THRESHOLD = 85;   // score composite /100
const HOOK_THRESHOLD = 8;     // hook /10
const MAX_ATTEMPTS = 3;       // itérations maximum par lignée de post
const MIN_GAIN = 3;           // gain minimum de score, sinon plateau => arrêt


// ─── LinkedIn gateway ───────────────────────────────────────────────────────

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

// Relit le texte réellement publié (source de vérité), REST puis repli ugcPosts.
async function fetchPublishedText(postId: string): Promise<string | null> {
  const encoded = encodeURIComponent(postId);
  try {
    const res = await gatewayFetch(`/rest/posts/${encoded}`, {
      headers: { "LinkedIn-Version": LI_VERSION, "X-Restli-Protocol-Version": "2.0.0" },
    });
    if (res.ok) {
      const json = await res.json();
      const text = json?.commentary;
      if (typeof text === "string" && text.trim()) return text.trim();
    } else {
      console.warn(`[audit] rest/posts ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
  } catch (err) {
    console.warn("[audit] rest/posts failed:", err instanceof Error ? err.message : String(err));
  }
  try {
    const res = await gatewayFetch(`/v2/ugcPosts/${encoded}`, {
      headers: { "X-Restli-Protocol-Version": "2.0.0" },
    });
    if (res.ok) {
      const json = await res.json();
      const text =
        json?.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text;
      if (typeof text === "string" && text.trim()) return text.trim();
    } else {
      console.warn(`[audit] v2/ugcPosts ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
  } catch (err) {
    console.warn("[audit] v2/ugcPosts failed:", err instanceof Error ? err.message : String(err));
  }
  return null;
}

// Engagement précoce : likes + commentaires (proxy d'impressions disponible pour
// un post membre ; les impressions brutes ne sont exposées que côté organisation).
async function fetchEarlyEngagement(postId: string): Promise<{ likes: number; comments: number } | null> {
  try {
    const encoded = encodeURIComponent(postId);
    const res = await gatewayFetch(`/v2/socialActions/${encoded}`, {
      headers: { "X-Restli-Protocol-Version": "2.0.0" },
    });
    if (!res.ok) {
      console.warn(`[audit] socialActions ${res.status}`);
      return null;
    }
    const json = await res.json();
    return {
      likes: Number(json?.likesSummary?.totalLikes ?? 0),
      comments: Number(json?.commentsSummary?.aggregatedTotalComments ?? json?.commentsSummary?.totalFirstLevelComments ?? 0),
    };
  } catch {
    return null;
  }
}

// ─── LLM (Mistral via Wavespeed, repli Gemini) ──────────────────────────────

async function callMistral(system: string, userMsg: string): Promise<string> {
  const key = Deno.env.get("WAVESPEED_API_KEY");
  if (!key) throw new Error("WAVESPEED_API_KEY missing");
  const res = await fetch(`${WAVESPEED_BASE}/${WS_MISTRAL_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`Wavespeed/Mistral ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const raw = await res.json();
  const direct = raw?.choices?.[0]?.message?.content ?? raw?.data?.choices?.[0]?.message?.content;
  if (direct) return String(direct).trim();
  throw new Error("Empty Mistral response");
}

async function callGemini(system: string, userMsg: string): Promise<string> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

async function callLLM(system: string, userMsg: string): Promise<{ text: string; source: string }> {
  try {
    return { text: await callMistral(system, userMsg), source: "mistral" };
  } catch (err) {
    console.warn("[audit] Mistral failed, fallback Gemini:", err instanceof Error ? err.message : String(err));
    return { text: await callGemini(system, userMsg), source: "gemini" };
  }
}

function parseJson(text: string): any {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Réponse LLM non parsable en JSON");
  }
}

// ─── Contrôles déterministes ────────────────────────────────────────────────

const BANNED_CHARS = /[()@\[\]{}<>\\*_~|]/g;

type Deterministic = {
  length: number;
  lengthOk: boolean;
  bannedChars: string[];
  dashes: boolean;
  paragraphs: number;
  hookLength: number;
  hookIsSingleLine: boolean;
  aerationOk: boolean;
};

function runDeterministicChecks(text: string): Deterministic {
  const banned = Array.from(new Set(text.match(BANNED_CHARS) ?? []));
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const firstLine = (text.split("\n")[0] ?? "").trim();
  const longParagraphs = paragraphs.filter((p) => p.length > 300).length;
  return {
    length: text.length,
    lengthOk: text.length >= 1000 && text.length <= 1500,
    bannedChars: banned,
    dashes: /[—–]/.test(text) || /\s-\s/.test(text),
    paragraphs: paragraphs.length,
    hookLength: firstLine.length,
    hookIsSingleLine: firstLine.length > 0 && firstLine.length <= 220,
    aerationOk: paragraphs.length >= 6 && longParagraphs === 0,
  };
}

// Score composite /100 : 40 pts déterministes + 60 pts éditoriaux (LLM).
function computeCompositeScore(
  checks: Deterministic,
  hookScore: number,
  impressionsScore: number,
  contentScore: number,
  factualScore: number,
): { total: number; breakdown: Record<string, number> } {
  const breakdown = {
    length: checks.lengthOk ? 10 : 0,
    chars: !checks.dashes && checks.bannedChars.length === 0 ? 10 : 0,
    aeration: checks.aerationOk ? 10 : 0,
    hook_form: checks.hookIsSingleLine ? 10 : 0,
    hook_quality: Math.round(hookScore * 3),        // /30
    impressions: Math.round(impressionsScore * 2),  // /20
    content: Math.round(contentScore / 2),          // /5
    factual: Math.round(factualScore / 2),          // /5
  };
  const total = Math.max(0, Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0)));
  return { total, breakdown };
}

// ─── Contexte documentaire technique ───────────────────────────────────────
// Copie de docs/BACKEND.md + docs/FRONTEND.md générée par
// scripts/generate-linkedin-docs-context.cjs. Sert de référentiel de vérité :
// toute affirmation technique du post doit y être vérifiable.

const DOC_KEYWORDS: Record<string, string[]> = {
  simulateur: ["simulateur", "barème", "ik", "calcul", "indemnité", "cv fiscaux"],
  "mode-tournee": ["tournée", "tour", "gps", "géolocalisation", "haversine", "distance matrix", "stop"],
  "import-takeout": ["takeout", "recovery", "import", "wizard", "historique"],
  "sync-calendrier": ["calendar", "calendrier", "sync-calendar-trips", "google calendar", "outlook", "oauth"],
  "detection-plaque": ["plaque", "vehicle-lookup", "immatriculation", "véhicule", "carburant"],
  "bareme-progressif": ["barème", "tranche", "5 000", "20 000", "calcul", "ik"],
  "bonus-electrique": ["électrique", "bonus", "20%", "multiplicateur", "véhicule"],
  "export-pdf": ["pdf", "export", "relevé", "rapport", "print", "comptable"],
  "gratuit-a-vie": ["architecture", "coût", "edge function", "supabase", "infrastructure"],
  confidentialite: ["rls", "policy", "sécurité", "rgpd", "données", "suppression"],
  comparatif: ["architecture", "fonctionnalité", "gps", "confidentialité", "coût"],
  "trajets-recurrents": ["récurrent", "recurring", "generate-recurring-trips", "cron", "trajet"],
};

function normalizeForMatch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Sélection par score de mots-clés : slug du topic + mots longs du titre + mots
// longs du texte audité (le post peut évoquer un module voisin).
function docContextForAudit(
  slug: string | null,
  title: string | null,
  text: string,
  maxChars = 4500,
): string {
  const fromText = Array.from(new Set(
    text.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 7),
  )).slice(0, 40);
  const keys = [
    ...(slug ? DOC_KEYWORDS[slug] ?? [] : []),
    ...((title ?? "").split(/\s+/).filter((w) => w.length > 5)),
    ...fromText,
  ].map(normalizeForMatch);
  if (!keys.length) return "";

  const scored = DOC_SECTIONS.map((section) => {
    const heading = normalizeForMatch(section.heading);
    const body = normalizeForMatch(section.body);
    let score = 0;
    for (const k of keys) {
      if (heading.includes(k)) score += 3;
      if (body.includes(k)) score += 1;
    }
    return { section, score };
  })
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  let out = "";
  for (const { section } of scored) {
    const block = `### ${section.heading} (doc ${section.origin})\n${section.body}\n\n`;
    if (out.length + block.length > maxChars) break;
    out += block;
  }
  return out.trim();
}

// ─── Prompt d'audit ─────────────────────────────────────────────────────────




const AUDIT_SYSTEM = `Tu es directeur éditorial LinkedIn pour IKtracker, application française de suivi des indemnités kilométriques. Tu audites un post DÉJÀ PUBLIÉ par le fondateur, puis tu le réécris si nécessaire.

RÈGLES DE RÉDACTION À FAIRE RESPECTER
1. HOOK (priorité absolue) : la première ligne est isolée, fait moins de 220 signes, et se suffit à elle même. Elle doit donner une information concrète et vérifiable sur le produit, poser un écart de connaissance ou un chiffre précis. Interdits : question rhétorique creuse, formule de coach, "Et si…", "Saviez vous", émoji, majuscules d'insistance, promesse vague.
2. IMPRESSIONS : les 3 premières lignes doivent tenir avant la coupure "voir plus" du fil et donner envie de déplier. Pas de lien externe ni de hashtag dans les 3 premières lignes. Aération forte : un paragraphe = 2 phrases maximum, ligne vide entre chaque paragraphe, au moins 6 paragraphes.
3. ANGLE 100% PRODUIT : on décrit un module IKtracker et son fonctionnement réel. Interdits : personas, témoignages, storytelling sur les galères des utilisateurs, leçons de vie, chute inspirante.
4. PRÉCISION TECHNIQUE : au moins trois faits techniques concrets (barème progressif 5 000 / 20 000 km, bonus 20% électrique, détection d'arrêt 2 min, synchronisation agenda, export PDF, API partenaire, etc.), sans jargon d'ingénieur.
5. FORME : entre 1000 et 1500 signes espaces compris. Aucun tiret d'incise. Caractères strictement interdits : parenthèses, arobase, crochets, accolades, chevrons, antislash, astérisque, tiret bas, tilde, barre verticale.
6. TON : pragmatique, factuel, entrepreneur français. Pas d'emoji, pas de superlatif marketing.

SORTIE : un objet JSON strict, sans texte autour :
{
  "hook_score": 0-10,
  "impressions_score": 0-10,
  "content_score": 0-10,
  "verdict": "conforme" | "a_corriger",
  "issues": ["problème 1", "problème 2"],
  "hook_analysis": "une phrase",
  "improved_text": "le post réécrit complet, prêt à publier, respectant TOUTES les règles"
}
"content_score" note l'angle 100% produit et la précision technique. Le score global est recalculé côté serveur, ne le renvoie pas.
"improved_text" est OBLIGATOIRE même si le post est conforme : dans ce cas renvoie le texte d'origine inchangé. Le texte réécrit conserve le sujet, le module traité et les faits du post d'origine ; tu améliores le hook, l'aération et la précision, tu ne changes pas de sujet.`;

// ─── Entrypoint ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const forcedPostId = url.searchParams.get("post_id");
  const minAgeMin = Number(url.searchParams.get("min_age_min") ?? "5");

  // Auth : cron secret OU JWT admin
  const cronSecret = Deno.env.get("CRON_SECRET");
  const altCronSecret = Deno.env.get("SYNC_CRON_TOKEN");
  const xCronSecret = req.headers.get("x-cron-secret");
  const isCron = !!xCronSecret && (
    (cronSecret && xCronSecret === cronSecret) ||
    (altCronSecret && xCronSecret === altCronSecret)
  );

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
    const { data, error } = await supabaseAuthed.auth.getUser(authHeader.replace("Bearer ", ""));
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

  try {
    // 1) Sélection du post à auditer
    let query = admin
      .from("linkedin_post_log")
      .select("id, topic_slug, topic_title, post_text, linkedin_post_id, linkedin_asset_urn, media_type, posted_at, audit_status, audit_attempts, audit_report")
      .eq("status", "success")
      .not("linkedin_post_id", "is", null)
      .order("posted_at", { ascending: false })
      .limit(1);

    if (forcedPostId) {
      query = query.eq("linkedin_post_id", forcedPostId);
    } else {
      const maxPosted = new Date(Date.now() - minAgeMin * 60 * 1000).toISOString();
      const minPosted = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query
        .is("audit_status", null)
        .lte("posted_at", maxPosted)
        .gte("posted_at", minPosted);
    }

    const { data: run, error: runErr } = await query.maybeSingle();
    if (runErr) throw new Error(runErr.message);
    if (!run) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "aucun post à auditer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const postId = String(run.linkedin_post_id);
    const attempts = Number(run.audit_attempts ?? 0);

    // 2) Lecture du texte réellement publié
    const publishedText = (await fetchPublishedText(postId)) ?? String(run.post_text ?? "");
    if (publishedText.length < 50) throw new Error("Texte publié introuvable ou trop court");

    const engagement = await fetchEarlyEngagement(postId);
    const checks = runDeterministicChecks(publishedText);

    // 3) Audit LLM
    const userMsg = [
      `Post publié il y a ${minAgeMin} minutes environ.`,
      `Sujet du run : ${run.topic_title ?? "inconnu"} (module ${run.topic_slug ?? "n/a"}).`,
      `Média attaché : ${run.media_type ?? "aucun"}.`,
      engagement
        ? `Engagement précoce : ${engagement.likes} réactions, ${engagement.comments} commentaires.`
        : "Engagement précoce non disponible.",
      "",
      "Contrôles automatiques déjà effectués :",
      JSON.stringify(checks, null, 2),
      "",
      "TEXTE PUBLIÉ :",
      "---",
      publishedText,
      "---",
      "",
      "Audite ce post et renvoie le JSON demandé.",
    ].join("\n");

    const { text: rawAudit, source: auditSource } = await callLLM(AUDIT_SYSTEM, userMsg);
    const audit = parseJson(rawAudit);

    const hookScore = Math.max(0, Math.min(10, Number(audit.hook_score ?? 0)));
    const impressionsScore = Math.max(0, Math.min(10, Number(audit.impressions_score ?? 0)));
    const contentScore = Math.max(0, Math.min(10, Number(audit.content_score ?? audit.score ?? 0) || 0));
    const improvedText = String(audit.improved_text ?? "").trim();

    const { total: score, breakdown } = computeCompositeScore(
      checks, hookScore, impressionsScore, contentScore,
    );

    const hardFail =
      !checks.lengthOk || checks.bannedChars.length > 0 || checks.dashes || !checks.aerationOk || !checks.hookIsSingleLine;

    // Score de l'itération précédente dans la même lignée de post.
    const previousScore = Number((run.audit_report as any)?.previous_score ?? NaN);
    const gain = Number.isFinite(previousScore) ? score - previousScore : null;

    // Conditions d'arrêt de la boucle.
    const meetsTarget = !hardFail && score >= SCORE_THRESHOLD && hookScore >= HOOK_THRESHOLD;
    const maxedOut = attempts >= MAX_ATTEMPTS;
    const plateau = gain !== null && gain < MIN_GAIN;

    // Le texte réécrit doit lui même passer les contrôles déterministes.
    const improvedChecks = improvedText ? runDeterministicChecks(improvedText) : null;
    const improvedIsValid = !!improvedChecks &&
      improvedChecks.lengthOk &&
      improvedChecks.bannedChars.length === 0 &&
      !improvedChecks.dashes &&
      improvedChecks.aerationOk &&
      improvedChecks.hookIsSingleLine &&
      improvedText !== publishedText;

    const needsFix = !meetsTarget && !maxedOut && !plateau && improvedIsValid;

    const report = {
      source: auditSource,
      score,
      score_breakdown: breakdown,
      hook_score: hookScore,
      impressions_score: impressionsScore,
      content_score: contentScore,
      iteration: attempts + 1,
      previous_score: Number.isFinite(previousScore) ? previousScore : null,
      gain,
      thresholds: { score: SCORE_THRESHOLD, hook: HOOK_THRESHOLD, max_attempts: MAX_ATTEMPTS, min_gain: MIN_GAIN },
      verdict: meetsTarget ? "conforme" : "a_corriger",
      issues: Array.isArray(audit.issues) ? audit.issues.slice(0, 10) : [],
      hook_analysis: String(audit.hook_analysis ?? "").slice(0, 500),
      deterministic: checks,
      improved_deterministic: improvedChecks,
      engagement,
      audited_text: publishedText,
      improved_text: improvedText.slice(0, 4000),
      hard_fail: hardFail,
      dry_run: dryRun,
    };

    console.log(
      `[audit] post=${postId} iter=${attempts + 1} score=${score} hook=${hookScore} gain=${gain} needsFix=${needsFix} target=${meetsTarget} plateau=${plateau} maxed=${maxedOut}`,
    );

    // 4) Correction : suppression + republication avec le même média
    let repostResult: Record<string, unknown> | null = null;
    let auditStatus: string;
    if (meetsTarget) auditStatus = "passed";
    else if (maxedOut) auditStatus = "max_attempts";
    else if (plateau) auditStatus = "plateau";
    else if (!improvedIsValid) auditStatus = "fix_invalid";
    else auditStatus = "corrected";

    if (needsFix && !dryRun) {
      const repostUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/linkedin-weekly-post?mode=repost`;
      const res = await fetch(repostUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": xCronSecret ?? Deno.env.get("CRON_SECRET") ?? "",
        },
        body: JSON.stringify({
          post_id: postId,
          text: improvedText,
          asset_urn: run.linkedin_asset_urn ?? undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      repostResult = body;
      if (!res.ok || body?.ok === false) {
        auditStatus = "fix_failed";
        console.error(`[audit] repost échoué ${res.status}:`, JSON.stringify(body).slice(0, 400));
      } else if (body?.post_id) {
        // Le nouveau run est journalisé par linkedin-weekly-post. On le laisse
        // éligible à un nouvel audit (audit_status null) en propageant le
        // compteur d'itérations et le score précédent : la boucle continue
        // jusqu'au seuil, au plateau ou au maximum d'itérations.
        await admin
          .from("linkedin_post_log")
          .update({
            audit_status: null,
            audit_attempts: attempts + 1,
            audit_report: {
              pending_reaudit: true,
              previous_score: score,
              previous_hook_score: hookScore,
              replaces_post_id: postId,
              iteration: attempts + 1,
            },
          })
          .eq("linkedin_post_id", body.post_id);
      }
    } else if (needsFix && dryRun) {
      auditStatus = "would_fix";
    }

    await admin
      .from("linkedin_post_log")
      .update({
        audit_status: auditStatus,
        audit_score: score,
        audit_hook_score: hookScore,
        audited_at: new Date().toISOString(),
        audit_attempts: attempts + 1,
        audit_report: report,
      })
      .eq("id", run.id);


    return new Response(
      JSON.stringify({
        ok: true,
        post_id: postId,
        audit_status: auditStatus,
        iteration: attempts + 1,
        score,
        score_breakdown: breakdown,
        hook_score: hookScore,
        impressions_score: impressionsScore,
        content_score: contentScore,
        gain,
        issues: report.issues,
        needs_fix: needsFix,
        repost: repostResult,

      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[audit] failed:", message);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
