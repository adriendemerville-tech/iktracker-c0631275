import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/integrations/supabase/lazy";
import { useAuth } from "@/hooks/useAuth";

export type ForumNotification = {
  id: string;
  discussion_id: string;
  reply_id: string | null;
  kind: string;
  title: string;
  slug: string;
  excerpt: string | null;
  read_at: string | null;
  created_at: string;
};

/** Notifications forum du membre connecté (réponses reçues). */
export function useForumNotifications() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ForumNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const supabase = await getSupabase();
    const { data } = await supabase
      .from("forum_notifications")
      .select("id, discussion_id, reply_id, kind, title, slug, excerpt, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as ForumNotification[] | null) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unread = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!unread.length) return;
    setItems((prev) => prev.map((i) => (i.read_at ? i : { ...i, read_at: new Date().toISOString() })));
    const supabase = await getSupabase();
    await supabase
      .from("forum_notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread);
  }, [items, user]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, read_at: i.read_at ?? new Date().toISOString() } : i)),
    );
    const supabase = await getSupabase();
    await supabase
      .from("forum_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  const unreadCount = items.filter((i) => !i.read_at).length;

  return { items, unreadCount, loading: loading || authLoading, refresh, markAllRead, markRead };
}
