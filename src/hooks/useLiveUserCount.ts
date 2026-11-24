import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRegisteredUserCount } from "@/lib/user-count.functions";

interface UseLiveUserCountOptions {
  initialCount?: number | null;
  refetchInterval?: number;
}

export function useLiveUserCount({
  initialCount,
  refetchInterval = 10 * 60_000,
}: UseLiveUserCountOptions) {
  const fetchCount = useServerFn(getRegisteredUserCount);
  const hasInitial = typeof initialCount === "number";

  const { data, isLoading } = useQuery({
    queryKey: ["registered-user-count"],
    queryFn: async () => {
      const result = await fetchCount();
      if (typeof result.count !== "number") {
        throw new Error("Registered user count unavailable");
      }
      return result.count;
    },
    initialData: hasInitial ? initialCount : undefined,
    staleTime: 10 * 60_000,
    refetchInterval,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return { count: typeof data === "number" ? data : null, isLoading };
}
