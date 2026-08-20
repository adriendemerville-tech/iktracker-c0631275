import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TourStop } from "./useTourTracker";

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
const DB_SYNC_INTERVAL = 15_000; // 15 seconds

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Deactivate any existing active sessions first
    await supabase
      .from("tour_sessions")
      .update({ is_active: false, updated_at: new Date().toISOString() } as any)
      .eq("user_id", user.id)
      .eq("is_active", true);

    const { data, error } = await supabase
      .from("tour_sessions")
      .insert({
        user_id: user.id,
        started_at: startTime.toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true,
        stops: [],
        gps_points: [],
        total_distance_km: 0,
      } as any)
      .select("id")
      .single();

    if (error) {
      console.warn("[TourSessionDB] Failed to create session:", error.message);
      return null;
    }

    sessionIdRef.current = data.id;
    lastSyncRef.current = Date.now();
    console.log("[TourSessionDB] Session created:", data.id);
    return data.id;
  }, []);

  /**
   * Push sensor data to the backend (debounced).
   *
   * The tab is only a sensor: it sends raw GPS points and its local view of the
   * state. The server (`tour_session_ingest`) merges/dedupes points, recomputes
   * the distance itself and owns `last_activity`. It returns the authoritative
   * state so the UI can align on it.
   */
  const updateSession = useCallback(
    async (
      data: {
        stops?: TourStop[];
        totalDistanceKm?: number;
        gpsPoints?: Array<{ lat: number; lng: number; timestamp: number; accuracy: number }>;
        pendingStop?: unknown;
      },
      force = false,
    ): Promise<{ totalDistanceKm: number } | null> => {
      const now = Date.now();
      if (!force && now - lastSyncRef.current < DB_SYNC_INTERVAL) return null;

      const serializedStops = data.stops
        ? data.stops.map((s) => ({
            ...s,
            timestamp: s.timestamp instanceof Date ? s.timestamp.toISOString() : s.timestamp,
          }))
        : null;

      // Only send the most recent points; the server dedupes by timestamp.
      const points = data.gpsPoints ? data.gpsPoints.slice(-200) : [];

      const { data: result, error } = await supabase.rpc(
        "tour_session_ingest" as never,
        {
          _session_id: sessionIdRef.current,
          _points: points,
          _stops: serializedStops,
          _pending_stop: data.pendingStop ?? null,
          _client_distance_km: data.totalDistanceKm ?? null,
        } as never,
      );

      if (error) {
        console.warn("[TourSessionDB] Ingest failed:", error.message);
        return null;
      }

      lastSyncRef.current = now;
      const payload = result as {
        found?: boolean;
        session_id?: string;
        total_distance_km?: number;
      } | null;

      if (!payload?.found) return null;
      if (payload.session_id) sessionIdRef.current = payload.session_id;
      return { totalDistanceKm: payload.total_distance_km ?? 0 };
    },
    [],
  );

  /**
   * Server-side finalization: closes the session and creates the matching
   * "à compléter" trip exactly once (idempotent). Same code path as the
   * backend watchdog, so a tab that never comes back loses nothing.
   */
  const finalizeSessionServerSide = useCallback(
    async (sessionId: string, reason = "client"): Promise<{ tripId: string | null } | null> => {
      const { data, error } = await supabase.rpc(
        "tour_session_finalize" as never,
        { _session_id: sessionId, _reason: reason } as never,
      );
      if (error) {
        console.warn("[TourSessionDB] Finalize failed:", error.message);
        return null;
      }
      const payload = data as { trip_id?: string | null } | null;
      sessionIdRef.current = null;
      return { tripId: payload?.trip_id ?? null };
    },
    [],
  );

  /**
   * End the active session in DB
   */
  const endSession = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("tour_sessions")
      .update({ is_active: false, updated_at: new Date().toISOString() } as any)
      .eq("user_id", user.id)
      .eq("is_active", true);

    sessionIdRef.current = null;
    console.log("[TourSessionDB] Session ended");
  }, []);

  /**
   * Fetch the active session from DB (called on app startup)
   */
  const fetchActiveSession = useCallback(async (): Promise<TourSessionDB | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("tour_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
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

  const getCurrentSessionId = useCallback(() => sessionIdRef.current, []);

  return {
    createSession,
    updateSession,
    endSession,
    finalizeSessionServerSide,
    fetchActiveSession,
    getCurrentSessionId,
  };
}
