import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTourSessionDB, TourSessionDB } from '@/hooks/useTourSessionDB';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TourRecoveryModal = lazy(() => import('@/components/TourRecoveryModal').then(m => ({ default: m.TourRecoveryModal })));

// Time thresholds
const TRANSPARENT_THRESHOLD = 20 * 60 * 1000; // 20 minutes
const MODAL_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours

function formatInactivity(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours >= 1) {
    const rem = minutes % 60;
    return rem > 0 ? `${hours}h ${rem}min` : `${hours}h`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Global component that checks for active tour sessions in DB on any page.
 * Shows recovery modal or navigates to /app for transparent resume.
 * Must be placed inside BrowserRouter and after auth is available.
 */
export function GlobalTourRecovery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchActiveSession, endSession } = useTourSessionDB();
  
  const [showModal, setShowModal] = useState(false);
  const [sessionData, setSessionData] = useState<TourSessionDB | null>(null);
  const [inactivityText, setInactivityText] = useState('');
  const [hasChecked, setHasChecked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check DB for active session on mount and when user changes
  useEffect(() => {
    if (!user || hasChecked) return;

    const check = async () => {
      try {
        const session = await fetchActiveSession();
        setHasChecked(true);
        
        if (!session) return;

        const lastActivity = new Date(session.last_activity).getTime();
        const inactivity = Date.now() - lastActivity;

        console.log('[GlobalTourRecovery] Found active session, inactivity:', Math.round(inactivity / 1000), 's');

        if (inactivity < TRANSPARENT_THRESHOLD) {
          // Case A: transparent resume — navigate to /app which handles localStorage recovery
          // Also write session data back to localStorage so Index.tsx can pick it up
          restoreToLocalStorage(session);
          if (!location.pathname.startsWith('/app')) {
            navigate('/app');
          }
          // Index.tsx will handle the actual resume via localStorage
        } else if (inactivity < MODAL_THRESHOLD) {
          // Case B: show modal
          setSessionData(session);
          setInactivityText(formatInactivity(inactivity));
          setShowModal(true);
        } else {
          // Case C: auto finalize — convert to trips and close session
          await autoFinalize(session);
        }
      } catch (e) {
        console.warn('[GlobalTourRecovery] Error checking session:', e);
        setHasChecked(true);
      }
    };

    check();
  }, [user, hasChecked]);

  // Restore DB session data to localStorage so useTourTracker can resume
  const restoreToLocalStorage = (session: TourSessionDB) => {
    try {
      localStorage.setItem('tour_active', JSON.stringify(true));
      localStorage.setItem('tour_start_time', JSON.stringify(session.started_at));
      localStorage.setItem('tour_stops', JSON.stringify(
        session.stops.map(s => ({
          ...s,
          timestamp: s.timestamp instanceof Date ? s.timestamp.toISOString() : s.timestamp,
        }))
      ));
      localStorage.setItem('tour_gps_points', JSON.stringify(session.gps_points));
      localStorage.setItem('tour_total_distance', JSON.stringify(session.total_distance_km));
      localStorage.setItem('tour_last_activity', JSON.stringify(new Date().toISOString()));
      if (session.pending_stop) {
        localStorage.setItem('tour_pending_stop', JSON.stringify(session.pending_stop));
      }
      console.log('[GlobalTourRecovery] Restored session to localStorage');
    } catch (e) {
      console.warn('[GlobalTourRecovery] Failed to restore to localStorage:', e);
    }
  };

  // Auto-finalize: create trips from session data and end session
  const autoFinalize = async (session: TourSessionDB) => {
    console.log('[GlobalTourRecovery] Auto-finalizing session with', session.stops.length, 'stops');

    if (session.stops.length >= 1) {
      // Get user's first vehicle
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('user_id', session.user_id)
        .limit(1);

      if (vehicles && vehicles.length > 0) {
        const vehicleId = vehicles[0].id;
        const firstStop = session.stops[0];
        const lastStop = session.stops[session.stops.length - 1];
        const isTour = session.stops.length >= 2;

        const tourStopsData = isTour ? session.stops.map(s => ({
          id: s.id,
          timestamp: s.timestamp instanceof Date ? s.timestamp.toISOString() : s.timestamp,
          lat: s.lat,
          lng: s.lng,
          address: s.address,
          city: s.city,
          duration: s.duration,
        })) : undefined;

        await supabase.from('trips').insert({
          user_id: session.user_id,
          vehicle_id: vehicleId,
          start_location: firstStop.city || firstStop.address || 'Position',
          end_location: lastStop.city || lastStop.address || 'À compléter',
          distance: session.total_distance_km,
          date: new Date(session.started_at).toISOString().split('T')[0],
          round_trip: false,
          purpose: isTour ? 'Tournée récupérée' : 'Trajet récupéré',
          tour_stops: tourStopsData as any,
          status: 'pending_location',
          source: 'tour',
        });

        toast.info("Tournée récupérée automatiquement", {
          description: `${session.stops.length} étape${session.stops.length > 1 ? 's' : ''} • ${session.total_distance_km.toFixed(1)} km`,
          duration: 5000,
        });
      }
    }

    await endSession();
  };

  // Resume: restore to localStorage, navigate to /app
  const handleResume = useCallback(async () => {
    if (!sessionData) return;
    setShowModal(false);

    // Update last_activity in DB
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await supabase
        .from('tour_sessions')
        .update({ last_activity: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
        .eq('user_id', currentUser.id)
        .eq('is_active', true);
    }

    restoreToLocalStorage(sessionData);
    navigate('/app');
  }, [sessionData, navigate]);

  // Finalize: convert to trips and close
  const handleFinalize = useCallback(async () => {
    if (!sessionData) return;
    setIsProcessing(true);
    setShowModal(false);
    await autoFinalize(sessionData);
    setIsProcessing(false);
  }, [sessionData]);

  if (!showModal || !sessionData) return null;

  return (
    <Suspense fallback={null}>
      <TourRecoveryModal
        open={showModal}
        inactivityDuration={inactivityText}
        stopsCount={sessionData.stops.length}
        distanceKm={sessionData.total_distance_km}
        onResume={handleResume}
        onFinalize={handleFinalize}
        isProcessing={isProcessing}
      />
    </Suspense>
  );
}
