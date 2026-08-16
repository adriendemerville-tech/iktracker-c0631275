import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_ytd_summary",
  title: "Synthèse annuelle IK",
  description:
    "Retourne le cumul kilométrique et l'indemnité totale par véhicule pour une année donnée (année en cours par défaut).",
  inputSchema: {
    year: z
      .number()
      .int()
      .min(2000)
      .max(2100)
      .optional()
      .describe("Année civile (défaut : année courante)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const y = year ?? new Date().getFullYear();
    const from = `${y}-01-01`;
    const to = `${y}-12-31`;
    const client = sb(ctx);
    const [{ data: trips, error: e1 }, { data: vehicles, error: e2 }] = await Promise.all([
      client
        .from("trips")
        .select("vehicle_id, distance, ik_amount")
        .is("deleted_at", null)
        .gte("date", from)
        .lte("date", to),
      client.from("vehicles").select("id, name, make, model, fiscal_power, is_electric"),
    ]);
    if (e1 || e2) {
      return { content: [{ type: "text", text: (e1 ?? e2)!.message }], isError: true };
    }
    const byVehicle = new Map<
      string | null,
      { distance: number; ik_amount: number; trips: number }
    >();
    for (const t of trips ?? []) {
      const key = t.vehicle_id;
      const acc = byVehicle.get(key) ?? { distance: 0, ik_amount: 0, trips: 0 };
      acc.distance += Number(t.distance ?? 0);
      acc.ik_amount += Number(t.ik_amount ?? 0);
      acc.trips += 1;
      byVehicle.set(key, acc);
    }
    const perVehicle = (vehicles ?? []).map((v) => {
      const s = byVehicle.get(v.id) ?? { distance: 0, ik_amount: 0, trips: 0 };
      return {
        vehicle_id: v.id,
        vehicle: [v.make, v.model].filter(Boolean).join(" ") || v.name,
        fiscal_power: v.fiscal_power,
        is_electric: v.is_electric,
        total_km: Math.round(s.distance * 100) / 100,
        total_ik_eur: Math.round(s.ik_amount * 100) / 100,
        trip_count: s.trips,
      };
    });
    const total = perVehicle.reduce(
      (acc, v) => ({
        total_km: acc.total_km + v.total_km,
        total_ik_eur: acc.total_ik_eur + v.total_ik_eur,
        trip_count: acc.trip_count + v.trip_count,
      }),
      { total_km: 0, total_ik_eur: 0, trip_count: 0 },
    );
    const summary = {
      year: y,
      total_km: Math.round(total.total_km * 100) / 100,
      total_ik_eur: Math.round(total.total_ik_eur * 100) / 100,
      trip_count: total.trip_count,
      per_vehicle: perVehicle,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
