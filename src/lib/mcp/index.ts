import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listVehiclesTool from "./tools/list-vehicles";
import listTripsTool from "./tools/list-trips";
import getYtdSummaryTool from "./tools/get-ytd-summary";
import createTripTool from "./tools/create-trip";

// The OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud proxy).
// Build it from the project ref, inlined at build time by Vite.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "iktracker-mcp",
  title: "IKtracker MCP",
  version: "0.1.0",
  instructions:
    "Outils IKtracker pour consulter les trajets, véhicules et cumuls annuels d'indemnités kilométriques de l'utilisateur connecté, et créer de nouveaux trajets. Toutes les données sont scopées à l'utilisateur authentifié.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listVehiclesTool, listTripsTool, getYtdSummaryTool, createTripTool],
});
