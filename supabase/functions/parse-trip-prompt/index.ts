import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model routing
//   • Primary  : Mistral Small via Wavespeed (WAVESPEED_API_KEY) — natif FR, 10-20x moins cher que Luna
//   • Fallback : Gemini 2.5 Flash Lite via Lovable AI Gateway (LOVABLE_API_KEY)
const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const WS_MISTRAL_MODEL = "mistral/mistral-small-latest";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI_FALLBACK_MODEL = "google/gemini-2.5-flash-lite";

const SYSTEM = `Tu extrais un trajet à partir d'un texte en français prononcé par un conducteur (transcription vocale possible).
Retourne UNIQUEMENT un objet JSON valide (pas de markdown, pas de texte autour), avec ces clés obligatoires :
  - "departure"  : string ou null — point de départ. null si non mentionné (le domicile sera utilisé).
  - "arrival"    : string ou null — point d'arrivée. null si non mentionné (le domicile sera utilisé).
  - "stops"      : array de strings — étapes intermédiaires dans l'ordre logique de visite (pas de doublons avec départ/arrivée).
  - "roundTrip"  : boolean — true si "aller-retour", "et retour", "puis je rentre" est mentionné.
  - "purpose"    : string ou null — motif du déplacement, court (3 à 60 caractères), sinon null.

Règles pour "purpose" :
  • Détecte le motif dès qu'il est exprimé, même implicitement : "rendez-vous client Dupont", "chantier Noves", "livraison matériel", "réunion chantier", "visite technique", "devis", "SAV", "formation", "salon professionnel".
  • Conserve le nom du client, du chantier ou de la société s'il est cité : "Chantier Villa Martin", "RDV client Dupont".
  • N'invente jamais de motif : si le texte ne contient qu'un itinéraire, renvoie null.
  • N'y mets jamais les adresses, les villes seules, ni la distance.

Chaque adresse doit être exploitable par un géocodeur français (rue + ville, ou juste ville, ou nom de lieu connu).
Ne renvoie AUCUN autre champ, AUCUN commentaire, AUCUN backtick.`;

interface Parsed {
  departure: string | null;
  arrival: string | null;
  stops: string[];
  roundTrip: boolean;
  purpose: string | null;
}

function coerceParsed(raw: unknown): Parsed {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const stops = Array.isArray(obj.stops)
    ? (obj.stops as unknown[]).filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
  return {
    departure: typeof obj.departure === "string" && obj.departure.trim() ? obj.departure.trim() : null,
    arrival: typeof obj.arrival === "string" && obj.arrival.trim() ? obj.arrival.trim() : null,
    stops,
    roundTrip: obj.roundTrip === true,
    purpose: typeof obj.purpose === "string" && obj.purpose.trim() ? obj.purpose.trim() : null,
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(trimmed); } catch { /* try substring */ }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1));
  }
  throw new Error(`Cannot parse JSON from model output: ${trimmed.slice(0, 200)}`);
}

async function wavespeedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const key = Deno.env.get("WAVESPEED_API_KEY");
  if (!key) throw new Error("WAVESPEED_API_KEY missing");
  return fetch(`${WAVESPEED_BASE}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

async function wavespeedPoll(requestId: string, timeoutMs = 20_000): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await wavespeedFetch(`predictions/${requestId}/result`);
    const j = await r.json();
    const status = j?.data?.status ?? j?.status;
    if (status === "completed" || status === "succeeded") return j;
    if (status === "failed" || status === "error") throw new Error(`Wavespeed prediction failed: ${JSON.stringify(j).slice(0, 200)}`);
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error(`Wavespeed polling timeout for ${requestId}`);
}

async function callMistralWavespeed(userMsg: string): Promise<string> {
  const res = await wavespeedFetch(WS_MISTRAL_MODEL, {
    method: "POST",
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`Wavespeed/Mistral ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const raw = await res.json();
  const direct = raw?.choices?.[0]?.message?.content;
  if (direct) return String(direct);
  const outputs: unknown = raw?.data?.outputs ?? raw?.outputs;
  if (Array.isArray(outputs) && outputs.length > 0 && typeof outputs[0] === "string") return outputs[0] as string;
  const requestId = raw?.data?.id ?? raw?.id;
  if (requestId) {
    const polled = await wavespeedPoll(String(requestId));
    const content = polled?.data?.choices?.[0]?.message?.content ?? polled?.choices?.[0]?.message?.content;
    if (content) return String(content);
    const pOutputs: unknown = polled?.data?.outputs ?? polled?.outputs;
    if (Array.isArray(pOutputs) && pOutputs.length > 0 && typeof pOutputs[0] === "string") return pOutputs[0] as string;
  }
  throw new Error(`Unrecognized Wavespeed/Mistral response: ${JSON.stringify(raw).slice(0, 200)}`);
}

async function callGeminiFallback(userMsg: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMINI_FALLBACK_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini fallback ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty Gemini response");
  return String(text);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, homeAddress } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = `Domicile connu : ${homeAddress || "inconnu"}\n\nTexte du conducteur :\n"""${prompt}"""`;

    let rawText: string;
    let source: "mistral" | "gemini" = "mistral";
    try {
      rawText = await callMistralWavespeed(userMsg);
    } catch (err) {
      console.warn(`[parse-trip-prompt] Mistral failed, fallback Gemini: ${err instanceof Error ? err.message : err}`);
      rawText = await callGeminiFallback(userMsg);
      source = "gemini";
    }

    const parsed = coerceParsed(extractJson(rawText));

    return new Response(JSON.stringify({ ...parsed, _source: source }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-trip-prompt error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
