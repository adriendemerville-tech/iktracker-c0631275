/**
 * Cloudflare Worker — iktracker-bot-router
 * 1. Bot pre-rendering → Supabase meta-renderer
 * 2. iktracker.com → 301 redirect to iktracker.fr
 * 3. Logpush maison → envoie chaque requête à crawlers.fr en temps réel
 */

// ─── Configuration ───────────────────────────────────────────────────────────

const LOGPUSH_ENDPOINT = "https://crawlers.fr/api/logs";

// Origine réelle (hébergement Lovable). En configuration "Worker Custom Domain",
// le Worker EST l'origine de iktracker.fr : tout fetch(request) tel quel boucherait
// sur lui-même. On réécrit donc systématiquement l'hôte vers l'origine Lovable.
const ORIGIN_HOST = "iktracker.lovable.app";

const SUPABASE_META_RENDERER =
  "https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/meta-renderer";
// >>> BLOG_REDIRECTS:GENERATED — ne pas éditer à la main
const BLOG_LEGACY_REDIRECTS = {
  "/blog/7-erreurs-courantes-d-indemnite-kilometrique-a-eviter-absolument-pour-neutralise": "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "/blog/7-etapes-du-calcul-indemnite-frais-kilometriques": "/indemnites-kilometriques",
  "/blog/anticiper-2026-securiser-et-maximiser-ses-indemnites-kilometriques-face-au-durci": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/bareme-ik-2026-changements": "/bareme-ik-2026",
  "/blog/bareme-indemnites-kilometriques-2026-iktracker": "/bareme-ik-2026",
  "/blog/calcul-des-indemnites-kilometriques-2026-le-guide-complet-pour-un-suivi-conforme": "/indemnites-kilometriques",
  "/blog/calcul-des-indemnites-kilometriques-2026-optimisez-vos-deplacements-professionne": "/indemnites-kilometriques",
  "/blog/calcul-des-indemnites-kilometriques-le-guide-complet-pour-les-professionnels-mob": "/indemnites-kilometriques",
  "/blog/calcul-des-indemnites-kilometriques-optimisez-vos-deplacements-pro-sans-risque-d": "/indemnites-kilometriques",
  "/blog/calcul-des-indemnites-kilometriques-optimisez-vos-deplacements-professionnels": "/indemnites-kilometriques",
  "/blog/calcul-des-indemnites-optimisez-vos-deplacements-pro-avec-un-suivi-kilometrique-": "/indemnites-kilometriques",
  "/blog/calcul-des-indemnites-optimisez-vos-deplacements-pro-et-securisez-vos-remboursem": "/indemnites-kilometriques",
  "/blog/calcul-des-indemnites-optimisez-vos-deplacements-pro-grace-aux-secrets-des-exper": "/indemnites-kilometriques",
  "/blog/calculer-indemnites-kilometriques-2026-guide": "/indemnites-kilometriques",
  "/blog/comment-calculer-frais-kilometriques-remboursement": "/indemnites-kilometriques",
  "/blog/comment-optimiser-ses-frais-auto-sans-risque-guide-de-conformite-urssaf-et-autom": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/comment-optimiser-ses-frais-pro-auto-en-respectant-le-bareme-urssaf-sans-perdre-": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/comment-optimiser-ses-frais-pro-auto-en-s-alignant-sur-le-bareme-urssaf": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/comment-transformer-votre-suivi-kilometrique-2026-en-bouclier-anti-redressement-": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/dossier-ik-2026-l-art-de-blinder-son-suivi-kilometrique-contre-les-controles-urs": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/dossier-ik-2026-les-7-regles-d-or-d-un-suivi-kilometrique-conforme-anti-redresse": "/blog/controle-urssaf-liste-des-pieces-a-fournir",
  "/blog/etapes-declaration-fiscale-kilometrage-guide": "/blog/declaration-2042-ou-reporter-ses-indemnites-kilometriques",
  "/blog/etapes-rapport-kilometrique": "/indemnites-kilometriques",
  "/blog/frais-auto-et-urssaf-optimiser-ses-remboursements-sans-risquer-le-redressement-f": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/frais-reels-ou-abattement-forfaitaire-simulation-2026": "/blog/frais-reels-ou-abattement-choisir",
  "/blog/frais-reels-ou-forfait-guide-independants-2026": "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "/blog/frais-reels-ou-forfait-independants-impots-2026": "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "/blog/frais-reels-vs-forfait": "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "/blog/frais-reels-vs-forfait-guide-complet": "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "/blog/frais-reels-vs-forfait-guide-optimisation-impots": "/blog/seuil-rentabilite-frais-reels-kilometrage-annuel",
  "/blog/iktracker-nouveautes-2026": "/blog/iktracker-2026-nouveautes-tendances",
  "/blog/indemnite-kilometrique-2026-les-7-regles-d-or-d-un-suivi-conforme-face-aux-contr": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/indemnite-kilometrique-comment-eviter-le-redressement-urssaf-lors-d-un-controle": "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "/blog/indemnite-kilometrique-comment-eviter-un-redressement-urssaf-en-2026": "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "/blog/indemnite-kilometrique-comment-securiser-votre-suivi-et-eviter-un-redressement-u": "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "/blog/indemnite-kilometrique-desamorcez-les-7-erreurs-qui-declenchent-un-redressement-": "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "/blog/indemnite-kilometrique-eviter-le-controle-urssaf-en-securisant-vos-declarations": "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "/blog/indemnite-kilometrique-evitez-le-redressement-urssaf-en-maitrisant-les-7-regles-": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/indemnites-kilometriques-en-2026-comment-securiser-vos-remboursements-face-a-l-u": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/liste-des-erreurs-frequentes-allocation-kilometrique": "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "/blog/maximiser-ses-indemnites-kilometriques-le-guide-pour-une-conformite-sans-faille": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/meilleures-pratiques-suivi-kilometrique-professionnels": "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "/blog/optimisez-vos-deplacements-professionnels-le-guide-complet-pour-vos-indemnites-k": "/indemnites-kilometriques",
  "/blog/precision-calcul-frais-kilometriques-2026": "/indemnites-kilometriques",
  "/blog/regles-suivi-kilometrique-conforme-urssaf": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-et-maximiser-ses-indemnites-kilometriques-guide-complet-de-conformite-": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-ik-2026-le-guide-de-conformite-absolue-pour-dejouer-les-controles-": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-ik-en-2026-le-guide-ultime-anti-redressement-urssaf-pour-les-profe": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-ik-face-a-l-urssaf-en-2026-guide-de-conformite-absolue-pour-eviter": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-2026-le-guide-ultime-du-suivi-kilometrique-conforme-ant": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-2026-conformite-urssaf-et-automatisation-": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-2026-le-guide-anti-redressement-urssaf-qu": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-en-2026-grace-a-une-methode-anti-redresse": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-en-2026-guide-de-conformite-anti-redresse": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-en-2026-guide-de-survie-anti-redressement": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-en-2026-l-arsenal-anti-redressement-urssa": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-en-2026-le-guide-de-conformite-ultime-pou": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-en-2026-le-guide-ultime-anti-redressement": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-en-eliminant-les-erreurs-de-saisie-manuel": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-face-a-l-urssaf-en-2026-la-methodologie-z": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-face-a-l-urssaf-en-eliminant-les-erreurs-": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-indemnites-kilometriques-face-a-l-urssaf-guide-de-conformite-2026": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-remboursements-en-evitant-les-pieges-de-conformite-urssaf-un-audit": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-remboursements-en-evitant-les-pieges-de-l-urssaf-grace-a-un-audit-": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/securiser-ses-remboursements-kilometriques-en-2026-avec-l-automatisation-conform": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/suivi-kilometrique-2026-les-7-regles-d-or-pour-un-dossier-ik-conforme-et-anti-re": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/suivi-kilometrique-conforme-2026-le-dossier-ik-qui-elimine-tout-risque-de-redres": "/blog/controle-urssaf-frais-kilometriques-2026",
  "/blog/suivi-kilometrique-les-7-astuces-des-professionnels-pour-eviter-un-redressement-": "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
};
// <<< BLOG_REDIRECTS:GENERATED

