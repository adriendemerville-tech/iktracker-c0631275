import { createServerFn } from "@tanstack/react-start";

/**
 * Returns public trip statistics: validated trip count and total distance (km).
 * Called from the homepage social-proof counters.
 */
export const getPublicTripStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await (supabaseAdmin.rpc as any)("get_public_trip_stats");

    if (error) {
      console.error("Failed to fetch public trip stats:", error);
      return { tripCount: 0, totalKm: 0 };
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      tripCount: Number(row?.trip_count ?? 0),
      totalKm: Math.round(Number(row?.total_distance ?? 0)),
    };
  },
);
