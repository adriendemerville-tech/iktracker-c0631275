import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { userClient } from "../supabase";

export default defineTool({
  name: "create_trip",
  title: "Créer un trajet",
  description:
    "Crée un nouveau trajet IKtracker pour l'utilisateur. Le montant IK est laissé à zéro (recalculé côté app) ; renseigner un `ik_amount` explicite si besoin.",
  inputSchema: {
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Date du trajet (YYYY-MM-DD)."),
    start_location: z.string().min(1).describe("Adresse ou nom du point de départ."),
    end_location: z.string().min(1).describe("Adresse ou nom du point d'arrivée."),
    distance: z.number().positive().describe("Distance parcourue en kilomètres."),
    vehicle_id: z.string().uuid().optional().describe("Véhicule utilisé (UUID)."),
    round_trip: z.boolean().optional().describe("Trajet aller-retour."),
    purpose: z.string().optional().describe("Motif du déplacement."),
    ik_amount: z.number().nonnegative().optional().describe("Montant IK en euros (0 par défaut)."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    try {
    const { data, error } = await userClient(ctx)
      .from("trips")
      .insert({
        user_id: ctx.getUserId()!,
        date: input.date,
        start_location: input.start_location,
        end_location: input.end_location,
        distance: input.distance,
        vehicle_id: input.vehicle_id ?? null,
        round_trip: input.round_trip ?? false,
        purpose: input.purpose ?? null,
        ik_amount: input.ik_amount ?? 0,
        source: "mcp",
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Trajet créé (${data.id})` }],
      structuredContent: { trip: data },
    };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