const SUPABASE_SITEMAP = "https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/sitemap";

const BOT_PATTERNS = [
  "googlebot",
  "bingbot",
  "yandex",
  "duckduckbot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "slackbot",
  "telegrambot",
  "discordbot",
  "pinterest",
  "applebot",
  "redditbot",
  "embedly",
  "quora",
  "ia_archiver",
  "rogerbot",
  "showyoubot",
  "outbrain",
  "vkshare",
  "w3c_validator",
  "screaming frog",
  "ahrefs",
  "semrush",
  "mj12bot",
  "dotbot",
  "petalbot",
  "bytespider",
  // AI agents
  "gptbot",
  "chatgpt-user",
  "chatgpt operator",
  "oai-searchbot",
  "google-extended",
  "google-agent",
  "claudebot",
  "claude-user",
  "claude-searchbot",
  "anthropic-ai",
  "perplexitybot",
  "perplexity-user",
  "applebot-extended",
  "mistralai-user",
  "cohere-ai",
  "youbot",
  "ccbot",
  "meta-externalagent",
  "meta-externalfetcher",
  "amazonbot",
  // Audit
  "crawlers.fr",
];

const STATIC_EXTENSIONS = [
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".svg",
  ".ico",
  ".woff2",
  ".woff",
  ".ttf",
  ".json",
  ".xml",
  ".txt",
  ".webmanifest",
  ".map",
  ".mp4",
  ".mp3",
  ".pdf",
];

