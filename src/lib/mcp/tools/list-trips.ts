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
  name: "list_trips",
  title: "Lister mes trajets",
  description:
    "Retourne les trajets IKtracker de l'utilisateur, filtrables par plage de dates (YYYY-MM-DD) et par véhicule. Limite par défaut : 50, max 200.",
  inputSchema: {
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Date de début incluse (YYYY-MM-DD)."),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Date de fin incluse (YYYY-MM-DD)."),
    vehicle_id: z.string().uuid().optional().describe("Filtrer sur un véhicule."),
    limit: z.number().int().min(1).max(200).optional().describe("Nombre max de trajets (défaut 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, vehicle_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    let q = sb(ctx)
      .from("trips")
      .select("id, date, start_location, end_location, distance, round_trip, ik_amount, purpose, vehicle_id, status")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(limit ?? 50);
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    if (vehicle_id) q = q.eq("vehicle_id", vehicle_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { trips: data ?? [], count: data?.length ?? 0 },
    };
  },
});
