import { createServerFn } from "@tanstack/react-start";

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
      return { count: 1000, offset: 1000 };
    }

    const base = typeof data === "number" ? data : 0;
    return { count: base + 1000, offset: 1000 };
  },
);
