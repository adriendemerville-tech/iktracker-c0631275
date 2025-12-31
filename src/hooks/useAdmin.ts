import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: isAdmin = false, isLoading: roleLoading } = useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (error) {
        // Avoid leaking details; just report and treat as non-admin.
        console.error('Error checking admin role:', error);
        return false;
      }

      return data === true;
    },
    // Wait until auth is initialized to avoid redirect loops during initial load.
    enabled: !authLoading && !!user,
  });

  return { isAdmin, isLoading: authLoading || roleLoading };
};
