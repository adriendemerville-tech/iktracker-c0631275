/**
 * Cloudflare Worker — iktracker-bot-router
 * 1. Bot pre-rendering → Supabase meta-renderer
 * 2. iktracker.com → 301 redirect to iktracker.fr
 * 3. Logpush maison → envoie chaque requête à crawlers.fr en temps réel
 */

// ─── Configuration ───────────────────────────────────────────────────────────

const LOGPUSH_ENDPOINT = 'https://crawlers.fr/api/logs';

const SUPABASE_META_RENDERER = 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/meta-renderer';
const SUPABASE_SITEMAP = 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/sitemap';

const BOT_PATTERNS = [
  'googlebot', 'bingbot', 'yandex', 'duckduckbot',
  'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp',
  'slackbot', 'telegrambot', 'discordbot', 'pinterest',
  'applebot', 'redditbot', 'embedly', 'quora',
  'ia_archiver', 'rogerbot', 'showyoubot', 'outbrain', 'vkshare',
  'w3c_validator', 'screaming frog', 'ahrefs', 'semrush', 'mj12bot',
  'dotbot', 'petalbot', 'bytespider',
  // AI agents
  'gptbot', 'chatgpt-user', 'chatgpt operator', 'oai-searchbot',
  'google-extended', 'google-agent',
  'claudebot', 'claude-user', 'claude-searchbot', 'anthropic-ai',
  'perplexitybot', 'cohere-ai', 'youbot',
  'ccbot', 'meta-externalagent', 'amazonbot',
  // Audit
  'crawlers.fr',
];

const STATIC_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg',
  '.ico', '.woff2', '.woff', '.ttf', '.json', '.xml', '.txt',
  '.webmanifest', '.map', '.mp4', '.mp3', '.pdf',
];

