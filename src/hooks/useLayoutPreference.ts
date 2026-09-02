import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Persists a UI layout value (widget order, card widths...) in the database,
 * with localStorage used as an instant-render cache.
 */
export function useLayoutPreference<T>(layoutKey: string, defaultValue: T, normalize?: (v: T) => T) {
  const { user } = useAuth();
  const normalizeRef = useRef(normalize);
  normalizeRef.current = normalize;

  const [value, setValue] = useState<T>(() => {
    try {
      const cached = localStorage.getItem(layoutKey);
      if (cached) {
        const parsed = JSON.parse(cached) as T;
        return normalizeRef.current ? normalizeRef.current(parsed) : parsed;
      }
    } catch {
      /* ignore */
    }
    return defaultValue;
  });

  // Load from DB (source of truth) once the user is known
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("ui_layouts")
        .select("value")
        .eq("user_id", user.id)
        .eq("layout_key", layoutKey)
        .maybeSingle();

      if (cancelled || error || !data?.value) return;
      const remote = data.value as T;
      const next = normalizeRef.current ? normalizeRef.current(remote) : remote;
      setValue(next);
      try {
        localStorage.setItem(layoutKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, layoutKey]);

  const save = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(layoutKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      if (!user) return;
      void supabase
        .from("ui_layouts")
        .upsert(
          { user_id: user.id, layout_key: layoutKey, value: next as never },
          { onConflict: "user_id,layout_key" },
        )
        .then(({ error }) => {
          if (error) console.warn("Failed to save layout", layoutKey, error);
        });
    },
    [user, layoutKey],
  );

  return [value, save] as const;
}
