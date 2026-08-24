// Accès paresseux au client Supabase.
//
// Le client (@supabase/supabase-js) pèse ~50 Ko gzip : le charger statiquement
// depuis les hooks du chemin critique (useAuth, tracking, contenu de page) le
// place dans le bundle initial mobile alors qu'aucun de ses appels n'est requis
// pour le premier rendu. Ce helper le charge en chunk asynchrone, une seule
// fois, à la première utilisation réelle.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let clientPromise: Promise<SupabaseClient<Database>> | null = null;

export function getSupabase(): Promise<SupabaseClient<Database>> {
  clientPromise ??= import("./client").then((m) => m.supabase as SupabaseClient<Database>);
  return clientPromise;
}
