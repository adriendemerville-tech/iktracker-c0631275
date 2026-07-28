import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Tu extrais un trajet à partir d'un texte en français prononcé par un conducteur (transcription vocale possible).
Retourne un JSON structuré avec les étapes du trajet, dans l'ordre logique le plus efficace (proximité géographique, chronologie mentionnée).

Règles :
- "departure" : point de départ. Si non mentionné, laisse null (le domicile sera utilisé par défaut).
- "arrival" : point d'arrivée. Si non mentionné, laisse null (le domicile sera utilisé par défaut).
- "stops" : étapes intermédiaires dans l'ordre logique de visite (pas de doublons avec départ/arrivée).
- "roundTrip" : true si "aller-retour", "et retour", "puis je rentre" est mentionné.
- "purpose" : motif court du déplacement (client, chantier, réunion...), sinon null.
- Chaque adresse doit être exploitable par un géocodeur français (rue + ville, ou juste ville, ou nom de lieu connu).
- Ne réponds QUE via l'appel de la fonction extract_trip.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, homeAddress } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const userMsg = `Domicile connu : ${homeAddress || "inconnu"}\n\nTexte du conducteur :\n"""${prompt}"""`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "none",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_trip",
            description: "Extrait les composants d'un trajet",
            parameters: {
              type: "object",
              additionalProperties: false,
              properties: {
                departure: { type: ["string", "null"], description: "Adresse de départ ou null" },
                arrival: { type: ["string", "null"], description: "Adresse d'arrivée ou null" },
                stops: { type: "array", items: { type: "string" }, description: "Étapes intermédiaires ordonnées" },
                roundTrip: { type: "boolean" },
                purpose: { type: ["string", "null"] },
              },
              required: ["departure", "arrival", "stops", "roundTrip", "purpose"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_trip" } },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`AI gateway ${res.status}:`, body);
      return new Response(JSON.stringify({ error: "AI request failed", status: res.status, details: body }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");
    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-trip-prompt error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
