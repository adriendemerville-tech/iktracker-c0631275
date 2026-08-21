import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  assertAIBudget,
  BudgetExceededError,
  COST_ESTIMATES,
  trackAICost,
} from "../_shared/cost-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const inbound = await req.formData();
    const file = inbound.get("file");
    if (!(file instanceof File) || file.size < 1024) {
      return new Response(JSON.stringify({ error: "Audio file missing or too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Audio too large (max 20MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Centralized AI budget guard (monthly cap in site_config.api_budget)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    try {
      await assertAIBudget(adminClient, "transcribe-audio");
    } catch (e) {
      if (e instanceof BudgetExceededError) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    const upstream = new FormData();
    upstream.append("model", "openai/gpt-4o-mini-transcribe");
    upstream.append("file", file, file.name || "recording.wav");
    upstream.append("language", "fr");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Transcription ${res.status}:`, body);
      return new Response(
        JSON.stringify({ error: "Transcription failed", status: res.status, details: body }),
        {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await res.json();
    // Whisper ≈ 0,006 €/min — estimation par taille (~1 Mo/min en opus/webm)
    trackAICost(adminClient, {
      functionName: "transcribe-audio",
      model: "openai/gpt-4o-mini-transcribe",
      costEuros: Math.max(
        COST_ESTIMATES.whisper_minute,
        (file.size / 1_000_000) * COST_ESTIMATES.whisper_minute,
      ),
      metadata: { bytes: file.size },
    });
    return new Response(JSON.stringify({ text: data.text || "" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("transcribe-audio error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
