import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { userClient } from "../supabase";
import { getIkRateOverride, recalculateVehicleYearsIK } from "../ik";

export default defineTool({
  name: "update_trip",
  title: "Modifier un trajet",
  description:
    "Modifie un trajet IKtracker existant (véhicule, date, adresses, distance, aller-retour, motif). " +
    "Au moins un champ à modifier est requis. " +
    "Convention distance : la distance stockée inclut déjà l'aller-retour éventuel ; comme l'app web, " +
    "changer round_trip seul NE modifie PAS la distance. " +
    "Si vehicle_id, distance, date ou round_trip change, l'IK du trajet est recalculée avec le barème " +
    "officiel cumulatif annuel (bonus +20 % si véhicule 100 % électrique, préférence ik_rate_override " +
    "de l'utilisateur respectée), et les ik_amount de TOUS les trajets non supprimés des véhicules " +
    "concernés (ancien et nouveau) pour les années concernées sont réajustés dans l'ordre chronologique. " +
    "Les colonnes source, tour_stops et coordonnées ne sont jamais modifiées.",
  inputSchema: {
    trip_id: z.string().uuid().describe("Identifiant du trajet (UUID)."),
    vehicle_id: z.string().uuid().optional().describe("Nouveau véhicule (UUID, doit appartenir à l'utilisateur)."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Nouvelle date (YYYY-MM-DD)."),
    start_location: z.string().min(1).optional().describe("Nouvelle adresse de départ."),
    end_location: z.string().min(1).optional().describe("Nouvelle adresse d'arrivée."),
    distance: z.number().positive().optional().describe("Nouvelle distance totale en km (aller-retour inclus le cas échéant)."),
    round_trip: z.boolean().optional().describe("Aller-retour. Ne change pas la distance stockée."),
    purpose: z.string().optional().describe("Motif du déplacement (chaîne vide = effacer)."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    try {
      const supabase = userClient(ctx);
      const userId = ctx.getUserId()!;

      const updates: Record<string, unknown> = {};
      if (input.vehicle_id !== undefined) updates.vehicle_id = input.vehicle_id;
      if (input.date !== undefined) updates.date = input.date;
      if (input.start_location !== undefined) updates.start_location = input.start_location;
      if (input.end_location !== undefined) updates.end_location = input.end_location;
      if (input.distance !== undefined) updates.distance = input.distance;
      if (input.round_trip !== undefined) updates.round_trip = input.round_trip;
      if (input.purpose !== undefined) updates.purpose = input.purpose === "" ? null : input.purpose;
      if (Object.keys(updates).length === 0) {
        return { content: [{ type: "text", text: "Aucun champ à modifier fourni." }], isError: true };
      }

      // Contrôle propriétaire explicite (RLS + filtre user_id).
      const { data: trip, error: fErr } = await supabase
        .from("trips")
        .select("id, user_id, vehicle_id, date, distance, ik_amount, deleted_at")
        .eq("id", input.trip_id)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();
      if (fErr) return { content: [{ type: "text", text: fErr.message }], isError: true };
      if (!trip) return { content: [{ type: "text", text: "Trajet introuvable" }], isError: true };

      if (input.vehicle_id !== undefined) {
        const { data: veh } = await supabase
          .from("vehicles")
          .select("id")
          .eq("id", input.vehicle_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!veh) {
          return { content: [{ type: "text", text: "Véhicule introuvable ou n'appartenant pas à l'utilisateur." }], isError: true };
        }
      }

      const oldIk = Number(trip.ik_amount) || 0;
      const { data: updated, error: uErr } = await supabase
        .from("trips")
        .update(updates)
        .eq("id", input.trip_id)
        .select()
        .single();
      if (uErr) return { content: [{ type: "text", text: uErr.message }], isError: true };

      // Recalcul IK si un champ impactant le barème a changé.
      const ikImpacting =
        input.vehicle_id !== undefined || input.distance !== undefined ||
        input.date !== undefined || input.round_trip !== undefined;
      let adjusted: Awaited<ReturnType<typeof recalculateVehicleYearsIK>> = [];
      if (ikImpacting) {
        const vehicleIds = [...new Set([trip.vehicle_id, updated.vehicle_id].filter(Boolean))] as string[];
        const years = [...new Set([trip.date, updated.date].map((d) => Number(String(d).slice(0, 4))))];
        const override = await getIkRateOverride(supabase, userId);
        adjusted = await recalculateVehicleYearsIK(supabase, userId, vehicleIds, years, override);
      }

      const { data: finalTrip } = await supabase
        .from("trips")
        .select()
        .eq("id", input.trip_id)
        .single();
      const newIk = Number(finalTrip?.ik_amount) || 0;

      return {
        content: [{ type: "text", text: `Trajet ${input.trip_id} mis à jour (IK : ${oldIk} € → ${newIk} €, ${adjusted.length} autre(s) trajet(s) réajusté(s)).` }],
        structuredContent: {
          trip: finalTrip ?? updated,
          old_ik_amount: oldIk,
          new_ik_amount: newIk,
          adjusted_trips: adjusted.filter((a) => a.id !== input.trip_id),
        },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
