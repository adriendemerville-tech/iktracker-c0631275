import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";
import {
  USER_COUNT_OFFSET,
  displayedRegisteredUserCount,
  parsePublicUserCount,
} from "@/lib/user-count";

const PUBLIC_USER_COUNT_KEY = "public-user-count";

/**
 * Budget de la lecture au rendu. L'ancien plafond de 120 ms rendait l'offset
 * (alors 1 000) avant la réponse de la base : la page affichait donc 1 000.
 */
const REGISTERED_USER_COUNT_DEADLINE_MS = 2_500;

function publicSupabaseEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase public environment variable(s)");
  }
  return { url, key };
}

/**
 * Compte les inscrits via `get_public_user_count` (SECURITY DEFINER, entier seul,
 * EXECUTE pour anon). La clé publique suffit : aucun accès service_role, aucune
 * donnée personnelle.
 */
async function fetchRegisteredUserBase(): Promise<number> {
  const { createClient } = await import("@supabase/supabase-js");
  const { url, key } = publicSupabaseEnv();
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) {
          new Headers(init.headers).forEach((value, name) => headers.set(name, value));
        }
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const { data, error } = await supabase.rpc("get_public_user_count");
  if (error) throw error;
  const base = parsePublicUserCount(data);
  if (base == null) throw new Error("Invalid public user count");
  return base;
}

/**
 * Inscrits réels + décalage, pour le compteur de la page d'accueil.
 * En cas d'erreur : dernière valeur connue, sinon null (le chiffre est masqué).
 */
export const getRegisteredUserCount = createServerFn({ method: "GET" }).handler(async () => {
  const { cachedStat, withDeadline, lastKnown } = await import("@/lib/public-stats-cache.server");

  try {
    const displayed = await withDeadline(
      cachedStat(PUBLIC_USER_COUNT_KEY, async () => {
        try {
          return displayedRegisteredUserCount(await fetchRegisteredUserBase());
        } catch (err) {
          console.error("Failed to count registered users:", err);
          throw err;
        }
      }),
      REGISTERED_USER_COUNT_DEADLINE_MS,
      lastKnown<number | null>(PUBLIC_USER_COUNT_KEY, null),
    );

    if (typeof displayed !== "number") {
      return { count: null, offset: USER_COUNT_OFFSET };
    }
    return { count: displayed, offset: USER_COUNT_OFFSET };
  } catch (err) {
    console.error("Failed to count registered users:", err);
    return { count: null, offset: USER_COUNT_OFFSET };
  }
});
