import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Feedback {
  id: string;
  user_id: string;
  message: string;
  image_url: string | null;
  response: string | null;
  responded_at: string | null;
  read_by_user: boolean;
  created_at: string;
}

export const useFeedback = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['feedbacks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Feedback[];
    },
    enabled: !!user,
  });

  const unreadResponsesCount = feedbacks.filter(
    f => f.response && !f.read_by_user
  ).length;

  const markAsRead = useMutation({
    mutationFn: async (feedbackId: string) => {
      const { error } = await supabase
        .from('feedback')
        .update({ read_by_user: true })
        .eq('id', feedbackId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const unreadIds = feedbacks
        .filter(f => f.response && !f.read_by_user)
        .map(f => f.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('feedback')
        .update({ read_by_user: true })
        .in('id', unreadIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
  });

  return {
    feedbacks,
    isLoading,
    unreadResponsesCount,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
};
