import { createServerFn } from "@tanstack/react-start";

/**
 * Returns public trip statistics: validated trip count and total distance (km).
 * Called from the homepage social-proof counters.
 * Cached server-side (10 min TTL) to avoid one DB round-trip per visit.
 */
export const getPublicTripStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const { cachedStat, withDeadline } = await import("@/lib/public-stats-cache.server");

    try {
      // Cold start : on ne bloque jamais le TTFB plus de 400 ms sur la DB.
      return await withDeadline(
        cachedStat("public-trip-stats", async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await (supabaseAdmin.rpc as any)("get_public_trip_stats");
        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        return {
          tripCount: Number(row?.trip_count ?? 0),
          totalKm: Math.round(Number(row?.total_distance ?? 0)),
        };
        }),
        400,
        { tripCount: 0, totalKm: 0 },
      );
    } catch (err) {
      console.error("Failed to fetch public trip stats:", err);
      return { tripCount: 0, totalKm: 0 };
    }
  },
);
