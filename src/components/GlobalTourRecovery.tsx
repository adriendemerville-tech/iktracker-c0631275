import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from '@/lib/router-compat';
import { useAuth } from '@/hooks/useAuth';
import { useTourSessionDB, TourSessionDB } from '@/hooks/useTourSessionDB';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logTourRecovery } from '@/lib/tour-recovery-log';
import { loadGoogleMapsAsync } from '@/hooks/useGoogleMaps';
import { reverseGeocode } from '@/lib/geocoding';
import { detectLoop } from '@/lib/loop-detection';
import { getDistanceMeters } from '@/lib/loop-detection';
import { TourRecoveryModal } from '@/components/TourRecoveryModal';
import type { TourStop } from '@/hooks/useTourTracker';

// Time thresholds
const TRANSPARENT_THRESHOLD = 20 * 60 * 1000; // 20 minutes
const MODAL_THRESHOLD = 4 * 60 * 60 * 1000; // 4 hours

// Minimum GPS distance to consider a tour without stops as a real trip (km)
const MIN_GPS_DISTANCE_KM = 2;

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
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem('tour_recovery_checked') === 'true';
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user || hasChecked) return;

    // Robust mobile detection (independent of useIsMobile hydration timing)
    // Desktop = wide screen AND no touch/mobile UA. Anything else = mobile.
    const detectIsMobileStrict = (): boolean => {
      if (typeof window === 'undefined') return false;
      const width = window.innerWidth || 0;
      const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
      const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      // Treat as desktop only if wide screen AND no touch AND no mobile UA
      if (width >= 1024 && !hasTouch && !mobileUA) return false;
      return true;
    };

    const check = async () => {
      try {
        const session = await fetchActiveSession();
        setHasChecked(true);
        sessionStorage.setItem('tour_recovery_checked', 'true');
        if (!session) return;

        const lastActivity = new Date(session.last_activity).getTime();
        const inactivity = Date.now() - lastActivity;
        const inactivitySec = Math.round(inactivity / 1000);

        const isMobileStrict = detectIsMobileStrict();
        console.log('[GlobalTourRecovery] Found active session, isMobile:', isMobile, 'isMobileStrict:', isMobileStrict, 'inactivity:', inactivitySec, 's');

        // Desktop: always auto-finalize. Use strict detection to avoid false desktop on mobile hydration.
        if (!isMobileStrict) {
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

  const clearTourLocalStorage = () => {
    try {
      [
        'tour_active',
        'tour_start_time',
        'tour_stops',
        'tour_gps_points',
        'tour_total_distance',
        'tour_last_activity',
        'tour_pending_stop',
      ].forEach(key => localStorage.removeItem(key));
      sessionStorage.removeItem('tour_force_resume');
      sessionStorage.removeItem('tour_is_resuming');
      console.log('[GlobalTourRecovery] Cleared tour localStorage');
    } catch (e) {
      console.warn('[GlobalTourRecovery] Failed to clear localStorage:', e);
    }
  };

  // Resolve a city name from a GPS point via reverse geocoding (best effort)
  const resolveCityFromGps = async (lat: number, lng: number, fallback: string): Promise<string> => {
    try {
      const ok = await loadGoogleMapsAsync(8000);
      if (!ok) return fallback;
      const result = await reverseGeocode(lat, lng);
      return result?.city || fallback;
    } catch {
      return fallback;
    }
  };

  const autoFinalize = async (session: TourSessionDB, fromDesktop = false) => {
    const stopsCount = session.stops.length;
    const gpsPoints = session.gps_points || [];
    const hasGps = gpsPoints.length > 0;
    const distanceKm = session.total_distance_km || 0;

    console.log(
      '[GlobalTourRecovery] Auto-finalizing session',
      { stopsCount, gpsPoints: gpsPoints.length, distanceKm, fromDesktop }
    );

    try {
      // Determine which case applies
      // A: ≥2 stops → full tour
      // B: 1 stop + GPS → trip with reverse-geocoded end
      // C: 1 stop + no GPS → trip "À compléter"
      // D: 0 stop + GPS + distance ≥ MIN_GPS_DISTANCE_KM → reverse-geocoded trip
      // E: 0 stop + no GPS or distance < MIN_GPS_DISTANCE_KM → discard
      const isCaseE = stopsCount === 0 && (!hasGps || distanceKm < MIN_GPS_DISTANCE_KM);

      if (!isCaseE) {
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('id')
          .eq('user_id', session.user_id)
          .limit(1);

        if (vehicles && vehicles.length > 0) {
          const vehicleId = vehicles[0].id;
          const isTour = stopsCount >= 2;

          let startLocation = 'À compléter';
          let endLocation = 'À compléter';
          let tourStopsData: any = undefined;
          let purpose = 'Trajet à vérifier';
          let caseLabel = '';

          if (isTour) {
            // Case A
            const firstStop = session.stops[0];
            const lastStop = session.stops[stopsCount - 1];
            startLocation = firstStop.city || firstStop.address || 'Position';
            endLocation = lastStop.city || lastStop.address || 'À compléter';
            tourStopsData = session.stops.map(s => ({
              id: s.id,
              timestamp: s.timestamp instanceof Date ? s.timestamp.toISOString() : s.timestamp,
              lat: s.lat,
              lng: s.lng,
              address: s.address,
              city: s.city,
              duration: s.duration,
            }));
            const loopResult = detectLoop(
              session.stops.map(s => ({ lat: s.lat, lng: s.lng })),
              distanceKm,
            );
            if (loopResult.isLoop) {
              purpose = 'Tournée récupérée (aller-retour)';
              caseLabel = 'A_full_tour_loop';
            } else {
              purpose = 'Tournée récupérée';
              caseLabel = 'A_full_tour';
            }
          } else if (stopsCount === 1) {
            const firstStop = session.stops[0];
            startLocation = firstStop.city || firstStop.address || 'Position';
            if (hasGps) {
              // Case B: reverse-geocode last GPS point
              const lastGps = gpsPoints[gpsPoints.length - 1];
              endLocation = await resolveCityFromGps(lastGps.lat, lastGps.lng, 'À compléter');
              caseLabel = 'B_one_stop_with_gps';
            } else {
              // Case C
              endLocation = 'À compléter';
              caseLabel = 'C_one_stop_no_gps';
            }
            purpose = 'Trajet à vérifier';
          } else {
            // Case D: 0 stop, GPS available, distance ≥ MIN_GPS_DISTANCE_KM
            const firstGps = gpsPoints[0];
            const lastGps = gpsPoints[gpsPoints.length - 1];
            startLocation = await resolveCityFromGps(firstGps.lat, firstGps.lng, 'Départ inconnu');
            endLocation = await resolveCityFromGps(lastGps.lat, lastGps.lng, 'À compléter');
            purpose = 'Trajet à vérifier';
            caseLabel = 'D_no_stop_with_gps';
          }

          const { data: insertedTrip, error: insertError } = await supabase.from('trips').insert({
            user_id: session.user_id,
            vehicle_id: vehicleId,
            start_location: startLocation,
            end_location: endLocation,
            distance: distanceKm,
            date: new Date(session.started_at).toISOString().split('T')[0],
            round_trip: caseLabel === 'A_full_tour_loop',
            purpose,
            tour_stops: tourStopsData,
            status: 'pending_location',
            source: 'tour',
          }).select('id').maybeSingle();

          if (insertError) throw insertError;

          const toastTitle = fromDesktop
            ? 'Dernière tournée enregistrée dans vos trajets.'
            : isTour
              ? 'Tournée terminée automatiquement'
              : 'Trajet à vérifier ajouté';

          toast.info(toastTitle, {
            description: isTour
              ? `${stopsCount} étapes • ${distanceKm.toFixed(1)} km`
              : `${distanceKm.toFixed(1)} km • à vérifier dans Mes trajets`,
            duration: 6000,
          });

          logTourRecovery({
            eventType: 'toast_shown',
            sessionId: session.id,
            tripId: insertedTrip?.id ?? null,
            context: `${fromDesktop ? 'desktop' : 'mobile'}_auto_finalize_${caseLabel}`,
          });
          logTourRecovery({
            eventType: 'auto_finalize_success',
            sessionId: session.id,
            tripId: insertedTrip?.id ?? null,
            isMobile: !fromDesktop,
            stopsCount,
            distanceKm,
            context: caseLabel,
          });
        }
      } else {
        console.log('[GlobalTourRecovery] Case E: discarding session (no stops, insufficient GPS data)');
        logTourRecovery({
          eventType: 'auto_finalize_success',
          sessionId: session.id,
          tripId: null,
          isMobile: !fromDesktop,
          stopsCount: 0,
          distanceKm,
          context: 'E_discarded_no_data',
        });
      }

    } catch (e: any) {
      logTourRecovery({
        eventType: 'auto_finalize_error',
        sessionId: session.id,
        errorMessage: e?.message ?? String(e),
        isMobile: !fromDesktop,
      });
    } finally {
      // CRITICAL: Always end DB session AND clear localStorage to avoid zombie sessions
      // (same behavior as manual "Terminer" by the user — no resumable state remains)
      try {
        await endSession();
      } catch (endErr) {
        console.warn('[GlobalTourRecovery] endSession failed, forcing DB cleanup:', endErr);
        // Fallback: directly update DB if endSession hook fails
        try {
          await supabase
            .from('tour_sessions')
            .update({ is_active: false, updated_at: new Date().toISOString() } as any)
            .eq('id', session.id);
        } catch { /* last resort */ }
      }
      clearTourLocalStorage();
      logTourRecovery({ eventType: 'session_end', sessionId: session.id });
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

  const [isAddingLocation, setIsAddingLocation] = useState(false);

  const handleAddCurrentLocation = useCallback(async () => {
    if (!sessionData || isAddingLocation) return;
    if (!('geolocation' in navigator)) {
      toast.error('Géolocalisation indisponible sur ce navigateur');
      return;
    }
    setIsAddingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        });
      });

      const { latitude: lat, longitude: lng } = position.coords;

      // Best-effort reverse geocoding (don't block on failure)
      let city = '';
      let address = '';
      try {
        const ok = await loadGoogleMapsAsync(5000);
        if (ok) {
          const geo = await reverseGeocode(lat, lng);
          if (geo) {
            city = geo.city || '';
            address = geo.fullAddress || '';
          }
        }
      } catch { /* fallback to coords */ }

      const newStop: TourStop = {
        id: `manual-${Date.now()}`,
        timestamp: new Date(),
        lat,
        lng,
        address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        city: city || 'Position actuelle',
      };

      // Compute incremental distance from previous stop (Haversine fallback —
      // finalisation re-calcule via Distance Matrix de toute façon)
      const prevStop = sessionData.stops[sessionData.stops.length - 1];
      const deltaKm = prevStop
        ? getDistanceMeters({ lat: prevStop.lat, lng: prevStop.lng }, { lat, lng }) / 1000
        : 0;

      const updatedStops = [...sessionData.stops, newStop];
      const updatedDistance = (sessionData.total_distance_km || 0) + deltaKm;

      // Persist to DB
      const { error } = await supabase
        .from('tour_sessions')
        .update({
          stops: updatedStops.map(s => ({
            ...s,
            timestamp: s.timestamp instanceof Date ? s.timestamp.toISOString() : s.timestamp,
          })),
          total_distance_km: updatedDistance,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', sessionData.id);

      if (error) throw error;

      // Update local state so modal re-renders with the new stop
      setSessionData({
        ...sessionData,
        stops: updatedStops,
        total_distance_km: updatedDistance,
      });

      toast.success('Position ajoutée', {
        description: city || address || 'Position GPS enregistrée',
        duration: 2500,
      });
      logTourRecovery({
        eventType: 'manual_stop_added',
        sessionId: sessionData.id,
        isMobile: true,
        stopsCount: updatedStops.length,
        distanceKm: updatedDistance,
      });
    } catch (e: any) {
      const msg = e?.code === 1
        ? 'Autorisation de localisation refusée'
        : e?.code === 3
          ? 'Localisation trop longue — réessayez'
          : 'Impossible d\'obtenir votre position';
      toast.error(msg);
      logTourRecovery({
        eventType: 'manual_stop_error',
        sessionId: sessionData.id,
        errorMessage: e?.message ?? String(e),
        isMobile: true,
      });
    } finally {
      setIsAddingLocation(false);
    }
  }, [sessionData, isAddingLocation]);

  if (!showModal || !sessionData) return null;

  return (
    <TourRecoveryModal
      open={showModal}
      inactivityDuration={inactivityText}
      stopsCount={sessionData.stops.length}
      distanceKm={sessionData.total_distance_km}
      stops={sessionData.stops}
      startedAt={sessionData.started_at}
      onResume={handleResume}
      onFinalize={handleFinalize}
      onAddCurrentLocation={handleAddCurrentLocation}
      isAddingLocation={isAddingLocation}
      isProcessing={isProcessing}
    />
  );
}

