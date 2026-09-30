import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface RegistrationScanResult {
  scanId: string | null;
  scannedAt: string;
  A: string | null; // Immatriculation
  B: string | null; // Date de 1re immatriculation (JJ/MM/AAAA)
  C3: string | null; // Adresse du titulaire
  D1: string | null; // Marque
  D3: string | null; // Dénomination commerciale
  I: string | null; // Date d'immatriculation du certificat
  P6: number | null; // Puissance fiscale
  P3: string | null; // Énergie
}

const Input = z.object({
  imageBase64: z.string().min(100).max(14_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const PROMPT = `Tu lis un certificat d'immatriculation français (carte grise). Extrais STRICTEMENT les rubriques suivantes, telles qu'imprimées :
A (numéro d'immatriculation), B (date de première immatriculation, JJ/MM/AAAA), C.3 (adresse du titulaire), D.1 (marque), D.3 (dénomination commerciale), I (date d'immatriculation à laquelle se réfère le certificat, JJ/MM/AAAA), P.3 (type de carburant/énergie, ex: ES, GO, EL, EH), P.6 (puissance administrative nationale en CV, entier).
Mets null si une rubrique est illisible ou absente. N'invente rien.`;

export const scanRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }): Promise<RegistrationScanResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("OCR indisponible");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "carte_grise",
              parameters: {
                type: "object",
                properties: {
                  A: { type: ["string", "null"] },
                  B: { type: ["string", "null"] },
                  C3: { type: ["string", "null"] },
                  D1: { type: ["string", "null"] },
                  D3: { type: ["string", "null"] },
                  I: { type: ["string", "null"] },
                  P3: { type: ["string", "null"] },
                  P6: { type: ["integer", "null"] },
                },
                required: ["A", "B", "C3", "D1", "D3", "I", "P3", "P6"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "carte_grise" } },
      }),
    });
    if (res.status === 429) throw new Error("Trop de demandes, réessayez dans un instant");
    if (res.status === 402) throw new Error("Crédits IA épuisés");
    if (!res.ok) throw new Error("Lecture de la carte grise impossible");
    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const f = args ? JSON.parse(args) : {};

    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const p6 = Number(f.P6);
    const extracted = {
      A: str(f.A)?.toUpperCase().replace(/\s+/g, "-") ?? null,
      B: str(f.B),
      C3: str(f.C3),
      D1: str(f.D1),
      D3: str(f.D3),
      I: str(f.I),
      P3: str(f.P3),
      P6: Number.isInteger(p6) && p6 > 0 && p6 < 100 ? p6 : null,
    };

    // Conservation horodatée des données extraites uniquement (justificatif fiscal).
    // La photo n'est jamais enregistrée (document sensible).
    const scannedAt = new Date().toISOString();
    const { data: row } = await context.supabase
      .from("vehicle_registration_scans")
      .insert({
        user_id: context.userId,
        license_plate: extracted.A,
        extracted,
        image_path: null,
        scanned_at: scannedAt,
      })
      .select("id")
      .single();

    return { scanId: row?.id ?? null, scannedAt, ...extracted };
  });
