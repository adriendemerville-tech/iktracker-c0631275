import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRegisteredUserCount } from "@/lib/user-count.functions";

interface UseLiveUserCountOptions {
  initialCount?: number;
  refetchInterval?: number;
}

export function useLiveUserCount({
  initialCount,
  refetchInterval = 10 * 60_000,
}: UseLiveUserCountOptions) {
  const fetchCount = useServerFn(getRegisteredUserCount);

  const { data, isLoading } = useQuery({
    queryKey: ["registered-user-count"],
    queryFn: async () => {
      const result = await fetchCount();
      return result.count;
    },
    initialData: initialCount,
    staleTime: 10 * 60_000,
    refetchInterval,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return { count: data ?? initialCount ?? 1000, isLoading };
}
