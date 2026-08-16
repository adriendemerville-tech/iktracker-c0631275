import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * Hook to fetch dynamic page content from `page_contents` table.
 * Returns hardcoded fallback values instantly, then merges DB overrides.
 *
 * Usage:
 *   const { content } = usePageContent("home", defaultContent);
 *   // content.hero_title is either the DB value or the fallback
 */

type ContentMap = Record<string, string>;

export function usePageContent<T extends ContentMap>(
  pageKey: string,
  fallback: T,
): { content: T; isLoaded: boolean } {
  const { data, isSuccess } = useQuery({
    queryKey: ["page-content", pageKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("content")
        .eq("page_key", pageKey)
        .maybeSingle();

      if (error || !data) return null;
      return data.content as Record<string, Json>;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
    gcTime: 1000 * 60 * 60 * 24, // keep in cache 24h
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Merge DB values over fallback — only override keys that exist in fallback
  const merged = { ...fallback };
  if (data) {
    for (const key of Object.keys(fallback)) {
      if (data[key] && typeof data[key] === "string") {
        (merged as Record<string, string>)[key] = data[key] as string;
      }
    }
  }

  return { content: merged, isLoaded: isSuccess };
}
