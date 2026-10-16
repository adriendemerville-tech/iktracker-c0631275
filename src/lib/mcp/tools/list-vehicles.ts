import { defineTool } from "@lovable.dev/mcp-js";
import { userClient } from "../supabase";

export default defineTool({
  name: "list_vehicles",
  title: "Lister mes véhicules",
  description:
    "Retourne la liste des véhicules IKtracker de l'utilisateur (nom, marque, modèle, chevaux fiscaux, électrique, immatriculation).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    try {
    const { data, error } = await userClient(ctx)
      .from("vehicles")
      .select("id, name, make, model, year, fiscal_power, is_electric, license_plate")
      .order("created_at", { ascending: false });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { vehicles: data ?? [] },
    };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
