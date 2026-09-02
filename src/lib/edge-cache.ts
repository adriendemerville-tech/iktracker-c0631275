/**
 * Cache HTML « edge-friendly » pour les pages publiques.
 *
 * Contexte : le Worker Cloudflare de la zone client n'est pas invoqué
 * (routage custom-hostname Lovable, ticket support en cours). Tant que le
 * trafic ne traverse pas notre zone, la seule façon de faire baisser le TTFB
 * prod est de rendre les réponses HTML anonymes cacheables par le CDN amont
 * (`s-maxage` + `stale-while-revalidate`), sans jamais toucher aux réponses
 * authentifiées.
 */

/** Préfixes strictement privés / personnalisés : jamais de cache partagé. */
const PRIVATE_PREFIXES = [
  "/app",
  "/admin",
  "/auth",
  "/api",
  "/_serverFn",
  "/sso",
  "/unsubscribe",
  "/marina",
];

/** Cookies indiquant une session (Supabase) : réponse personnalisée. */
function hasSessionCookie(request: Request): boolean {
  const cookie = request.headers.get("cookie");
  if (!cookie) return false;
  return /(^|;\s*)sb-[^=]*-auth-token/i.test(cookie) || /(^|;\s*)sb-access-token/i.test(cookie);
}

function isPublicPath(pathname: string): boolean {
  return !PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Applique un Cache-Control partagé aux pages HTML publiques anonymes.
 * Les réponses authentifiées, non-GET, non-200 ou non-HTML sont laissées
 * intactes (et explicitement marquées `private, no-store` si session).
 */
export function applyPublicHtmlCache(request: Request, response: Response): Response {
  if (request.method !== "GET") return response;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  // Ne jamais écraser une politique déjà posée explicitement par une route.
  if (response.headers.get("x-cache-policy")) return response;

  const { pathname } = new URL(request.url);

  if (hasSessionCookie(request) || !isPublicPath(pathname)) {
    const headers = new Headers(response.headers);
    headers.set("cache-control", "private, no-store");
    headers.set("x-cache-policy", "private");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  if (response.status !== 200) return response;

  const headers = new Headers(response.headers);
  // 5 min de fraîcheur CDN, 24 h de service en stale pendant la revalidation.
  // `max-age=0` : le navigateur revalide toujours, seul le cache partagé sert.
  headers.set(
    "cache-control",
    "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
  );
  headers.set("x-cache-policy", "public-html");
  headers.append("vary", "Cookie");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
