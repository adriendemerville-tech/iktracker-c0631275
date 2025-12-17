import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CalendarConnection {
  id: string;
  provider: 'google' | 'outlook' | 'ics';
  isActive: boolean;
  icsUrl?: string;
  createdAt: Date;
}

export function useCalendarConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!user) {
      setConnections([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      setConnections(
        (data || []).map((conn) => ({
          id: conn.id,
          provider: conn.provider as 'google' | 'outlook' | 'ics',
          isActive: conn.is_active,
          icsUrl: conn.ics_url || undefined,
          createdAt: new Date(conn.created_at),
        }))
      );
    } catch (error) {
      console.error('Error fetching calendar connections:', error);
      toast.error('Erreur lors du chargement des agendas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const addIcsConnection = async (icsUrl: string) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('calendar_connections')
        .insert({
          user_id: user.id,
          provider: 'ics',
          ics_url: icsUrl,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      const newConnection: CalendarConnection = {
        id: data.id,
        provider: 'ics',
        isActive: true,
        icsUrl: data.ics_url || undefined,
        createdAt: new Date(data.created_at),
      };

      setConnections((prev) => [...prev, newConnection]);
      toast.success('Agenda ICS connecté');
      return newConnection;
    } catch (error) {
      console.error('Error adding ICS connection:', error);
      toast.error('Erreur lors de l\'ajout de l\'agenda');
      return null;
    }
  };

  const removeConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      toast.success('Agenda déconnecté');
    } catch (error) {
      console.error('Error removing connection:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleConnection = async (connectionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('calendar_connections')
        .update({ is_active: isActive })
        .eq('id', connectionId);

      if (error) throw error;

      setConnections((prev) =>
        prev.map((c) => (c.id === connectionId ? { ...c, isActive } : c))
      );
    } catch (error) {
      console.error('Error toggling connection:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getConnection = (provider: 'google' | 'outlook' | 'ics') => {
    return connections.find((c) => c.provider === provider);
  };

  return {
    connections,
    loading,
    addIcsConnection,
    removeConnection,
    toggleConnection,
    getConnection,
    refetch: fetchConnections,
  };
}
