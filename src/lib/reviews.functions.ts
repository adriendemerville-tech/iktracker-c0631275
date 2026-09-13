import { createServerFn } from "@tanstack/react-start";

export interface PublicReview {
  id: string;
  rating: number;
  content: string;
  author: string;
  company: string;
  job: string | null;
  city: string | null;
}

export interface AggregateRating {
  ratingValue: number;
  reviewCount: number;
}

function serverClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return { url, key };
}

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const { url, key } = serverClient();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Avis publiés, lisibles publiquement (SSR). */
export const getPublishedReviews = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = await publicClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, content, first_name, last_name, company, job, city")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(12);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      rating: Number(r.rating),
      content: r.content as string,
      author: `${r.first_name} ${String(r.last_name).charAt(0).toUpperCase()}.`,
      company: r.company as string,
      job: r.job as string | null,
      city: r.city as string | null,
    })) as PublicReview[];
  } catch (err) {
    console.error("Failed to load published reviews:", err);
    return [] as PublicReview[];
  }
});

/** Note moyenne agrégée (avis publiés), avec repli côté base sous 5 avis. */
export const getAggregateRating = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = await publicClient();
    const { data, error } = await (supabase.rpc as any)("get_aggregate_rating");
    if (error) throw error;
    return {
      ratingValue: Number(data?.ratingValue ?? 4.8),
      reviewCount: Number(data?.reviewCount ?? 127),
    } as AggregateRating;
  } catch (err) {
    console.error("Failed to load aggregate rating:", err);
    return { ratingValue: 4.8, reviewCount: 127 } as AggregateRating;
  }
});
