import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TourStop } from './useTourTracker';

export interface TourSessionDB {
  id: string;
  user_id: string;
  started_at: string;
  last_activity: string;
  is_active: boolean;
  stops: TourStop[];
  gps_points: Array<{ lat: number; lng: number; timestamp: number; accuracy: number }>;
  total_distance_km: number;
  pending_stop: any;
}

// Debounce interval for DB writes (avoid spamming on every GPS point)
const DB_SYNC_INTERVAL = 30_000; // 30 seconds

/**
 * Hook to sync tour session state with the database.
 * This ensures tour data survives browser/tab closure on mobile.
 */
export function useTourSessionDB() {
  const lastSyncRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);

  /**
   * Create a new tour session in DB
   */
  const createSession = useCallback(async (startTime: Date): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Deactivate any existing active sessions first
    await supabase
      .from('tour_sessions')
      .update({ is_active: false, updated_at: new Date().toISOString() } as any)
      .eq('user_id', user.id)
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('tour_sessions')
      .insert({
        user_id: user.id,
        started_at: startTime.toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true,
        stops: [],
        gps_points: [],
        total_distance_km: 0,
      } as any)
      .select('id')
      .single();

    if (error) {
      console.warn('[TourSessionDB] Failed to create session:', error.message);
      return null;
    }

    sessionIdRef.current = data.id;
    lastSyncRef.current = Date.now();
    console.log('[TourSessionDB] Session created:', data.id);
    return data.id;
  }, []);

  /**
   * Update the active session in DB (debounced)
   */
  const updateSession = useCallback(async (data: {
    stops?: TourStop[];
    totalDistanceKm?: number;
    gpsPoints?: Array<{ lat: number; lng: number; timestamp: number; accuracy: number }>;
    pendingStop?: any;
  }, force = false) => {
    const now = Date.now();
    if (!force && now - lastSyncRef.current < DB_SYNC_INTERVAL) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updatePayload: Record<string, any> = {
      last_activity: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (data.stops) {
      updatePayload.stops = data.stops.map(s => ({
        ...s,
        timestamp: s.timestamp instanceof Date ? s.timestamp.toISOString() : s.timestamp,
      }));
    }
    if (data.totalDistanceKm !== undefined) {
      updatePayload.total_distance_km = data.totalDistanceKm;
    }
    if (data.gpsPoints) {
      // Only keep last 500 GPS points to avoid huge payloads
      updatePayload.gps_points = data.gpsPoints.slice(-500);
    }
    if (data.pendingStop !== undefined) {
      updatePayload.pending_stop = data.pendingStop;
    }

    const { error } = await supabase
      .from('tour_sessions')
      .update(updatePayload as any)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.warn('[TourSessionDB] Failed to update session:', error.message);
    } else {
      lastSyncRef.current = now;
    }
  }, []);

  /**
   * End the active session in DB
   */
  const endSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('tour_sessions')
      .update({ is_active: false, updated_at: new Date().toISOString() } as any)
      .eq('user_id', user.id)
      .eq('is_active', true);

    sessionIdRef.current = null;
    console.log('[TourSessionDB] Session ended');
  }, []);

  /**
   * Fetch the active session from DB (called on app startup)
   */
  const fetchActiveSession = useCallback(async (): Promise<TourSessionDB | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('tour_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    // Reconstruct TourStop dates
    const rawData = data as any;
    const stops = (rawData.stops || []).map((s: any) => ({
      ...s,
      timestamp: new Date(s.timestamp),
    }));

    sessionIdRef.current = rawData.id;

    return {
      id: rawData.id,
      user_id: rawData.user_id,
      started_at: rawData.started_at,
      last_activity: rawData.last_activity,
      is_active: rawData.is_active,
      stops,
      gps_points: rawData.gps_points || [],
      total_distance_km: rawData.total_distance_km || 0,
      pending_stop: rawData.pending_stop,
    };
  }, []);

  return {
    createSession,
    updateSession,
    endSession,
    fetchActiveSession,
  };
}
