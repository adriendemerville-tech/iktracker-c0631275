// Génération de texte pour les membres animés du forum.
// Mistral via le proxy Wavespeed (déjà utilisé par les Edge Functions),
// repli sur la passerelle Lovable AI en cas d'échec.

const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const FALLBACK_MODEL = "google/gemini-2.5-flash";

export type MistralSize = "small" | "large";

function modelFor(size: MistralSize) {
  return size === "large" ? "mistral/mistral-large-latest" : "mistral/mistral-small-latest";
}

async function wavespeedPoll(requestId: string, key: string): Promise<string | null> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const r = await fetch(`${WAVESPEED_BASE}/predictions/${requestId}/result`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const j = (await r.json()) as Record<string, any>;
    const status = j?.data?.status ?? j?.status;
    if (status === "completed" || status === "succeeded") {
      const content =
        j?.data?.choices?.[0]?.message?.content ?? j?.choices?.[0]?.message?.content ?? null;
      if (content) return String(content);
      const outputs = j?.data?.outputs ?? j?.outputs;
      if (Array.isArray(outputs) && typeof outputs[0] === "string") return outputs[0];
      return null;
    }
    if (status === "failed" || status === "error") return null;
    await new Promise((res) => setTimeout(res, 800));
  }
  return null;
}

async function callMistral(
  system: string,
  user: string,
  size: MistralSize,
  temperature: number,
): Promise<string | null> {
  const key = process.env["WAVESPEED_API_KEY"];
  if (!key) return null;
  const res = await fetch(`${WAVESPEED_BASE}/${modelFor(size)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: 900,
    }),
  });
  if (!res.ok) return null;
  const raw = (await res.json()) as Record<string, any>;
  const direct = raw?.choices?.[0]?.message?.content;
  if (direct) return String(direct);
  const outputs = raw?.data?.outputs ?? raw?.outputs;
  if (Array.isArray(outputs) && typeof outputs[0] === "string") return outputs[0];
  const id = raw?.data?.id ?? raw?.id;
  return id ? wavespeedPoll(String(id), key) : null;
}

async function callGatewayFallback(system: string, user: string): Promise<string | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: FALLBACK_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.9,
    }),
  });
  if (!res.ok) return null;
  const raw = (await res.json()) as Record<string, any>;
  return raw?.choices?.[0]?.message?.content ?? null;
}

/** Génère un texte de forum ; renvoie null si aucun modèle n'est disponible. */
export async function generateForumText(
  system: string,
  user: string,
  opts: { size?: MistralSize; temperature?: number } = {},
): Promise<{ text: string; model: string } | null> {
  const size = opts.size ?? "small";
  const temperature = opts.temperature ?? 0.95;
  try {
    const text = await callMistral(system, user, size, temperature);
    if (text?.trim()) return { text: text.trim(), model: modelFor(size) };
  } catch (error) {
    console.error("[forum-bot] mistral failed", error);
  }
  try {
    const text = await callGatewayFallback(system, user);
    if (text?.trim()) return { text: text.trim(), model: FALLBACK_MODEL };
  } catch (error) {
    console.error("[forum-bot] gateway fallback failed", error);
  }
  return null;
}

/** Nettoie une sortie de modèle : pas de markdown parasite ni de guillemets. */
export function cleanModelText(text: string): string {
  return text
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/^["«»\s]+|["«»\s]+$/g, "")
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .trim();
}
