// Edge function: test how various AI bots see a given URL.
// Fetches the URL with each bot User-Agent and returns rendering signals.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_BOTS: Record<string, string> = {
  GPTBot: 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
  CCBot: 'CCBot/2.0 (https://commoncrawl.org/faq/)',
  'Google-Extended': 'Mozilla/5.0 (compatible; Google-Extended/1.0; +http://www.google.com/bot.html)',
  ClaudeBot: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'Applebot-Extended': 'Mozilla/5.0 (compatible; Applebot-Extended/1.0; +http://www.apple.com/go/applebot)',
  PerplexityBot: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://www.perplexity.ai/perplexitybot)',
};

interface BotResult {
  bot: string;
  status: number;
  ok: boolean;
  contentLength: number;
  renderedBy: string | null;
  prerendered: boolean;
  hasH1: boolean;
  h1?: string;
  title?: string;
  metaDescription?: string;
  jsonLdCount: number;
  bodyTextLength: number;
  isSpaShell: boolean;
  durationMs: number;
  error?: string;
}

async function testBot(url: string, botName: string, ua: string): Promise<BotResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    const html = await res.text();
    const renderedBy = res.headers.get('x-rendered-by');
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const jsonLd = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/gi) || [];
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyText = bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

    // SPA shell heuristic: very short body text + has root div + no meaningful h1
    const isSpaShell = bodyText.length < 200 && /<div\s+id=["']root["']/.test(html);

    return {
      bot: botName,
      status: res.status,
      ok: res.ok,
      contentLength: html.length,
      renderedBy,
      prerendered: renderedBy === 'cloudflare-worker' || renderedBy === 'meta-renderer',
      hasH1: !!h1Match,
      h1: h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim().slice(0, 200) : undefined,
      title: titleMatch ? titleMatch[1].trim().slice(0, 200) : undefined,
      metaDescription: descMatch ? descMatch[1].trim().slice(0, 250) : undefined,
      jsonLdCount: jsonLd.length,
      bodyTextLength: bodyText.length,
      isSpaShell,
      durationMs: Date.now() - start,
    };
  } catch (e) {
    return {
      bot: botName,
      status: 0,
      ok: false,
      contentLength: 0,
      renderedBy: null,
      prerendered: false,
      hasH1: false,
      jsonLdCount: 0,
      bodyTextLength: 0,
      isSpaShell: false,
      durationMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url, bots } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'url required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'invalid url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!/^https?:$/.test(target.protocol)) {
      return new Response(JSON.stringify({ error: 'http(s) only' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const selected: [string, string][] = Array.isArray(bots) && bots.length
      ? bots.filter((b: string) => DEFAULT_BOTS[b]).map((b: string) => [b, DEFAULT_BOTS[b]])
      : Object.entries(DEFAULT_BOTS);

    const results = await Promise.all(selected.map(([name, ua]) => testBot(target.toString(), name, ua)));

    return new Response(JSON.stringify({ url: target.toString(), testedAt: new Date().toISOString(), results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
