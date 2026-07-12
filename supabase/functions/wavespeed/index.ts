// Wavespeed.ai proxy edge function
// - POST /wavespeed { model: "flux-dev/text-to-image", input: {...}, wait?: boolean }
//     -> submits a prediction. If `wait: true`, polls until completion (max ~90s).
// - GET  /wavespeed?request_id=xxx
//     -> returns the current status/result of a prediction.
//
// Docs: https://wavespeed.ai/docs
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const WAVESPEED_API_KEY = Deno.env.get('WAVESPEED_API_KEY');
const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function requireAuth(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: 'Unauthorized' }, 401);
  return { userId: data.user.id };
}

async function submitPrediction(model: string, input: Record<string, unknown>) {
  const res = await fetch(`${WAVESPEED_BASE}/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WAVESPEED_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Wavespeed submit failed [${res.status}]: ${text}`);
    return { ok: false as const, status: res.status, body: text };
  }
  return { ok: true as const, data: JSON.parse(text) };
}

async function fetchResult(requestId: string) {
  const res = await fetch(`${WAVESPEED_BASE}/predictions/${requestId}/result`, {
    headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Wavespeed result failed [${res.status}]: ${text}`);
    return { ok: false as const, status: res.status, body: text };
  }
  return { ok: true as const, data: JSON.parse(text) };
}

async function pollUntilDone(requestId: string, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await fetchResult(requestId);
    if (!r.ok) return r;
    const status = r.data?.data?.status ?? r.data?.status;
    if (status === 'completed' || status === 'failed') return r;
    await new Promise((res) => setTimeout(res, 1500));
  }
  return { ok: false as const, status: 504, body: 'Polling timeout' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!WAVESPEED_API_KEY) {
    return json({ error: 'WAVESPEED_API_KEY not configured' }, 500);
  }

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const requestId = url.searchParams.get('request_id');
      if (!requestId) return json({ error: 'Missing request_id' }, 400);
      const r = await fetchResult(requestId);
      if (!r.ok) return json({ error: 'Wavespeed error', status: r.status, details: r.body }, r.status);
      return json(r.data);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      if (!body || typeof body.model !== 'string' || typeof body.input !== 'object' || body.input === null) {
        return json({ error: 'Body must be { model: string, input: object, wait?: boolean }' }, 400);
      }
      const model = body.model.replace(/^\/+|\/+$/g, '');
      const submit = await submitPrediction(model, body.input);
      if (!submit.ok) {
        return json({ error: 'Wavespeed submit failed', status: submit.status, details: submit.body }, submit.status);
      }

      const requestId = submit.data?.data?.id ?? submit.data?.id;
      if (body.wait && requestId) {
        const polled = await pollUntilDone(requestId);
        if (!polled.ok) {
          return json({ error: 'Wavespeed polling failed', status: polled.status, details: polled.body }, polled.status);
        }
        return json(polled.data);
      }
      return json(submit.data);
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (e) {
    console.error('wavespeed function error:', e);
    return json({ error: 'Internal error', details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