const PRIVATE_PREFIXES = ['/app', '/admin', '/api', '/auth'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isBot(ua) {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some(p => lower.includes(p));
}

function isStaticAsset(path) {
  return STATIC_EXTENSIONS.some(ext => path.endsWith(ext));
}

function isPrivateRoute(path) {
  return PRIVATE_PREFIXES.some(prefix => path.startsWith(prefix));
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
      user_agent: request.headers.get('user-agent') || '',
      ip: request.headers.get('cf-connecting-ip') || '',
      status: response ? response.status : null,
      bot: botDetected,
      country: cf.country || null,
      city: cf.city || null,
      region: cf.region || null,
      asn: cf.asn || null,
      colo: cf.colo || null,
      referer: request.headers.get('referer') || null,
      accept_language: request.headers.get('accept-language') || null,
    };

    await fetch(LOGPUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const ua = request.headers.get('user-agent') || '';
    const botDetected = isBot(ua);

    // ── 1. www.iktracker.fr → host canonique (l'apex redirige vers www via Cloudflare Redirect Rule).
    // On NE redirige PLUS www → apex car le Worker est bypassé sur l'apex (cross-account
    // Cloudflare → Lovable Publish). www devient l'hôte servant le pre-rendering aux bots.


    // ── 2. iktracker.com → redirect 301 vers .fr ──
    if (hostname === 'iktracker.com' || hostname === 'www.iktracker.com') {
      // Servir robots.txt et llms.txt directement depuis .fr
      if (path === '/robots.txt' || path === '/llms.txt') {
        const proxyUrl = `https://www.iktracker.fr${path}`;
        const proxyRes = await fetch(proxyUrl);
        const response = new Response(proxyRes.body, {
          status: proxyRes.status,
          headers: {
            'Content-Type': proxyRes.headers.get('Content-Type') || 'text/plain',
            'Cache-Control': 'public, max-age=3600',
            'X-Rendered-By': 'cloudflare-worker',
          },
        });
        ctx.waitUntil(sendLog(request, response, botDetected));
        return response;
      }

      // Tout le reste → 301
      const redirectUrl = `https://www.iktracker.fr${path}${url.search}`;
      const response = Response.redirect(redirectUrl, 301);
      ctx.waitUntil(sendLog(request, response, botDetected));
      return response;
    }

    // ── 2a. /sitemap.xml → proxy vers Edge Function dynamique, fallback statique ──
    if (path === '/sitemap.xml') {
      try {
        const sitemapRes = await fetch(SUPABASE_SITEMAP, {
          headers: { 'User-Agent': ua },
        });
        if (sitemapRes.ok) {
          const xml = await sitemapRes.text();
          const response = new Response(xml, {
            status: 200,
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              'Cache-Control': 'public, max-age=300, s-maxage=300',
              'X-Rendered-By': 'cloudflare-worker',
              'X-Sitemap-Source': 'edge-function',
            },
          });
          ctx.waitUntil(sendLog(request, response, botDetected));
          return response;
        }
      } catch (e) {
        // Fallback vers le fichier statique
      }
      // Fallback : servir le fichier statique depuis l'origin
      const fallbackRes = await fetch(request);
      if (fallbackRes.ok) {
        const response = new Response(fallbackRes.body, {
          status: fallbackRes.status,
          headers: {
            ...Object.fromEntries(fallbackRes.headers.entries()),
            'X-Rendered-By': 'cloudflare-worker',
            'X-Sitemap-Source': 'static-fallback',
          },
        });
        ctx.waitUntil(sendLog(request, response, botDetected));
        return response;
      }
      // Ultime fallback : retourner une 503 explicite
      const errResponse = new Response('Sitemap temporarily unavailable', {
        status: 503,
        headers: {
          'Content-Type': 'text/plain',
          'Retry-After': '300',
          'X-Rendered-By': 'cloudflare-worker',
          'X-Sitemap-Source': 'error',
        },
      });
      ctx.waitUntil(sendLog(request, errResponse, botDetected));
      return errResponse;
    }

    // ── 2b. iktracker.fr — assets statiques → passthrough + cache headers ──
    if (isStaticAsset(path)) {
      const originResponse = await fetch(request);
      const isHashedAsset = path.startsWith('/assets/');
      // Long-lived immutable cache for static media/fonts (rarely change, names are stable)
      // Hashed bundle assets stay immutable 1y. Everything else (sw.js handled elsewhere) 1y too,
      // since these files are versioned via deploy and PageSpeed flags <1y as inefficient.
      const isLongLived = isHashedAsset || /\.(webp|png|jpg|jpeg|svg|ico|woff2?|ttf|avif|gif)$/i.test(path);
      const cacheControl = isLongLived
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=86400';
      const response = new Response(originResponse.body, {
        status: originResponse.status,
        headers: {
          ...Object.fromEntries(originResponse.headers.entries()),
          'Cache-Control': cacheControl,
          'X-Rendered-By': 'cloudflare-worker',
        },
      });
      ctx.waitUntil(sendLog(request, response, botDetected));
      return response;
    }

    // ── 3. Routes privées → passthrough ──
    if (isPrivateRoute(path)) {
      const response = await fetch(request);
      ctx.waitUntil(sendLog(request, response, botDetected));
      return response;
    }

    // ── 4. Bot détecté → pre-rendering via meta-renderer ──
    if (botDetected) {
      try {
        const metaUrl = `${SUPABASE_META_RENDERER}?path=${encodeURIComponent(path)}`;
        const metaRes = await fetch(metaUrl, {
          headers: { 'User-Agent': ua },
        });

        if (metaRes.ok) {
          const html = await metaRes.text();
          const response = new Response(html, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=3600, s-maxage=86400',
              'X-Robots-Tag': 'all',
              'X-Rendered-By': 'cloudflare-worker',
            },
          });
          ctx.waitUntil(sendLog(request, response, botDetected));
          return response;
        }
      } catch (e) {
        // Fallback vers l'origine
      }
    }

    // ── 5. Utilisateur normal → passthrough vers l'origine ──
    const response = await fetch(request);
    ctx.waitUntil(sendLog(request, response, botDetected));
    return response;
  },
};
