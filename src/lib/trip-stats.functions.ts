import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";
import {
  PUBLIC_TRIP_STATS_DEADLINE_MS,
  parsePublicTripStats,
  publishablePublicTripStats,
  type PublicTripStats,
} from "@/lib/trip-stats";

const PUBLIC_TRIP_STATS_KEY = "public-trip-stats";

function publicSupabaseEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase public environment variable(s)");
  }
  return { url, key };
}

/**
 * Lit `get_public_trip_stats` (SECURITY DEFINER, compte et distance seuls,
 * EXECUTE pour anon). La clé publique suffit : aucun accès service_role.
 */
async function fetchPublicTripStats(): Promise<PublicTripStats> {
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

  const { data, error } = await supabase.rpc("get_public_trip_stats");
  if (error) throw error;
  const stats = publishablePublicTripStats(parsePublicTripStats(data));
  if (!stats) throw new Error("Invalid public trip stats");
  return stats;
}

/**
 * Trajets validés et kilomètres suivis, pour les compteurs de la page d'accueil.
 * En cas d'erreur : dernière valeur connue, sinon null (le chiffre est masqué).
 * Le couple {0, 0} n'est jamais renvoyé ni mis en cache.
 */
export const getPublicTripStats = createServerFn({ method: "GET" }).handler(async () => {
  const { cachedStat, withDeadline, lastKnown } = await import("@/lib/public-stats-cache.server");

  try {
    const displayed = await withDeadline(
      cachedStat(PUBLIC_TRIP_STATS_KEY, async () => {
        try {
          return await fetchPublicTripStats();
        } catch (err) {
          console.error("Failed to fetch public trip stats:", err);
          throw err;
        }
      }),
      PUBLIC_TRIP_STATS_DEADLINE_MS,
      lastKnown<PublicTripStats | null>(PUBLIC_TRIP_STATS_KEY, null),
    );

    const stats = publishablePublicTripStats(displayed);
    if (!stats) return { tripCount: null, totalKm: null };
    return stats;
  } catch (err) {
    console.error("Failed to fetch public trip stats:", err);
    return { tripCount: null, totalKm: null };
  }
});
