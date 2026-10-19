import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { userClient } from "../supabase";
import { getIkRateOverride, recalculateVehicleYearsIK } from "../ik";

export default defineTool({
  name: "delete_trip",
  title: "Supprimer un trajet",
  description:
    "Supprime un trajet IKtracker (suppression douce : deleted_at horodaté, restaurable 30 jours " +
    "depuis l'archive de l'app — aucun DELETE définitif). Nécessite confirm=true, sinon refus sans " +
    "aucune action. Après suppression, les ik_amount des trajets restants du même véhicule pour la " +
    "même année sont recalculés (barème cumulatif, bonus électrique, préférence ik_rate_override).",
  inputSchema: {
    trip_id: z.string().uuid().describe("Identifiant du trajet (UUID)."),
    confirm: z.literal(true).describe("Doit valoir true pour confirmer la suppression."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    try {
      const supabase = userClient(ctx);
      const userId = ctx.getUserId()!;

      const { data: trip, error: fErr } = await supabase
        .from("trips")
        .select("id, user_id, vehicle_id, date, start_location, end_location, distance, ik_amount, deleted_at")
        .eq("id", input.trip_id)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();
      if (fErr) return { content: [{ type: "text", text: fErr.message }], isError: true };
      if (!trip) return { content: [{ type: "text", text: "Trajet introuvable" }], isError: true };

      // Suppression douce, identique à l'app (restaurable 30 jours).
      const { error: dErr } = await supabase
        .from("trips")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", input.trip_id);
      if (dErr) return { content: [{ type: "text", text: dErr.message }], isError: true };

      // Recalcul des IK restantes du même véhicule / même année.
      let adjusted: Awaited<ReturnType<typeof recalculateVehicleYearsIK>> = [];
      if (trip.vehicle_id) {
        const override = await getIkRateOverride(supabase, userId);
        adjusted = await recalculateVehicleYearsIK(
          supabase,
          userId,
          [trip.vehicle_id as string],
          [Number(String(trip.date).slice(0, 4))],
          override,
        );
      }

      const summary = {
        id: trip.id,
        date: trip.date,
        start_location: trip.start_location,
        end_location: trip.end_location,
        distance: trip.distance,
        vehicle_id: trip.vehicle_id,
        ik_amount: trip.ik_amount,
      };
      return {
        content: [{ type: "text", text: `Trajet ${input.trip_id} supprimé (restaurable 30 jours). ${adjusted.length} trajet(s) réajusté(s).` }],
        structuredContent: { deleted_trip: summary, adjusted_trips: adjusted },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
