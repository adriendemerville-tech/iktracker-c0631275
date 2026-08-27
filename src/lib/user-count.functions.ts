import { createServerFn } from "@tanstack/react-start";

/**
 * Public offset applied to the real user count for social-proof display.
 * Kept in one place so it is never lost or applied twice.
 */
export const USER_COUNT_OFFSET = 1000;

/**
 * Returns the number of registered users (auth.users) plus a public offset.
 * Used for the homepage social-proof counter. Safe to call from public routes.
 */
export const getRegisteredUserCount = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await (supabaseAdmin.rpc as any)("get_public_user_count");

    if (error) {
      console.error("Failed to count registered users:", error);
      return { count: USER_COUNT_OFFSET, offset: USER_COUNT_OFFSET };
    }

    const base = typeof data === "number" ? data : 0;
    return { count: base + USER_COUNT_OFFSET, offset: USER_COUNT_OFFSET };
  },
);
