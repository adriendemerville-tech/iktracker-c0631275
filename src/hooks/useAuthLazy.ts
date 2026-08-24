// Lazy auth hook for marketing pages - doesn't block initial render
// Returns null initially and updates asynchronously
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/integrations/supabase/lazy";

export const useAuthLazy = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // Start as false to not block render

  useEffect(() => {
    let mounted = true;

    // Check session asynchronously without blocking
    const checkSession = async () => {
      try {
        const supabase = await getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (mounted && session?.user) {
          setUser(session.user);
        }
      } catch {
        // Silent fail - marketing pages work without auth
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Defer auth check to after initial render for better LCP
    const timeoutId = setTimeout(checkSession, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return { user, loading };
};
