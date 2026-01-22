import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthLazy } from '@/hooks/useAuthLazy';

/**
 * Lazy admin check hook for marketing/public pages.
 * Uses useAuthLazy to avoid blocking initial render.
 */
export const useAdminLazy = () => {
  const { user, loading: authLoading } = useAuthLazy();

  const { data: isAdmin = false, isLoading: roleLoading } = useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }

      return data === true;
    },
    enabled: !authLoading && !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return { isAdmin, isLoading: authLoading || roleLoading };
};
