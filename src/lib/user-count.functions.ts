import { createServerFn } from "@tanstack/react-start";

/**
 * Public offset applied to the real user count for social-proof display.
 * Kept in one place so it is never lost or applied twice.
 */
export const USER_COUNT_OFFSET = 1000;

/**
 * Returns the number of registered users (auth.users) plus a public offset.
 * Used for the homepage social-proof counter. Safe to call from public routes.
 * Cached server-side (10 min TTL) to avoid one DB round-trip per visit.
 */
export const getRegisteredUserCount = createServerFn({ method: "GET" }).handler(async () => {
  const { cachedStat, withDeadline, lastKnown, STAT_DEADLINE_MS } = await import(
    "@/lib/public-stats-cache.server"
  );

  const KEY = "public-user-count";

  try {
    // Le rendu serveur n'attend jamais plus de STAT_DEADLINE_MS la DB :
    // au-delà on rend la dernière valeur connue, le refresh continue en fond.
    const count = await withDeadline(
      cachedStat(KEY, async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await (supabaseAdmin.rpc as any)("get_public_user_count");
        if (error) throw error;
        const base = typeof data === "number" ? data : 0;
        return base + USER_COUNT_OFFSET;
      }),
      STAT_DEADLINE_MS,
      lastKnown(KEY, USER_COUNT_OFFSET),
    );
    return { count, offset: USER_COUNT_OFFSET };
  } catch (err) {
    console.error("Failed to count registered users:", err);
    return { count: USER_COUNT_OFFSET, offset: USER_COUNT_OFFSET };
  }
});
