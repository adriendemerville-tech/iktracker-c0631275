/**
 * Cloudflare Worker — iktracker-log-forwarder
 * Intercepte chaque requête sur iktracker.fr et envoie les métadonnées
 * à crawlers.fr pour analyse (géo, user-agent, bots, etc.)
 * Ne modifie RIEN au trafic — simple passthrough + log asynchrone.
 */

const CRAWLERS_ENDPOINT = 'https://crawlers.fr/api/logs';

export default {
  async fetch(request, env, ctx) {
    // Passthrough immédiat — on ne touche pas à la requête
    const response = await fetch(request);

    // Envoi asynchrone du log (n'ajoute aucune latence)
    ctx.waitUntil(sendLog(request, response));

    return response;
  },
};

async function sendLog(request, response) {
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
      status: response.status,
      country: cf.country || null,
      city: cf.city || null,
      region: cf.region || null,
      asn: cf.asn || null,
      colo: cf.colo || null,
      referer: request.headers.get('referer') || null,
      accept_language: request.headers.get('accept-language') || null,
    };

    await fetch(CRAWLERS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Silencieux — ne jamais bloquer le trafic
  }
}
