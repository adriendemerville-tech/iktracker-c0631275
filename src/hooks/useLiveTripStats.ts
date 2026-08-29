import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicTripStats } from "@/lib/trip-stats.functions";

interface UseLiveTripStatsOptions {
  initialTripCount?: number;
  initialTotalKm?: number;
  refetchInterval?: number;
}

export function useLiveTripStats({
  initialTripCount,
  initialTotalKm,
  refetchInterval = 10 * 60_000,
}: UseLiveTripStatsOptions) {
  const fetchStats = useServerFn(getPublicTripStats);

  const { data, isLoading } = useQuery({
    queryKey: ["public-trip-stats"],
    queryFn: async () => fetchStats(),
    initialData: { tripCount: initialTripCount ?? 0, totalKm: initialTotalKm ?? 0 },
    staleTime: 10 * 60_000,
    refetchInterval,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    tripCount: data?.tripCount ?? initialTripCount ?? 0,
    totalKm: data?.totalKm ?? initialTotalKm ?? 0,
    isLoading,
  };
}
