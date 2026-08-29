import { useCallback, useEffect, useRef, useState } from "react";
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

/** Notifications forum du membre connecté (réponses, mentions), en temps réel. */
export function useForumNotifications() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ForumNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<{ unsubscribe: () => void } | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    const supabase = await getSupabase();

    const [list, unread] = await Promise.all([
      supabase
        .from("forum_notifications")
        .select("id, discussion_id, reply_id, kind, title, slug, excerpt, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("forum_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);

    setItems((list.data as ForumNotification[] | null) ?? []);
    setUnreadCount(unread.count ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  // Temps réel : nouvelle notification -> mise à jour immédiate du badge.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void (async () => {
      const supabase = await getSupabase();
      if (cancelled) return;
      const channel = supabase
        .channel(`forum-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "forum_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: { new: ForumNotification }) => {
            const n = payload.new;
            setItems((prev) => (prev.some((i) => i.id === n.id) ? prev : [n, ...prev].slice(0, 20)));
            if (!n.read_at) setUnreadCount((c) => c + 1);
          },
        )
        .subscribe();
      channelRef.current = {
        unsubscribe: () => {
          void supabase.removeChannel(channel);
        },
      };
    })();

    return () => {
      cancelled = true;
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setItems((prev) =>
      prev.map((i) => (i.read_at ? i : { ...i, read_at: new Date().toISOString() })),
    );
    setUnreadCount(0);
    const supabase = await getSupabase();
    await supabase
      .from("forum_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    let wasUnread = false;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (!i.read_at) wasUnread = true;
        return { ...i, read_at: i.read_at ?? new Date().toISOString() };
      }),
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    const supabase = await getSupabase();
    await supabase
      .from("forum_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
  }, []);

  return {
    items,
    unreadCount,
    loading: loading || authLoading,
    hasUser: Boolean(user),
    refresh,
    markAllRead,
    markRead,
  };
}
