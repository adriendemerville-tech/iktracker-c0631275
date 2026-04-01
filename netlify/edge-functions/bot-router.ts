/**
 * Netlify Edge Function — Bot Router
 * Intercepts requests from known bots/crawlers and rewrites them
 * to the Supabase meta-renderer Edge Function for full HTML content.
 * Regular users are unaffected and receive the SPA as usual.
 */

const BOT_PATTERNS = [
  'googlebot', 'bingbot', 'yandex', 'duckduckbot',
  'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp',
  'slackbot', 'telegrambot', 'discordbot', 'pinterest',
  'gptbot', 'chatgpt-user', 'google-extended', 'claude-web',
  'anthropic-ai', 'perplexitybot', 'cohere-ai', 'youbot',
  'applebot', 'redditbot', 'embedly', 'quora',
  'ia_archiver', 'rogerbot', 'showyoubot', 'outbrain', 'vkshare',
  'w3c_validator', 'screaming frog', 'ahrefs', 'semrush', 'mj12bot',
  'dotbot', 'petalbot', 'bytespider',
];

// Pages privées / app → ne pas pré-rendre
const EXCLUDED_PREFIXES = ['/app', '/admin', '/api', '/auth'];
const EXCLUDED_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.webp', '.svg', '.ico', '.woff2', '.woff', '.json', '.xml', '.txt', '.webmanifest'];

const SUPABASE_URL = 'https://yarjaudctshlxkatqgeb.supabase.co';

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Skip static assets
  if (EXCLUDED_EXTENSIONS.some(ext => path.endsWith(ext))) {
    return;
  }

  // Skip private/app routes
  if (EXCLUDED_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return;
  }

  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();

  // Only intercept bots
  const isBot = BOT_PATTERNS.some(pattern => userAgent.includes(pattern));
  if (!isBot) {
    return; // Pass through to SPA
  }

  // Rewrite to meta-renderer
  const metaUrl = `${SUPABASE_URL}/functions/v1/meta-renderer?path=${encodeURIComponent(path)}`;

  try {
    const response = await fetch(metaUrl, {
      headers: {
        'User-Agent': request.headers.get('user-agent') || '',
      },
    });

    if (response.ok) {
      const html = await response.text();
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          'X-Robots-Tag': 'all',
        },
      });
    }
  } catch (e) {
    console.error('Bot router error:', e);
  }

  // On error, fall through to SPA
  return;
}

export const config = {
  path: "/*",
};
