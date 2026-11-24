import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicTripStats } from "@/lib/trip-stats.functions";
import { publicTripStatsSeed } from "@/lib/trip-stats";

interface UseLiveTripStatsOptions {
  initialTripCount?: number | null;
  initialTotalKm?: number | null;
  refetchInterval?: number;
}

export function useLiveTripStats({
  initialTripCount,
  initialTotalKm,
  refetchInterval = 10 * 60_000,
}: UseLiveTripStatsOptions) {
  const fetchStats = useServerFn(getPublicTripStats);
  const seeded = publicTripStatsSeed(initialTripCount, initialTotalKm);

  const { data, isLoading } = useQuery({
    queryKey: ["public-trip-stats"],
    queryFn: async () => {
      const result = await fetchStats();
      const stats = publicTripStatsSeed(result?.tripCount, result?.totalKm);
      if (!stats) throw new Error("Public trip stats unavailable");
      return stats;
    },
    initialData: seeded ?? undefined,
    staleTime: 10 * 60_000,
    refetchInterval,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    tripCount: typeof data?.tripCount === "number" ? data.tripCount : null,
    totalKm: typeof data?.totalKm === "number" ? data.totalKm : null,
    isLoading,
  };
}
