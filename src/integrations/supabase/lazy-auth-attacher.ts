// Variante paresseuse de `attachSupabaseAuth` (généré) : identique côté
// comportement, mais le client Supabase (~50 Ko gzip) est chargé en chunk
// asynchrone au premier appel de server function au lieu d'être embarqué dans
// le bundle d'entrée via `src/start.ts`. Ne pas réintroduire l'attacher généré.
import { createMiddleware } from "@tanstack/react-start";
import { getSupabase } from "./lazy";

export const attachSupabaseAuthLazy = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