const PRIVATE_PREFIXES = ["/app", "/admin", "/api", "/auth"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isBot(ua) {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some((p) => lower.includes(p));
}

function isStaticAsset(path) {
  return STATIC_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function isPrivateRoute(path) {
  return PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Paramètres de tracking qui ne changent pas le HTML servi : retirés de la clé
// de cache edge pour maximiser le hit ratio.
const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
];

// Clé de cache normalisée sur l'origine Lovable (évite toute collision inter-zones).
function htmlCacheKey(request) {
  const url = new URL(request.url);
  url.hostname = ORIGIN_HOST;
  url.protocol = "https:";
  url.port = "";
  for (const p of TRACKING_PARAMS) url.searchParams.delete(p);
  url.searchParams.sort();
  return new Request(url.toString(), { method: "GET" });
}

// Requête vers l'origine Lovable (évite la boucle en Worker Custom Domain)
async function fetchOrigin(request) {
  const incoming = new URL(request.url);
  const url = new URL(request.url);
  url.hostname = ORIGIN_HOST;
  url.protocol = "https:";
  url.port = "";
  const req = new Request(url.toString(), request);
  req.headers.set("X-Forwarded-Host", incoming.hostname);
  const res = await fetch(req, { redirect: "manual" });

  // Garde-fou anti-boucle : si l'origine renvoie une redirection vers notre propre
  // domaine (cas où iktracker.fr est encore déclaré comme domaine principal côté
  // hébergeur), on ne la suit pas — sinon la requête revient dans ce Worker.
  const loc = res.headers.get("location") || "";
  if (res.status >= 300 && res.status < 400 && loc.includes(incoming.hostname)) {
    return new Response(
      "Origin redirect loop detected. Remove iktracker.fr from the hosting provider custom domains.",
      { status: 503, headers: { "Content-Type": "text/plain", "Retry-After": "60" } },
    );
  }
  return res;
}

// ─── Logpush ─────────────────────────────────────────────────────────────────

async function sendLog(request, response, botDetected) {
  try {
    const url = new URL(request.url);
    const cf = request.cf || {};

    const payload = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      host: url.hostname,
      path: url.pathname,
      query: url.search || null,
      user_agent: request.headers.get("user-agent") || "",
      ip: request.headers.get("cf-connecting-ip") || "",
      status: response ? response.status : null,
      bot: botDetected,
      country: cf.country || null,
      city: cf.city || null,
      region: cf.region || null,
      asn: cf.asn || null,
      colo: cf.colo || null,
      referer: request.headers.get("referer") || null,
      accept_language: request.headers.get("accept-language") || null,
    };

    await fetch(LOGPUSH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Ne jamais bloquer la réponse utilisateur
  }
}

// ─── Main handler ────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const path = url.pathname;
    const ua = request.headers.get("user-agent") || "";
    const botDetected = isBot(ua);

    // Marqueur de version (diagnostic) — prouve que le Worker tourne en prod.
    if (request.headers.get("x-worker-ping") === "1") {
      return new Response("worker-alive v2026-09-01-ttfb-fix", {
        headers: { "X-Rendered-By": "cloudflare-worker" },
      });
    }

    // ── 1. www.iktracker.fr → 301 vers apex iktracker.fr (host canonique) ──
    // Élimine tout signal de duplication www/apex pour Google et les LLMs.
    if (hostname === "www.iktracker.fr") {
      const redirectUrl = `https://iktracker.fr${path}${url.search}`;
      const response = Response.redirect(redirectUrl, 301);
      ctx.waitUntil(sendLog(request, response, botDetected));
      return response;
    }

    // ── 2. iktracker.com → redirect 301 vers .fr ──
    if (hostname === "iktracker.com" || hostname === "www.iktracker.com") {
      // Servir robots.txt et llms.txt directement depuis .fr
      if (path === "/robots.txt" || path === "/llms.txt") {
        const proxyUrl = `https://iktracker.fr${path}`;
        const proxyRes = await fetch(proxyUrl);
        const response = new Response(proxyRes.body, {
          status: proxyRes.status,
          headers: {
            "Content-Type": proxyRes.headers.get("Content-Type") || "text/plain",
            "Cache-Control": "public, max-age=3600",
            "X-Rendered-By": "cloudflare-worker",
          },
        });
        ctx.waitUntil(sendLog(request, response, botDetected));
        return response;
      }

      // Tout le reste → 301
      const redirectUrl = `https://iktracker.fr${path}${url.search}`;
      const response = Response.redirect(redirectUrl, 301);
      ctx.waitUntil(sendLog(request, response, botDetected));
      return response;
    }

    // ── 2b. Anciennes URLs (backlinks externes, brouillons sitemap) → 301 vers équivalent actuel ──
    // Récupère le jus SEO résiduel + supprime les "noindex" hérités de NotFound.
    const LEGACY_REDIRECTS = {
      "/guide-complet-indemnites-kilometriques-frais-reels":
        "/blog/indemnites-kilometriques-2026-guide-complet",
      "/fonctionnalites/suivi-kilometrique-automatique": "/mode-tournee",
      "/comment-remplir-sa-declaration": "/note-de-frais-kilometrique",
      "/synchronisation-calendrier-iktracker": "/calendrier",
      "/nos-offres": "/tarifs",
      "/simulateur": "/bareme-ik-2026",
      "/blog/7-etapes-du-calcul-indemnite-frais-kilometriques": "/indemnites-kilometriques",
      "/deduction-frais-reels": "/frais-reels",
      "/vehicules-electriques": "/bareme-ik-2026#vehicules-electriques",
      "/install": "/installer",
      "/mestrajets": "/mes-trajets",
      "/experts-comptables": "/expert-comptable",
      ...BLOG_LEGACY_REDIRECTS,
    };
    if (LEGACY_REDIRECTS[path]) {
      const redirectUrl = `https://iktracker.fr${LEGACY_REDIRECTS[path]}${url.search}`;
      const response = Response.redirect(redirectUrl, 301);
      ctx.waitUntil(sendLog(request, response, botDetected));
      return response;
    }

    // ── 2a. /sitemap.xml → route SSR de l'origine (source de vérité unique),
    //        fallback fichier statique. Plus de proxy vers l'Edge Function.
    if (path === "/sitemap.xml") {
      try {
        const sitemapRes = await fetchOrigin(request);
        if (sitemapRes.ok) {
          const xml = await sitemapRes.text();
          const response = new Response(xml, {
            status: 200,
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=300, s-maxage=300",
              "X-Rendered-By": "cloudflare-worker",
              "X-Sitemap-Source": "ssr-route",
            },
          });
          ctx.waitUntil(sendLog(request, response, botDetected));
          return response;
        }
      } catch (e) {
        // Fallback vers le fichier statique
      }


      // Ultime fallback : retourner une 503 explicite
      const errResponse = new Response("Sitemap temporarily unavailable", {
        status: 503,
        headers: {
          "Content-Type": "text/plain",
          "Retry-After": "300",
          "X-Rendered-By": "cloudflare-worker",
          "X-Sitemap-Source": "error",
        },
      });
      ctx.waitUntil(sendLog(request, errResponse, botDetected));
      return errResponse;
    }

    // ── 2b. iktracker.fr — assets statiques → passthrough + cache headers ──
    if (isStaticAsset(path)) {
      const originResponse = await fetchOrigin(request);
      const isHashedAsset = path.startsWith("/assets/");
      // Long-lived immutable cache for static media/fonts (rarely change, names are stable)
      // Hashed bundle assets stay immutable 1y. Everything else (sw.js handled elsewhere) 1y too,
      // since these files are versioned via deploy and PageSpeed flags <1y as inefficient.
      const isLongLived =
        isHashedAsset || /\.(webp|png|jpg|jpeg|svg|ico|woff2?|ttf|avif|gif)$/i.test(path);
      const cacheControl = isLongLived
        ? "public, max-age=31536000, immutable"
        : "public, max-age=86400";
      const response = new Response(originResponse.body, {
        status: originResponse.status,
        headers: {
          ...Object.fromEntries(originResponse.headers.entries()),
          "Cache-Control": cacheControl,
          "X-Rendered-By": "cloudflare-worker",
        },
      });
      ctx.waitUntil(sendLog(request, response, botDetected));
      return response;
    }

    // ── 3. Routes privées → passthrough ──
    if (isPrivateRoute(path)) {
      const response = await fetchOrigin(request);
      ctx.waitUntil(sendLog(request, response, botDetected));
      return response;
    }

    // ── 4. Bot détecté → pre-rendering via meta-renderer ──
    if (botDetected) {
      try {
        const metaUrl = `${SUPABASE_META_RENDERER}?path=${encodeURIComponent(path)}`;
        const metaRes = await fetch(metaUrl, {
          headers: { "User-Agent": ua },
          redirect: "manual",
        });

        // Le meta-renderer renvoie un 301 pour les slugs de blog consolidés :
        // on le propage tel quel (jamais de soft 404 pour les crawlers).
        if (metaRes.status === 301 || metaRes.status === 308) {
          const location = metaRes.headers.get("location");
          if (location) {
            const response = Response.redirect(location, 301);
            ctx.waitUntil(sendLog(request, response, botDetected));
            return response;
          }
        }

        if (metaRes.ok) {
          const html = await metaRes.text();
          const response = new Response(html, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
              "X-Robots-Tag": "all",
              "X-Rendered-By": "cloudflare-worker",
            },
          });
          ctx.waitUntil(sendLog(request, response, botDetected));
          return response;
        }

        // Chemin inconnu → propager le VRAI 404 du meta-renderer (jamais de
        // soft 404 pour les crawlers : un 200 sur une URL morte gaspille leur
        // budget de crawl et fait citer des pages inexistantes par les LLMs).
        if (metaRes.status === 404) {
          const html = await metaRes.text();
          const response = new Response(html, {
            status: 404,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=300",
              "X-Robots-Tag": "noindex",
              "X-Rendered-By": "cloudflare-worker",
            },
          });
          ctx.waitUntil(sendLog(request, response, botDetected));
          return response;
        }
      } catch (e) {
        // Fallback vers l'origine
      }
    }

    // ── 5. Utilisateur normal → cache edge du HTML public, puis origine ──
    // Chaque hit SSR sur l'origine coûte ~1 s de TTFB. Le HTML des pages
    // publiques est identique pour tout visiteur anonyme : on le met en cache
    // à l'edge (5 min, stale-while-revalidate 1 h) → TTFB quasi nul sur les
    // hits cache, ce qui attaque directement le LCP mobile.
    // Jamais de cache si Cookie/Authorization (session utilisateur) ou si
    // l'origine pose un cookie.
    const isAnon = !request.headers.get("cookie") && !request.headers.get("authorization");
    if (request.method === "GET" && isAnon) {
      const cache = caches.default;
      const cacheKey = htmlCacheKey(request);
      const cached = await cache.match(cacheKey);
      if (cached) {
        const hit = new Response(cached.body, cached);
        hit.headers.set("X-Cache", "HIT");
        ctx.waitUntil(sendLog(request, hit, botDetected));
        return hit;
      }
      const originResponse = await fetchOrigin(request);
      const contentType = originResponse.headers.get("content-type") || "";
      // L'origine passe par le Cloudflare de la plateforme hébergeante, qui
      // ajoute un cookie __cf_bm (Bot Management) sur chaque réponse. Ce n'est
      // PAS un cookie de session applicatif : sans cookie dans la requête,
      // le HTML est identique pour tout visiteur anonyme. On l'ignore donc
      // pour la décision de cache et on le retire de la réponse cachée.
      const setCookies = originResponse.headers.getSetCookie
        ? originResponse.headers.getSetCookie()
        : (originResponse.headers.get("set-cookie") || "").split(/,(?=[^ ;]*=)/);
      const sessionCookies = setCookies.filter(
        (c) => c && !c.trimStart().startsWith("__cf_bm="),
      );
      if (
        originResponse.status === 200 &&
        contentType.includes("text/html") &&
        sessionCookies.length === 0
      ) {
        const headers = new Headers(originResponse.headers);
        headers.delete("set-cookie");
        headers.set(
          "Cache-Control",
          "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
        );
        headers.set("X-Cache", "MISS");
        headers.set("X-Rendered-By", "cloudflare-worker");
        const cachedResponse = new Response(originResponse.body, { status: 200, headers });
        ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
        ctx.waitUntil(sendLog(request, cachedResponse, botDetected));
        return cachedResponse;
      }
      ctx.waitUntil(sendLog(request, originResponse, botDetected));
      return originResponse;
    }

    const response = await fetchOrigin(request);
    ctx.waitUntil(sendLog(request, response, botDetected));
    return response;
  },
};
