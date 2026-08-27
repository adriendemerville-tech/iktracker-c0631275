// Lectures publiques du forum. Utilisées dans les loaders SSR et côté client.
import { getSupabase } from "@/integrations/supabase/lazy";

export type ForumCategory = {
  slug: string;
  label: string;
  description: string | null;
  sort_order: number;
};

export type ForumAuthor = {
  user_id: string;
  pseudo: string;
  avatar_url: string | null;
  level: string;
  persona: string | null;
  points: number;
};

export type ForumDiscussionListItem = {
  id: string;
  slug: string;
  title: string;
  body: string;
  meta_description: string | null;
  category_slug: string;
  reply_count: number;
  vote_score: number;
  view_count: number;
  is_pinned: boolean;
  created_at: string;
  last_activity_at: string;
  author_id: string;
  author?: ForumAuthor | null;
};

const LIST_COLUMNS =
  "id, slug, title, body, meta_description, category_slug, reply_count, vote_score, view_count, is_pinned, created_at, last_activity_at, author_id";

async function attachAuthors<T extends { author_id: string }>(rows: T[]) {
  if (!rows.length) return rows.map((r) => ({ ...r, author: null }));
  const supabase = await getSupabase();
  const ids = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data } = await supabase
    .from("forum_profiles")
    .select("user_id, pseudo, avatar_url, level, persona, points")
    .in("user_id", ids);
  const map = new Map((data ?? []).map((p) => [p.user_id, p as ForumAuthor]));
  return rows.map((r) => ({ ...r, author: map.get(r.author_id) ?? null }));
}

export async function fetchCategories(): Promise<ForumCategory[]> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("forum_categories")
    .select("slug, label, description, sort_order")
    .order("sort_order");
  return (data ?? []) as ForumCategory[];
}

export async function fetchDiscussions(options: {
  category?: string;
  sort?: "recent" | "popular";
  limit?: number;
  offset?: number;
}): Promise<ForumDiscussionListItem[]> {
  const supabase = await getSupabase();
  let query = supabase
    .from("forum_discussions")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .order("is_pinned", { ascending: false });

  query =
    options.sort === "popular"
      ? query.order("vote_score", { ascending: false }).order("reply_count", { ascending: false })
      : query.order("last_activity_at", { ascending: false });

  if (options.category) query = query.eq("category_slug", options.category);

  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const { data } = await query.range(offset, offset + limit - 1);
  return (await attachAuthors((data ?? []) as ForumDiscussionListItem[])) as ForumDiscussionListItem[];
}

export async function countDiscussions(category?: string): Promise<number> {
  const supabase = await getSupabase();
  let query = supabase
    .from("forum_discussions")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");
  if (category) query = query.eq("category_slug", category);
  const { count } = await query;
  return count ?? 0;
}

export type ForumReplyNode = {
  id: string;
  body: string;
  is_ai: boolean;
  vote_score: number;
  created_at: string;
  parent_reply_id: string | null;
  author_id: string | null;
  author?: ForumAuthor | null;
};

export async function fetchDiscussionBySlug(slug: string) {
  const supabase = await getSupabase();
  const { data: discussion } = await supabase
    .from("forum_discussions")
    .select(
      "id, slug, title, body, meta_description, category_slug, reply_count, vote_score, view_count, is_pinned, is_locked, best_reply_id, created_at, updated_at, last_activity_at, author_id, seo_indexable",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!discussion) return null;

  const { data: replies } = await supabase
    .from("forum_replies")
    .select("id, body, is_ai, vote_score, created_at, parent_reply_id, author_id")
    .eq("discussion_id", discussion.id)
    .eq("status", "published")
    .order("created_at");

  const authorIds = Array.from(
    new Set([
      discussion.author_id,
      ...((replies ?? []).map((r) => r.author_id).filter(Boolean) as string[]),
    ]),
  );
  const { data: profiles } = await supabase
    .from("forum_profiles")
    .select("user_id, pseudo, avatar_url, level, persona, points")
    .in("user_id", authorIds);
  const map = new Map((profiles ?? []).map((p) => [p.user_id, p as ForumAuthor]));

  const { data: category } = await supabase
    .from("forum_categories")
    .select("slug, label, description, sort_order")
    .eq("slug", discussion.category_slug)
    .maybeSingle();

  return {
    discussion: { ...discussion, author: map.get(discussion.author_id) ?? null },
    replies: ((replies ?? []) as ForumReplyNode[]).map((r) => ({
      ...r,
      author: r.author_id ? (map.get(r.author_id) ?? null) : null,
    })),
    category: (category ?? null) as ForumCategory | null,
  };
}

export async function fetchForumStats() {
  const supabase = await getSupabase();
  const { data } = await (supabase.rpc as any)("get_forum_stats");
  return (data ?? { discussions: 0, replies: 0, members: 0, active_7d: 0 }) as {
    discussions: number;
    replies: number;
    members: number;
    active_7d: number;
  };
}
