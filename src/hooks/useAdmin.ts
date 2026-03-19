import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AdminRole = 'admin' | 'viewer' | null;

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();

  const { data = { isAdmin: false, adminRole: null as AdminRole }, isLoading: roleLoading } = useQuery({
    queryKey: ['adminRole', user?.id],
    queryFn: async (): Promise<{ isAdmin: boolean; adminRole: AdminRole }> => {
      if (!user) return { isAdmin: false, adminRole: null };

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error checking admin role:', error);
        return { isAdmin: false, adminRole: null };
      }

      const roles = (data || []).map((r: any) => r.role as string);
      if (roles.includes('admin')) return { isAdmin: true, adminRole: 'admin' };
      if (roles.includes('viewer')) return { isAdmin: true, adminRole: 'viewer' };
      return { isAdmin: false, adminRole: null };
    },
    enabled: !authLoading && !!user,
  });

  return { isAdmin: data.isAdmin, adminRole: data.adminRole, isLoading: authLoading || roleLoading };
};
