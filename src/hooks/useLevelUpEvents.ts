import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/integrations/supabase/lazy";
import { useAuth } from "@/hooks/useAuth";
import { markLevelEventsSeen } from "@/lib/forum.functions";

export type LevelUpEvent = {
  id: string;
  level: string;
  previous_level: string | null;
  created_at: string;
};

/**
 * Récupère les passages de niveau non vus du membre connecté.
 * Utilisé pour déclencher la modale de célébration.
 */
export function useLevelUpEvents(enabled = true) {
  const { user } = useAuth();
  const [event, setEvent] = useState<LevelUpEvent | null>(null);

  const check = useCallback(async () => {
    if (!user || !enabled) return;
    const supabase = await getSupabase();
    const { data } = await supabase
      .from("forum_level_events")
      .select("id, level, previous_level, created_at")
      .eq("user_id", user.id)
      .is("seen_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    const next = (data?.[0] as LevelUpEvent | undefined) ?? null;
    // On n'annonce pas le niveau initial "nouveau".
    if (next && next.level !== "nouveau") setEvent(next);
  }, [user, enabled]);

  useEffect(() => {
    void check();
  }, [check]);

  const dismiss = useCallback(async () => {
    const current = event;
    setEvent(null);
    if (current) {
      try {
        await markLevelEventsSeen({ data: { ids: [current.id] } });
      } catch {
        /* non bloquant */
      }
    }
  }, [event]);

  return { event, dismiss, check };
}
