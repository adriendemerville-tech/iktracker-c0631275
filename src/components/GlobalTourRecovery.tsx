import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTourSessionDB, TourSessionDB } from '@/hooks/useTourSessionDB';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logTourRecovery } from '@/lib/tour-recovery-log';

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
  const isMobile = useIsMobile();
  const { fetchActiveSession, endSession } = useTourSessionDB();
  
  const [showModal, setShowModal] = useState(false);
  const [sessionData, setSessionData] = useState<TourSessionDB | null>(null);
  const [inactivityText, setInactivityText] = useState('');
  const [hasChecked, setHasChecked] = useState(() => {
    return sessionStorage.getItem('tour_recovery_checked') === 'true';
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user || hasChecked) return;

    const check = async () => {
      try {
        const session = await fetchActiveSession();
        setHasChecked(true);
        sessionStorage.setItem('tour_recovery_checked', 'true');
        if (!session) return;

        const lastActivity = new Date(session.last_activity).getTime();
        const inactivity = Date.now() - lastActivity;
        const inactivitySec = Math.round(inactivity / 1000);

        console.log('[GlobalTourRecovery] Found active session, isMobile:', isMobile, 'inactivity:', inactivitySec, 's');

        // Desktop: always auto-finalize
        if (!isMobile) {
          logTourRecovery({
            eventType: 'auto_finalize_attempt',
            sessionId: session.id,
            context: 'desktop_detected',
            inactivitySeconds: inactivitySec,
            isMobile: false,
            stopsCount: session.stops.length,
            distanceKm: session.total_distance_km,
          });
          await autoFinalize(session, true);
          return;
        }

        // Mobile recovery logic
        if (inactivity < TRANSPARENT_THRESHOLD) {
          logTourRecovery({
            eventType: 'transparent_resume_attempt',
            sessionId: session.id,
            context: location.pathname,
            inactivitySeconds: inactivitySec,
            isMobile: true,
            stopsCount: session.stops.length,
            distanceKm: session.total_distance_km,
          });
          try {
            // CRITICAL: Update DB last_activity IMMEDIATELY so next reload doesn't re-detect "lost session"
            await supabase
              .from('tour_sessions')
              .update({ last_activity: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
              .eq('user_id', session.user_id)
              .eq('is_active', true);

            restoreToLocalStorage(session);
            sessionStorage.setItem('tour_force_resume', 'true');
            sessionStorage.setItem('tour_is_resuming', 'true');

            // Single unified toast for resume
            toast.success('Tournée reprise', {
              description: `${session.stops.length} étape${session.stops.length > 1 ? 's' : ''} • ${session.total_distance_km.toFixed(1)} km`,
              duration: 3000,
            });

            if (location.pathname.startsWith('/app')) {
              window.dispatchEvent(new Event('tour_force_resume'));
            } else {
              navigate('/app');
            }
            logTourRecovery({
              eventType: 'transparent_resume_success',
              sessionId: session.id,
              isMobile: true,
            });
          } catch (e: any) {
            logTourRecovery({
              eventType: 'transparent_resume_error',
              sessionId: session.id,
              errorMessage: e?.message ?? String(e),
              isMobile: true,
            });
          }
        } else if (inactivity < MODAL_THRESHOLD) {
          setSessionData(session);
          setInactivityText(formatInactivity(inactivity));
          setShowModal(true);
          logTourRecovery({
            eventType: 'modal_shown',
            sessionId: session.id,
            inactivitySeconds: inactivitySec,
            isMobile: true,
            stopsCount: session.stops.length,
            distanceKm: session.total_distance_km,
          });
        } else {
          logTourRecovery({
            eventType: 'auto_finalize_attempt',
            sessionId: session.id,
            context: 'inactivity_threshold_exceeded',
            inactivitySeconds: inactivitySec,
            isMobile: true,
            stopsCount: session.stops.length,
            distanceKm: session.total_distance_km,
          });
          await autoFinalize(session);
        }
      } catch (e: any) {
        console.warn('[GlobalTourRecovery] Error checking session:', e);
        setHasChecked(true);
        sessionStorage.setItem('tour_recovery_checked', 'true');
        logTourRecovery({
          eventType: 'check_error',
          errorMessage: e?.message ?? String(e),
        });
      }
    };

    check();
  }, [user, hasChecked]);

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
      throw e;
    }
  };

  const autoFinalize = async (session: TourSessionDB, fromDesktop = false) => {
    console.log('[GlobalTourRecovery] Auto-finalizing session with', session.stops.length, 'stops', fromDesktop ? '(desktop)' : '');

    try {
      if (session.stops.length >= 1) {
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

          const { data: insertedTrip, error: insertError } = await supabase.from('trips').insert({
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
          }).select('id').maybeSingle();

          if (insertError) throw insertError;

          toast.info(
            fromDesktop 
              ? "Dernière tournée enregistrée dans vos trajets." 
              : "Tournée récupérée automatiquement",
            {
              description: `${session.stops.length} étape${session.stops.length > 1 ? 's' : ''} • ${session.total_distance_km.toFixed(1)} km`,
              duration: 6000,
            }
          );
          logTourRecovery({
            eventType: 'toast_shown',
            sessionId: session.id,
            tripId: insertedTrip?.id ?? null,
            context: fromDesktop ? 'desktop_auto_finalize' : 'mobile_auto_finalize',
          });
          logTourRecovery({
            eventType: 'auto_finalize_success',
            sessionId: session.id,
            tripId: insertedTrip?.id ?? null,
            isMobile: !fromDesktop,
            stopsCount: session.stops.length,
            distanceKm: session.total_distance_km,
          });
        }
      }

      await endSession();
      logTourRecovery({ eventType: 'session_end', sessionId: session.id });
    } catch (e: any) {
      logTourRecovery({
        eventType: 'auto_finalize_error',
        sessionId: session.id,
        errorMessage: e?.message ?? String(e),
        isMobile: !fromDesktop,
      });
      throw e;
    }
  };

  const handleResume = useCallback(async () => {
    if (!sessionData) return;
    setShowModal(false);
    logTourRecovery({
      eventType: 'resume_clicked',
      sessionId: sessionData.id,
      isMobile: true,
    });

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase
          .from('tour_sessions')
          .update({ last_activity: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
          .eq('user_id', currentUser.id)
          .eq('is_active', true);
      }

      restoreToLocalStorage(sessionData);
      sessionStorage.setItem('tour_force_resume', 'true');
      sessionStorage.setItem('tour_is_resuming', 'true');

      toast.success('Tournée reprise', {
        description: `${sessionData.stops.length} étape${sessionData.stops.length > 1 ? 's' : ''} • ${sessionData.total_distance_km.toFixed(1)} km`,
        duration: 3000,
      });

      if (location.pathname.startsWith('/app')) {
        window.dispatchEvent(new Event('tour_force_resume'));
      } else {
        navigate('/app');
      }
      logTourRecovery({
        eventType: 'resume_success',
        sessionId: sessionData.id,
        isMobile: true,
      });
    } catch (e: any) {
      logTourRecovery({
        eventType: 'resume_error',
        sessionId: sessionData.id,
        errorMessage: e?.message ?? String(e),
        isMobile: true,
      });
    }
  }, [sessionData, navigate, location.pathname]);

  const handleFinalize = useCallback(async () => {
    if (!sessionData) return;
    setIsProcessing(true);
    setShowModal(false);
    logTourRecovery({
      eventType: 'finalize_clicked',
      sessionId: sessionData.id,
      isMobile: true,
    });
    try {
      await autoFinalize(sessionData);
    } catch {
      /* already logged in autoFinalize */
    }
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
