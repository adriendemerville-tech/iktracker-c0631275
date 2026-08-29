import { createServerFn } from "@tanstack/react-start";

/**
 * Returns public trip statistics: validated trip count and total distance (km).
 * Called from the homepage social-proof counters.
 * Cached server-side (10 min TTL) to avoid one DB round-trip per visit.
 */
export const getPublicTripStats = createServerFn({ method: "GET" }).handler(async () => {
  const { cachedStat, withDeadline, lastKnown, STAT_DEADLINE_MS } = await import(
    "@/lib/public-stats-cache.server"
  );

  const KEY = "public-trip-stats";

  try {
    // Le rendu serveur n'attend jamais plus de STAT_DEADLINE_MS la DB :
    // au-delà on rend la dernière valeur connue, le refresh continue en fond.
    return await withDeadline(
      cachedStat(KEY, async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await (supabaseAdmin.rpc as any)("get_public_trip_stats");
        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        return {
          tripCount: Number(row?.trip_count ?? 0),
          totalKm: Math.round(Number(row?.total_distance ?? 0)),
        };
      }),
      STAT_DEADLINE_MS,
      lastKnown(KEY, { tripCount: 0, totalKm: 0 }),
    );
  } catch (err) {
    console.error("Failed to fetch public trip stats:", err);
    return { tripCount: 0, totalKm: 0 };
  }
});
