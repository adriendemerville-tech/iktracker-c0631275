import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

// Client Supabase scopé à l'appelant MCP : RLS appliquée comme l'utilisateur.
// Dans le runtime Edge, la clé publishable est exposée sous SUPABASE_ANON_KEY.
export function userClient(ctx: ToolContext) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw new Error("SUPABASE_URL manquante dans le runtime");
  if (!key) throw new Error("Clé Supabase (ANON/PUBLISHABLE) manquante dans le runtime");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
