import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/integrations/supabase/lazy";
import { useAuth } from "@/hooks/useAuth";
import { ensureForumProfile } from "@/lib/forum.functions";


export type ForumProfile = {
  user_id: string;
  pseudo: string;
  avatar_url: string | null;
  bio: string | null;
  persona: string | null;
  level: string;
  points: number;
  discussions_count: number;
  replies_count: number;
  upvotes_received: number;
  member_since: string;
  pseudo_enabled: boolean;
};

/** Fiche d'identité forum du membre connecté (null si non connecté ou non créée). */
export function useForumProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ForumProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const supabase = await getSupabase();
    const { data } = await supabase
      .from("forum_profiles")
      .select(
        "user_id, pseudo, avatar_url, bio, persona, level, points, discussions_count, replies_count, upvotes_received, member_since, pseudo_enabled",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile((data as ForumProfile | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  return { profile, loading: loading || authLoading, refresh, user };
}
