import { useState, useEffect, lazy, Suspense, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTrips } from '@/hooks/useTrips';
import { useTourTracker, TourStop, getInterruptedTour, clearInterruptedTour, TOUR_STORAGE_KEYS, loadTourData, saveTourData } from '@/hooks/useTourTracker';
import { usePreferences } from '@/hooks/usePreferences';
import { useFeedback } from '@/hooks/useFeedback';
import { useAdmin } from '@/hooks/useAdmin';
import { useGeolocationPermission } from '@/hooks/useGeolocationPermission';
import { calculateDrivingDistance } from '@/hooks/useGeolocation';
import { reverseGeocode } from '@/lib/geocoding';
import { IK_BAREME_2024, calculateTotalAnnualIK, getIKBareme } from '@/types/trip';
import { Counter } from '@/components/Counter';
import { TripCard } from '@/components/TripCard';
import { VehicleCard } from '@/components/VehicleCard';
import { TourButton } from '@/components/TourButton';
import { GeolocationBanner } from '@/components/GeolocationBanner';
import { ThresholdAlert } from '@/components/ThresholdAlert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InstallBanner } from '@/components/InstallBanner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, Plus, Car, MapPin, ChevronRight, UserCircle, Download, Shield, MessageSquareMore, BarChart3, Smartphone, Minus, ChevronDown } from 'lucide-react';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { useTutorial } from '@/hooks/useTutorial';
import { toast } from '@/components/ui/sonner';
// PDF/Print utils are loaded dynamically to avoid bundling in routes that don't need them
import { useIsMobile } from '@/hooks/use-mobile';

// Lazy loaded components - not needed for initial render
const NewTripSheet = lazy(() => import('@/components/NewTripSheet').then(m => ({ default: m.NewTripSheet })));
const VehicleForm = lazy(() => import('@/components/VehicleForm').then(m => ({ default: m.VehicleForm })));
const TourLogSheet = lazy(() => import('@/components/TourLogSheet').then(m => ({ default: m.TourLogSheet })));
const FocusTourView = lazy(() => import('@/components/FocusTourView').then(m => ({ default: m.FocusTourView })));
const ArchivedTripsSection = lazy(() => import('@/components/ArchivedTripsSection').then(m => ({ default: m.ArchivedTripsSection })));
const OnboardingTutorial = lazy(() => import('@/components/OnboardingTutorial').then(m => ({ default: m.OnboardingTutorial })));
const GeolocationTutorialModal = lazy(() => import('@/components/GeolocationTutorialModal').then(m => ({ default: m.GeolocationTutorialModal })));
const TourRecoveryModal = lazy(() => import('@/components/TourRecoveryModal').then(m => ({ default: m.TourRecoveryModal })));
const QRCodeSVG = lazy(() => import('qrcode.react').then(m => ({ default: m.QRCodeSVG })));

// Minimal loading fallback for sheets/modals
const SheetLoader = memo(() => null);

// QR Code placeholder with exact dimensions
const QRPlaceholder = memo(() => (
  <div className="w-[140px] h-[140px] bg-muted/50 rounded animate-pulse" />
));

const Index = () => {
  const navigate = useNavigate();
  const { preferences } = usePreferences();
  const { unreadResponsesCount } = useFeedback();
  const { isAdmin } = useAdmin();
  const {
    showBanner: showGeoBanner,
    showTutorialModal,
    isGpsDisabled,
    isLoading: geoPermissionLoading,
    requestPermission,
    dismissBanner,
    closeTutorialModal,
    markTourStarted,
  } = useGeolocationPermission();
  
  // Fetch pending feedbacks count for admins
  const { data: pendingFeedbacksCount = 0 } = useQuery({
    queryKey: ['pending-feedbacks-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('id', { count: 'exact' })
        .is('response', null);
      
      if (error) return 0;
      return data?.length || 0;
    },
    enabled: isAdmin,
  });
  const { 
    trips, 
    archivedTrips,
    savedLocations, 
    vehicles,
    totalKm, 
    totalIK, 
    getTotalAnnualKm,
    addTrip,
    deleteTrip,
    restoreTrip,
    permanentlyDeleteTrip,
    addLocation,
    updateLocation,
    deleteLocation,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  } = useTrips();
  
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showTourLog, setShowTourLog] = useState(false);
  const [showTourHistory, setShowTourHistory] = useState(false);
  const [showTourMobileOnly, setShowTourMobileOnly] = useState(false);
  const [showStopTourConfirm, setShowStopTourConfirm] = useState(false);
  const [tourStartRequested, setTourStartRequested] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [lastTour, setLastTour] = useState<TourStop[] | null>(null);
  
  const [hidePendingTrips, setHidePendingTrips] = useState(() => {
    return localStorage.getItem('iktracker_hide_pending') === 'true';
  });
  const isMobile = useIsMobile();
  
  // Persist hide pending preference
  const toggleHidePendingTrips = () => {
    const newValue = !hidePendingTrips;
    setHidePendingTrips(newValue);
    localStorage.setItem('iktracker_hide_pending', String(newValue));
  };
  const { showTutorial, completeTutorial, startTutorial } = useTutorial();
  
  const {
    isActive: isTourActive,
    isLoading: isTourLoading,
    error: tourError,
    stops: tourStops,
    totalDistanceKm,
    currentPosition,
    wakeLockActive,
    lowBattery,
    gpsAccuracy,
    gpsSignalStrength,
    tourStartTime,
    pendingStop,
    startTour,
    stopTour,
    clearTour,
    resumeTour,
    getSavedTourData,
  } = useTourTracker({
    stopDurationThreshold: preferences.stopDetectionMinutes * 60,
    locationRadius: preferences.locationRadiusMeters,
    trackingInterval: 10000,
    accuracyThreshold: 50,
  });

  // Session recovery state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryInactivity, setRecoveryInactivity] = useState('');
  const [recoveryData, setRecoveryData] = useState<{ stops: TourStop[]; totalDistanceKm: number } | null>(null);
  const [isRecoveryProcessing, setIsRecoveryProcessing] = useState(false);

  // Time thresholds — ⚠️ TEMP DEBUG VALUES (restore: 20min / 2h)
  const TRANSPARENT_THRESHOLD = 5 * 1000; // 5 seconds (was 20 minutes)
  const MODAL_THRESHOLD = 30 * 1000; // 30 seconds (was 2 hours)

  // Format inactivity duration
  const formatInactivity = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours >= 1) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  // Track if we've already recovered an interrupted tour this session
  const [hasRecoveredTour, setHasRecoveredTour] = useState(false);

  // NEW: Check for session recovery on mount based on inactivity time
  // Also handles foreground return (visibilitychange) to prevent false Case B/C
  useEffect(() => {
    if (hasRecoveredTour || isTourActive) return;
    
    const checkSessionRecovery = async () => {
      const isActive = loadTourData(TOUR_STORAGE_KEYS.TOUR_ACTIVE, false);
      console.log('[Recovery] isActive:', isActive);
      if (!isActive) return;
      
      const lastActivityStr = loadTourData<string | null>(TOUR_STORAGE_KEYS.TOUR_LAST_ACTIVITY, null);
      console.log('[Recovery] lastActivityStr:', lastActivityStr, 'type:', typeof lastActivityStr);
      if (!lastActivityStr) return;
      
      const lastActivity = new Date(lastActivityStr).getTime();
      console.log('[Recovery] lastActivity timestamp:', lastActivity, 'isNaN:', isNaN(lastActivity));
      if (isNaN(lastActivity)) return;
      const inactivity = Date.now() - lastActivity;
      console.log('[Recovery] inactivity:', inactivity, 'ms (~', Math.round(inactivity / 60000), 'min)', 
        '| TRANSPARENT_THRESHOLD:', TRANSPARENT_THRESHOLD, '| MODAL_THRESHOLD:', MODAL_THRESHOLD);
      
      const savedData = getSavedTourData();
      console.log('[Recovery] savedData:', savedData ? `${savedData.stops.length} stops, ${savedData.totalDistanceKm}km` : 'null');
      if (!savedData) return;
      
      if (inactivity < TRANSPARENT_THRESHOLD) {
        console.log('[Recovery] → Case A: transparent resume (inactivity < threshold)');
        setTourStartRequested(true);
        await resumeTour();
      } else if (inactivity < MODAL_THRESHOLD) {
        console.log('[Recovery] → Case B: show modal');
        setRecoveryData({ stops: savedData.stops, totalDistanceKm: savedData.totalDistanceKm });
        setRecoveryInactivity(formatInactivity(inactivity));
        setShowRecoveryModal(true);
      } else {
        console.log('[Recovery] → Case C: auto finalize (inactivity > 2h)');
        setHasRecoveredTour(true);
        if (savedData.stops.length >= 1 && vehicles.length > 0) {
          await handleConvertToTrips(savedData.stops);
        }
        clearTour();
      }
    };
    
    checkSessionRecovery();
  }, [vehicles.length]);

  // ⚡ FIX: On foreground return, if tour is NOT active in React state but IS active in localStorage,
  // update TOUR_LAST_ACTIVITY immediately and trigger transparent resume
  // This handles the case where the OS killed JS but the tour data is still in localStorage
  useEffect(() => {
    const handleForegroundRecovery = async () => {
      if (document.visibilityState !== 'visible') return;
      if (isTourActive || hasRecoveredTour) return;
      
      const isActive = loadTourData(TOUR_STORAGE_KEYS.TOUR_ACTIVE, false);
      if (!isActive) return;
      
      // Tour is active in localStorage but not in React state
      // This means the component remounted after OS suspension
      // Apply grace period: always resume transparently if < MODAL_THRESHOLD
      const lastActivityStr = loadTourData<string | null>(TOUR_STORAGE_KEYS.TOUR_LAST_ACTIVITY, null);
      if (!lastActivityStr) return;
      
      const inactivity = Date.now() - new Date(lastActivityStr).getTime();
      console.log('[ForegroundRecovery] Tour active in storage but not in state, inactivity:', Math.round(inactivity / 1000), 's');
      
      // Update activity timestamp immediately to prevent stale reads
      saveTourData(TOUR_STORAGE_KEYS.TOUR_LAST_ACTIVITY, new Date().toISOString());
      
      if (inactivity < MODAL_THRESHOLD) {
        // Grace: transparent resume for any background duration < 2h
        console.log('[ForegroundRecovery] → Grace resume (< 2h)');
        setTourStartRequested(true);
        await resumeTour();
      }
      // If > MODAL_THRESHOLD, the mount useEffect will handle Case C
    };
    
    document.addEventListener('visibilitychange', handleForegroundRecovery);
    return () => document.removeEventListener('visibilitychange', handleForegroundRecovery);
  }, [isTourActive, hasRecoveredTour, resumeTour]);

  // Handle recovery modal responses
  const handleRecoveryResume = async () => {
    setShowRecoveryModal(false);
    setTourStartRequested(true);
    await resumeTour();
  };

  const handleRecoveryFinalize = async () => {
    setIsRecoveryProcessing(true);
    setShowRecoveryModal(false);
    setHasRecoveredTour(true);
    
    if (recoveryData && recoveryData.stops.length >= 1 && vehicles.length > 0) {
      await handleConvertToTrips(recoveryData.stops);
    }
    clearTour();
    setIsRecoveryProcessing(false);
  };

  // Check for interrupted tours and create pending trips - only once
  useEffect(() => {
    // Don't recover if already done this session or no vehicles
    if (hasRecoveredTour || vehicles.length === 0) return;
    
    const recoverInterruptedTour = async () => {
      const interrupted = getInterruptedTour();
      if (!interrupted) return;
      
      // Mark as recovered BEFORE processing to prevent duplicates
      setHasRecoveredTour(true);
      // Clear the interrupted tour data immediately to prevent re-processing
      clearInterruptedTour();
      
      // Only recover if we have at least one stop
      if (interrupted.stops && interrupted.stops.length >= 1) {
        const firstStop = interrupted.stops[0];
        const vehicleId = vehicles[0].id;
        const isTour = interrupted.stops.length >= 2;
        
        // Convert TourStop[] to TourStopData[] for storage
        const tourStopsData = isTour ? interrupted.stops.map((stop: TourStop) => ({
          id: stop.id,
          timestamp: stop.timestamp instanceof Date ? stop.timestamp.toISOString() : stop.timestamp,
          lat: stop.lat,
          lng: stop.lng,
          address: stop.address,
          city: stop.city,
          duration: stop.duration,
        })) : undefined;

        try {
          // Create a trip with pending_location status
          await addTrip({
            vehicleId,
            startLocation: {
              id: firstStop.id,
              name: firstStop.city || firstStop.address || 'Position',
              address: firstStop.address || '',
              lat: firstStop.lat,
              lng: firstStop.lng,
              type: 'other',
            },
            endLocation: {
              id: crypto.randomUUID(),
              name: 'À compléter',
              address: '',
              type: 'other',
            },
            distance: interrupted.totalDistance || 0,
            baseDistance: interrupted.totalDistance || 0,
            roundTrip: false,
            purpose: isTour ? 'Tournée interrompue' : 'Trajet interrompu',
            startTime: firstStop.timestamp instanceof Date ? firstStop.timestamp : new Date(firstStop.timestamp),
            endTime: new Date(),
            tourStops: tourStopsData,
            status: 'pending_location', // Mark as pending so user can complete it
          });
          
          toast.info("Tournée récupérée", { duration: 3000 });
          
          console.log('Interrupted tour recovered as pending trip');
        } catch (e) {
          console.error('Failed to recover interrupted tour:', e);
        }
      }
    };

    recoverInterruptedTour();
  }, [vehicles, addTrip, hasRecoveredTour]);

  // Check for saved trip on reconnection
  useEffect(() => {
    const lastTripSaved = localStorage.getItem('iktracker_last_trip_saved');
    if (lastTripSaved) {
      try {
        const tripInfo = JSON.parse(lastTripSaved);
        // Only show notification if saved within the last 24 hours
        const savedAt = new Date(tripInfo.savedAt);
        const hoursAgo = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursAgo < 24) {
          toast.success("Dernier trajet enregistré", {
            description: `${tripInfo.distance.toFixed(1)} km${tripInfo.isTour ? ` - ${tripInfo.stopsCount} étapes` : ''}`,
            duration: 5000,
          });
        }
        // Clear after showing
        localStorage.removeItem('iktracker_last_trip_saved');
      } catch (e) {
        localStorage.removeItem('iktracker_last_trip_saved');
      }
    }
  }, []);

  // Only show the "tour started" toast when GPS start actually succeeds
  useEffect(() => {
    if (!tourStartRequested) return;

    if (isTourActive) {
      toast.success("Tournée démarrée", { duration: 2000 });
      setTourStartRequested(false);
      // Mark tour as started to hide geolocation banner for this session
      markTourStarted();
      return;
    }

    if (!isTourLoading && !isTourActive && tourError) {
      toast.error("Activer la localisation");
      setTourStartRequested(false);
    }
  }, [tourStartRequested, isTourActive, isTourLoading, tourError, markTourStarted]);

  const handleTourButtonClick = () => {
    if (isTourActive) {
      // Show confirmation dialog when tour is active
      setShowStopTourConfirm(true);
      return;
    }

    if (tourStops.length > 0) {
      setShowTourLog(true);
      return;
    }

    // Desktop: show info modal (no tour starts)
    if (!isMobile) {
      setShowTourMobileOnly(true);
      return;
    }

    // Mobile: start the tour
    setTourStartRequested(true);
    startTour();
  };

  const handleConfirmStopTour = () => {
    setShowStopTourConfirm(false);
    handleFinishTour();
  };

  const handleFinishTour = async () => {
    // Save the tour/trip based on number of stops
    if (tourStops.length >= 1) {
      await handleConvertToTrips(tourStops);
    } else {
      toast.error("Aucune étape détectée", {
        description: "Impossible d'enregistrer le trajet",
      });
      // Close sheet first, wait for it to fully disappear, then stop tour
      setShowTourLog(false);
      setTimeout(() => {
        stopTour();
        clearTour();
        // Show green "enregistré" notification for 4 seconds
        toast.success("Enregistré", { duration: 4000 });
      }, 800);
    }
  };

  const handleConvertToTrips = async (stops: TourStop[]) => {
    console.log('handleConvertToTrips called with stops:', stops);
    console.log('vehicles:', vehicles);
    
    if (stops.length < 1) {
      toast.error("Impossible de créer le trajet", {
        description: "Aucune étape détectée",
      });
      return;
    }
    
    if (vehicles.length === 0) {
      toast.error("Impossible de créer le trajet", {
        description: "Ajoutez d'abord un véhicule",
      });
      return;
    }

    

    const firstStop = stops[0];
    const vehicleId = vehicles[0].id;
    const isTour = stops.length >= 2;

    // Reverse-geocode first stop if it has no city
    let firstCity = firstStop.city;
    let firstAddress = firstStop.address;
    if (!firstCity && firstStop.lat && firstStop.lng) {
      try {
        const geo = await reverseGeocode(firstStop.lat, firstStop.lng);
        if (geo) {
          firstCity = geo.city;
          firstAddress = geo.fullAddress || firstAddress;
        }
      } catch (e) {
        console.warn('Failed to reverse-geocode first stop:', e);
      }
    }
    
    let totalDistance = 0;
    let endLocation: { lat: number; lng: number; address?: string; city?: string };

    if (isTour) {
      // Multiple stops: calculate total distance between all consecutive stops
      for (let i = 0; i < stops.length - 1; i++) {
        const start = stops[i];
        const end = stops[i + 1];
        try {
          const distance = await calculateDrivingDistance(
            start.lat,
            start.lng,
            end.lat,
            end.lng
          );
          totalDistance += distance;
        } catch (e) {
          console.warn('Failed to calculate distance segment:', e);
        }
      }
      const lastStop = stops[stops.length - 1];
      // Reverse-geocode last stop if it has no city
      let lastCity = lastStop.city;
      let lastAddress = lastStop.address;
      if (!lastCity && lastStop.lat && lastStop.lng) {
        try {
          const geo = await reverseGeocode(lastStop.lat, lastStop.lng);
          if (geo) {
            lastCity = geo.city;
            lastAddress = geo.fullAddress || lastAddress;
          }
        } catch (e) {
          console.warn('Failed to reverse-geocode last stop:', e);
        }
      }
      endLocation = {
        lat: lastStop.lat,
        lng: lastStop.lng,
        address: lastAddress,
        city: lastCity,
      };
    } else {
      // Single stop: use current position as end point or use tracked distance
      if (currentPosition) {
        try {
          totalDistance = await calculateDrivingDistance(
            firstStop.lat,
            firstStop.lng,
            currentPosition.lat,
            currentPosition.lng
          );
          // Get address for current position
          const geocodeResult = await reverseGeocode(currentPosition.lat, currentPosition.lng);
          endLocation = {
            lat: currentPosition.lat,
            lng: currentPosition.lng,
            address: geocodeResult?.fullAddress,
            city: geocodeResult?.city,
          };
        } catch (e) {
          console.warn('Failed to calculate distance:', e);
          // Fallback to tracked distance
          totalDistance = totalDistanceKm;
          endLocation = {
            lat: currentPosition.lat,
            lng: currentPosition.lng,
          };
        }
      } else {
        // No current position available, use tracked distance and same location
        totalDistance = totalDistanceKm || 0;
        endLocation = {
          lat: firstStop.lat,
          lng: firstStop.lng,
          address: firstStop.address,
          city: firstStop.city,
        };
      }
    }

    console.log(`Total distance: ${totalDistance} km, isTour: ${isTour}`);

    // Filter: don't save if below minimum distance
    if (preferences.minDistanceKm > 0 && totalDistance < preferences.minDistanceKm) {
      toast.info("Trajet non enregistré", {
        description: `Distance inférieure à ${preferences.minDistanceKm} km`,
      });
      clearTour();
      setShowTourLog(false);
      return;
    }

    // Convert TourStop[] to TourStopData[] for storage (only for tours)
    const tourStopsData = isTour ? stops.map(stop => ({
      id: stop.id,
      timestamp: stop.timestamp.toISOString(),
      lat: stop.lat,
      lng: stop.lng,
      address: stop.address,
      city: stop.city,
      duration: stop.duration,
    })) : undefined;

    try {
      const result = await addTrip({
        vehicleId,
        startLocation: {
          id: firstStop.id,
          name: firstCity || firstAddress || 'Position',
          address: firstAddress || '',
          lat: firstStop.lat,
          lng: firstStop.lng,
          type: 'other',
        },
        endLocation: {
          id: crypto.randomUUID(),
          name: endLocation.city || endLocation.address || 'Position',
          address: endLocation.address || '',
          lat: endLocation.lat,
          lng: endLocation.lng,
          type: 'other',
        },
        distance: totalDistance,
        baseDistance: totalDistance,
        roundTrip: false,
        purpose: isTour ? 'Tournée' : 'Trajet',
        startTime: firstStop.timestamp,
        endTime: new Date(),
        tourStops: tourStopsData,
        status: 'validated',
      });
      
      console.log('Trip created:', result);
      
      if (result) {
        // Store last trip info in localStorage for reconnection notification
        localStorage.setItem('iktracker_last_trip_saved', JSON.stringify({
          distance: totalDistance,
          isTour,
          stopsCount: stops.length,
          savedAt: new Date().toISOString(),
        }));
        
        // Close sheet first, wait for it to fully disappear, then stop tour and show notification
        setShowTourLog(false);
        setTimeout(() => {
          stopTour();
          clearTour();
          // Show green "Enregistré" notification for 4 seconds
          toast.success("Enregistré", { duration: 4000 });
          // Clear the stored trip info since user saw the notification
          localStorage.removeItem('iktracker_last_trip_saved');
        }, 800);
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch (e) {
      console.error('Failed to create trip:', e);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const recentTrips = trips.slice(0, 3);

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setShowVehicleForm(true);
  };

  const handleEditVehicle = (vehicleId: string) => {
    setEditingVehicle(vehicleId);
    setShowVehicleForm(true);
  };

  const getVehicle = (vehicleId: string) => vehicles.find(v => v.id === vehicleId);

  // Export functions
  const IKTRACKER_URL = 'https://iktracker.fr';
  const IKTRACKER_MENTION = `Généré conformément à la législation par IKtracker, outil gratuit de suivi des indemnités kilométriques. ${IKTRACKER_URL}`;

  const generateReadmeContent = () => {
    return `=== IKtracker ===

Application gratuite de suivi des indemnités kilométriques.

But : Simplifier le suivi et le calcul de vos indemnités kilométriques professionnelles conformément au barème fiscal en vigueur.

Fonctionnalités :
- Enregistrement des trajets professionnels
- Calcul automatique des indemnités selon le barème fiscal
- Génération de relevés PDF et CSV pour votre comptable
- Suivi en temps réel avec la fonction "Tournée"

C'est 100% GRATUIT !

Lien : ${IKTRACKER_URL}

---
${IKTRACKER_MENTION}
`;
  };

  const generateCSVContent = () => {
    // Calculate recalculated trips with cumulative km
    const grouped = new Map<string, typeof trips>();
    trips.forEach(trip => {
      const year = new Date(trip.startTime).getFullYear();
      const key = `${trip.vehicleId}-${year}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(trip);
    });

    const recalculatedTrips: (typeof trips[0] & { recalculatedIK: number; cumulativeKm: number; appliedRate: number })[] = [];

    grouped.forEach((vehicleTrips, key) => {
      const vehicleId = key.split('-')[0];
      const vehicle = getVehicle(vehicleId);
      const sorted = [...vehicleTrips].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      let cumulativeKm = 0;

      sorted.forEach(trip => {
        const prevCumulativeKm = cumulativeKm;
        cumulativeKm += trip.distance;

        if (!vehicle) {
          recalculatedTrips.push({ ...trip, recalculatedIK: trip.ikAmount, cumulativeKm, appliedRate: 0 });
          return;
        }

        const ikBefore = calculateTotalAnnualIK(prevCumulativeKm, vehicle.fiscalPower);
        const ikAfter = calculateTotalAnnualIK(cumulativeKm, vehicle.fiscalPower);
        const recalculatedIK = ikAfter - ikBefore;

        const bareme = getIKBareme(vehicle.fiscalPower);
        let appliedRate = bareme.upTo5000.rate;
        if (cumulativeKm > 20000) appliedRate = bareme.over20000.rate;
        else if (cumulativeKm > 5000) appliedRate = bareme.from5001To20000.rate;

        recalculatedTrips.push({ ...trip, recalculatedIK, cumulativeKm, appliedRate });
      });
    });

    const headers = [
      'Date', 'Propriétaire', 'Véhicule', 'Immatriculation', 'Puissance fiscale (CV)',
      'Lieu de départ', "Lieu d'arrivée", 'Distance (km)', 'Cumul annuel (km)',
      'Motif', 'Taux appliqué (€/km)', 'Montant IK (€)',
    ];

    const sortedTrips = [...recalculatedTrips].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const recalculatedTotalIK = recalculatedTrips.reduce((sum, t) => sum + t.recalculatedIK, 0);

    const rows = sortedTrips.map(t => {
      const vehicle = getVehicle(t.vehicleId);
      return [
        new Date(t.startTime).toLocaleDateString('fr-FR'),
        vehicle ? `${vehicle.ownerFirstName} ${vehicle.ownerLastName}` : '',
        vehicle ? `${vehicle.make} ${vehicle.model}` : '',
        vehicle?.licensePlate || '',
        vehicle?.fiscalPower?.toString() || '',
        t.startLocation.name, t.endLocation.name,
        t.distance.toFixed(1), t.cumulativeKm.toFixed(1), t.purpose,
        t.appliedRate.toFixed(3), t.recalculatedIK.toFixed(2),
      ];
    });

    rows.push([]);
    rows.push(['TOTAL', '', '', '', '', '', '', totalKm.toFixed(1), '', '', '', recalculatedTotalIK.toFixed(2)]);
    rows.push([]);
    rows.push(['Barème kilométrique fiscal 2026']);
    rows.push(['CV', "Jusqu'à 5000 km", '5001 à 20000 km', 'Au-delà de 20000 km']);
    IK_BAREME_2024.forEach(b => {
      rows.push([
        b.cv === '7+' ? '7 CV et plus' : `${b.cv} CV`,
        `d × ${b.upTo5000.rate}`,
        `(d × ${b.from5001To20000.rate}) + ${b.from5001To20000.fixed}`,
        `d × ${b.over20000.rate}`,
      ]);
    });
    rows.push([]);
    rows.push([IKTRACKER_MENTION]);
    rows.push([IKTRACKER_URL]);

    const csv = [IKTRACKER_MENTION, '', headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    return '\uFEFF' + csv;
  };

  // Generate HTML content for interactive preview (with action bar)
  const generateHTMLContent = async () => {
    const { generatePrintableHTML } = await import('@/lib/print-utils');
    return generatePrintableHTML({
      trips,
      vehicles,
      totalKm,
      logoUrl: '/logo-iktracker-250.webp',
    });
  };

  // Generate clean HTML for PDF export (without action bar, optimized for html2pdf)
  const generateCleanHTMLForPdf = async () => {
    const { generateCleanPdfHTML } = await import('@/lib/print-utils');
    return generateCleanPdfHTML({
      trips,
      vehicles,
      totalKm,
      logoUrl: 'https://iktracker.lovable.app/logo-iktracker-250.webp',
    });
  };

  // Direct print function (opens browser print dialog)
  const handlePrint = async () => {
    const { printReport } = await import('@/lib/print-utils');
    printReport({
      trips,
      vehicles,
      totalKm,
      logoUrl: '/logo-iktracker-250.webp',
    });
  };

  // Debug: open the HTML report in a new tab to verify it's not empty
  const previewHTMLReport = async () => {
    try {
      const htmlContent = await generateHTMLContent();
      const w = window.open('', '_blank');
      if (!w) {
        toast.error("Popup bloqué", { description: "Autorisez l'ouverture d'onglets pour prévisualiser le relevé" });
        return;
      }
      w.document.open();
      w.document.write(htmlContent);
      w.document.close();
    } catch (e) {
      toast.error("Impossible de générer l'aperçu HTML");
      console.error(e);
    }
  };

  // Download PDF directly - loads report HTML from view-report edge function
  const downloadPdf = async () => {
    if (trips.length === 0) {
      toast.error("Aucun trajet à exporter");
      return;
    }
    
    const toastId = toast.loading("Génération du PDF...");
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Vous devez être connecté");
      }
      
      // 1. Create temporary share to get report HTML
      const htmlContent = await generateCleanHTMLForPdf();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
      
      const { data: shareData, error: shareError } = await supabase
        .from('report_shares')
        .insert({ html_content: htmlContent, expires_at: expiresAt, user_id: user.id })
        .select('id')
        .single();
      
      if (shareError || !shareData) {
        throw new Error("Impossible de préparer le relevé");
      }
      
      // 2. Fetch the formatted HTML from view-report edge function
      const { data: reportHtml, error: fetchError } = await supabase.functions.invoke("view-report", {
        body: { id: shareData.id },
        headers: { Accept: "text/html" },
      });
      
      if (fetchError || !reportHtml) {
        throw new Error("Impossible de charger le contenu du relevé");
      }
      
      // 3. Convert HTML to PDF
      const { htmlToPdfBlob } = await import('@/lib/pdf-utils');
      const pdfBlob = await htmlToPdfBlob(reportHtml);
      const dateStr = new Date().toISOString().split('T')[0];
      
      // 4. Download PDF
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = `releve-ik-${dateStr}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      // 5. Cleanup temporary share
      await supabase.from('report_shares').delete().eq('id', shareData.id);

      toast.success("PDF téléchargé", { id: toastId });
    } catch (error) {
      console.error('PDF export error:', error);
      const message = error instanceof Error ? error.message : "Erreur lors de l'export";
      toast.error("Erreur lors de l'export", { id: toastId, description: message });
    }
  };

  return (
    <>
      <AlertDialog open={showTourMobileOnly} onOpenChange={setShowTourMobileOnly}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-2">
              <Smartphone className="w-7 h-7 text-accent" />
            </div>
            <p className="text-lg font-semibold mb-1 text-center" style={{ color: '#5666D8' }}>Mode tournée : automatisez la détection GPS des trajets</p>
            <AlertDialogTitle className="text-accent text-base font-medium text-center">Réservé à l'usage mobile</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Ouvrez iktracker.fr sur le navigateur de votre smartphone et téléchargez l'app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* QR Code */}
          <div className="flex justify-center py-4">
            <div className="bg-white p-3 rounded-xl">
              <Suspense fallback={<QRPlaceholder />}>
                <QRCodeSVG 
                  value="https://iktracker.fr/install" 
                  size={140}
                  level="M"
                  includeMargin={false}
                />
              </Suspense>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground -mt-2">
            Scannez ce QR code avec votre téléphone
          </p>
          
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel>Fermer</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Focus Tour View - Full screen immersive mode */}
      <Suspense fallback={<SheetLoader />}>
        <FocusTourView
          isActive={isTourActive}
          isLoading={isTourLoading}
          totalDistanceKm={totalDistanceKm}
          detectedStopsCount={Math.max(0, tourStops.length - 1)}
          wakeLockActive={wakeLockActive}
          lowBattery={lowBattery}
          tourStartTime={tourStartTime || tourStops[0]?.timestamp}
          gpsSignalStrength={gpsSignalStrength}
          gpsAccuracy={gpsAccuracy}
          pendingStop={pendingStop}
          onFinish={handleFinishTour}
          onCancel={() => {
            setTourStartRequested(false);
            clearTour();
          }}
        />
      </Suspense>

      {/* Desktop Sidebar - hidden on mobile */}
      <DesktopSidebar 
        vehicles={vehicles}
        onAddVehicle={addVehicle}
        onEditVehicle={updateVehicle}
        onDeleteVehicle={(vehicleId) => setVehicleToDelete(vehicleId)}
        onTourClick={handleTourButtonClick}
        isTourActive={isTourActive}
        onStartTutorial={startTutorial}
        totalKm={totalKm}
      />

      {/* Onboarding Tutorial - Desktop only */}
      {!isMobile && (
        <Suspense fallback={<SheetLoader />}>
          <OnboardingTutorial 
            isVisible={showTutorial} 
            onComplete={completeTutorial} 
          />
        </Suspense>
      )}

      {/* SEO for protected app page */}
      <Helmet>
        <title>Tableau de bord | IKtracker - Suivi des indemnités kilométriques</title>
        <meta name="description" content="Gérez vos trajets professionnels, suivez vos kilomètres et calculez vos indemnités kilométriques automatiquement avec IKtracker." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://iktracker.fr/app" />
      </Helmet>

      <div className="min-h-screen bg-background font-urbanist cursor-default select-none md:pl-16">
      {/* Header - Fintech Dark */}
      <header 
        className="text-white px-4 pt-4 pb-4 md:pt-8 md:pb-8 rounded-b-[2rem] relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)'
        }}
      >
        {/* Animated gradient - top left */}
        <div 
          className="absolute inset-0 pointer-events-none animate-[pulse-gradient_4s_ease-in-out_infinite]"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 10% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)'
          }}
        />
        {/* Animated gradient - bottom right */}
        <div 
          className="absolute inset-0 pointer-events-none animate-[pulse-gradient_4s_ease-in-out_infinite_1s]"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 90% 85%, rgba(59, 130, 246, 0.10) 0%, transparent 50%)'
          }}
        />
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto relative z-10 px-4">
          <div className="flex items-center gap-3 mb-3 md:mb-6">
            {/* Desktop: Text + subtitle (logo is in sidebar) */}
            <div className="flex-1 hidden md:block">
              <h1 className="text-xl sm:text-2xl md:text-[27px] font-extrabold font-urbanist text-white">IKtracker</h1>
              <p className="text-xs text-white/50 font-urbanist">Outil communautaire.</p>
            </div>
            {/* Mobile: Text only */}
            <h1 className="flex-1 md:hidden text-xl sm:text-2xl font-extrabold font-urbanist text-white">IKtracker</h1>
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/app/admin?tab=stats')}
                className="text-white hover:text-white hover:bg-white/20 dark:text-white dark:hover:bg-white/15"
                title="Dashboard statistiques"
                aria-label="Dashboard statistiques"
              >
                <BarChart3 className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={previewHTMLReport}
              onMouseEnter={() => { import('@/lib/pdf-utils'); }}
              disabled={trips.length === 0}
              className="text-white hover:text-white hover:bg-white/20 dark:text-white dark:hover:bg-white/15"
              aria-label="Aperçu du relevé"
              title="Aperçu du relevé"
            >
              <Download className="w-5 h-5" />
            </Button>
            <div className="relative" data-tutorial="profile">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/app/profile')}
                className="text-white hover:text-white hover:bg-white/20 dark:text-white dark:hover:bg-white/15 w-10 h-10"
                aria-label="Accéder au profil"
              >
                <UserCircle className="w-20 h-20" />
              </Button>
              {unreadResponsesCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
                >
                  {unreadResponsesCount}
                </Badge>
              )}
            </div>
          </div>

          {/* KPI Cards - Glassmorphism */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Counter key={`km-${preferences.counterResetDate}`} value={totalKm} label="Distance totale" unit="km" />
            <Counter key={`ik-${preferences.counterResetDate}`} value={totalIK} label="Indemnités" unit="€" variant="accent" decimals={2} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 pt-3 space-y-3 md:space-y-5 pb-36 md:pb-4">
        {/* Geolocation Banner - hide if tour is active (permission already granted) */}
        {showGeoBanner && !isTourActive && (
          <GeolocationBanner
            onActivate={requestPermission}
            onDismiss={dismissBanner}
            isLoading={geoPermissionLoading}
          />
        )}

        {/* Pending trips section - "À compléter" */}
        {trips.filter(t => t.status === 'pending_location').length > 0 && (
          <section 
            className="rounded-lg p-4 border border-[hsl(270,50%,35%)]/40 transition-all duration-300 hover:border-[hsl(270,50%,45%)]/60 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]" 
            style={{
              background: 'linear-gradient(135deg, hsl(270, 50%, 20%) 0%, hsl(280, 45%, 15%) 100%)'
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold text-purple-100 flex items-center gap-2">
                Trajets à compléter
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold bg-red-500 text-white rounded-full">
                  {trips.filter(t => t.status === 'pending_location').length}
                </span>
              </h2>
              <button
                onClick={toggleHidePendingTrips}
                className="ml-auto p-1.5 rounded-md bg-purple-400/20 hover:bg-purple-400/30 text-purple-200 transition-colors"
                title={hidePendingTrips ? "Afficher les trajets" : "Masquer les trajets"}
              >
                {hidePendingTrips ? <ChevronDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>
            </div>
            {!hidePendingTrips && (
              <div className="space-y-3">
                {trips
                  .filter(t => t.status === 'pending_location')
                  .slice(0, 4)
                  .map((trip) => (
                    <TripCard 
                      key={trip.id} 
                      trip={trip} 
                      vehicle={getVehicle(trip.vehicleId)}
                      savedLocations={savedLocations}
                      showTripTime={preferences.showTripTime}
                      onTripUpdated={() => {
                        // Reload page to refresh trips after completion
                        window.location.reload();
                      }}
                    />
                  ))}
              </div>
            )}
          </section>
        )}

        {/* Vehicles section */}
        <section>
          {/* Title hidden on mobile */}
          <div className="hidden md:flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Mes véhicules</h2>
            <Button variant="ghost" size="sm" onClick={handleAddVehicle}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>

          {vehicles.length === 0 ? (
            <div className="text-center py-8 bg-card rounded-md">
              <Car className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Aucun véhicule enregistré</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Ajoutez votre véhicule pour commencer
              </p>
              <Button onClick={handleAddVehicle} className="hidden md:inline-flex">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un véhicule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  totalKm={getTotalAnnualKm(vehicle.id)}
                  onEdit={() => handleEditVehicle(vehicle.id)}
                  onDelete={() => setVehicleToDelete(vehicle.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* PWA Install Banner */}
        <InstallBanner />

        {/* Recent trips */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-semibold">Derniers trajets</h2>
            {trips.length > 3 && (
              <Link to="/app/mestrajets" className="text-sm text-primary font-medium flex items-center">
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {recentTrips.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-md">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Aucun trajet enregistré</p>
              <p className="text-sm text-muted-foreground mt-1">
                {vehicles.length === 0 
                  ? "Ajoutez d'abord un véhicule" 
                  : "Commencez par créer votre premier trajet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTrips.filter(t => t.status !== 'pending_location').map((trip) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  vehicle={getVehicle(trip.vehicleId)}
                  showTripTime={preferences.showTripTime}
                />
              ))}
            </div>
          )}
          
          {/* Threshold Alert - Home variant (gray) */}
          {vehicles.length > 0 && (
            <ThresholdAlert 
              totalKm={totalKm} 
              fiscalPower={vehicles[0].fiscalPower} 
              variant="home" 
            />
          )}

          {/* Archived trips section */}
          <Suspense fallback={<SheetLoader />}>
            <ArchivedTripsSection
              archivedTrips={archivedTrips}
              vehicles={vehicles}
              onRestore={restoreTrip}
              onPermanentDelete={permanentlyDeleteTrip}
            />
          </Suspense>
        </section>
      </main>

      {/* Tour button - floating above mobile nav (hidden on desktop, now in sidebar) */}
      {/* Only show when tour is NOT active (FocusTourView takes over when active) */}
      {!isTourActive && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-10 md:hidden flex flex-col items-center gap-3">
          <TourButton
            isActive={isTourActive}
            isLoading={isTourLoading}
            totalDistanceKm={totalDistanceKm}
            stopsCount={tourStops.length}
            onClick={handleTourButtonClick}
          />
        </div>
      )}

      {/* Desktop: Bottom action buttons - floating */}
      <div className="hidden md:fixed md:flex bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="flex gap-3">
          {/* Voir le relevé */}
           <Link to="/app/mestrajets" data-tutorial="report">
            <Button variant="outline" size="default" className="shadow-lg bg-card border-border">
              <FileText className="w-4 h-4" />
              Mes Trajets
            </Button>
          </Link>

          {/* Nouveau trajet */}
          <Button
            variant="gradient"
            size="default"
            className="shadow-lg shadow-primary/30"
            data-tutorial="add-trip"
            onClick={() => {
              if (vehicles.length === 0) {
                toast.info("Ajoutez d'abord un véhicule", {
                  description: "Un véhicule est nécessaire pour enregistrer les trajets",
                  action: {
                    label: "Ajouter",
                    onClick: handleAddVehicle,
                  },
                });
              } else {
                setShowNewTrip(true);
              }
            }}
            disabled={vehicles.length === 0}
          >
            <Plus className="w-4 h-4" />
            Nouveau
          </Button>
        </div>
      </div>

      {/* Mobile: Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 py-3 px-4 bg-background/95 backdrop-blur-sm shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)] md:hidden safe-area-pb">
        <div className="max-w-lg mx-auto flex justify-center">
          <div className="flex gap-3">
            <Link to="/app/mestrajets" data-tutorial="report">
              <Button variant="outline" size="default" className="shadow-lg bg-card border-border">
                <FileText className="w-4 h-4" />
                Mes Trajets
              </Button>
            </Link>
            <Button 
              variant="gradient" 
              size="default"
              className="shadow-lg shadow-primary/30"
              data-tutorial="add-trip"
              onClick={() => {
                if (vehicles.length === 0) {
                  toast.info("Ajoutez d'abord un véhicule", {
                    description: "Un véhicule est nécessaire pour enregistrer les trajets",
                    action: {
                      label: "Ajouter",
                      onClick: handleAddVehicle,
                    },
                  });
                } else {
                  setShowNewTrip(true);
                }
              }}
              disabled={vehicles.length === 0}
            >
              <Plus className="w-4 h-4" />
              Nouveau
            </Button>
          </div>
        </div>
      </div>

      {/* New trip sheet */}
      <Suspense fallback={<SheetLoader />}>
        <NewTripSheet
          open={showNewTrip}
          onOpenChange={setShowNewTrip}
          savedLocations={savedLocations}
          vehicles={vehicles}
          onAddLocation={addLocation}
          onDeleteLocation={deleteLocation}
          onUpdateLocation={updateLocation}
          onAddVehicle={handleAddVehicle}
          onCreateTrip={addTrip}
          getTotalAnnualKm={getTotalAnnualKm}
        />
      </Suspense>

      {/* Vehicle form */}
      <Suspense fallback={<SheetLoader />}>
        <VehicleForm
          open={showVehicleForm}
          onOpenChange={setShowVehicleForm}
          editVehicle={editingVehicle ? vehicles.find(v => v.id === editingVehicle) : undefined}
          onSave={(vehicleData) => {
            if (editingVehicle) {
              updateVehicle(editingVehicle, vehicleData);
            } else {
              addVehicle(vehicleData);
            }
          }}
        />
      </Suspense>

      {/* Tour log sheet */}
      <Suspense fallback={<SheetLoader />}>
        <TourLogSheet
          open={showTourLog}
          onOpenChange={setShowTourLog}
          isActive={isTourActive}
          isLoading={isTourLoading}
          stops={tourStops}
          totalDistanceKm={totalDistanceKm}
          wakeLockActive={wakeLockActive}
          lowBattery={lowBattery}
          onStart={startTour}
          onFinish={handleFinishTour}
          onClear={clearTour}
          hasHistory={!!lastTour}
          onShowHistory={() => {
            setShowTourLog(false);
            setShowTourHistory(true);
          }}
        />
      </Suspense>

      {/* Tour history sheet */}
      <Suspense fallback={<SheetLoader />}>
        <TourLogSheet
          open={showTourHistory}
          onOpenChange={setShowTourHistory}
          isActive={false}
          isLoading={false}
          stops={lastTour || []}
          onStart={() => {}}
          onFinish={() => {}}
          onClear={() => setLastTour(null)}
          isHistory
        />
      </Suspense>

      {/* Delete vehicle confirmation */}
      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les trajets associés seront conservés avec leurs indemnités déjà calculées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (vehicleToDelete) {
                  const result = await deleteVehicle(vehicleToDelete);
                  setVehicleToDelete(null);
                  if (result.success) {
                    toast.success("Véhicule supprimé");
                  } else {
                    toast.error(result.error || "Impossible de supprimer ce véhicule");
                  }
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stop tour confirmation */}
      <AlertDialog open={showStopTourConfirm} onOpenChange={setShowStopTourConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Terminer la tournée ?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Le trajet sera enregistré avec {Math.max(0, tourStops.length - 1)} étape{tourStops.length !== 2 ? 's' : ''} et {totalDistanceKm.toFixed(1)} km.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1 h-14 text-base">
              Continuer
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStopTour}
              className="flex-1 h-14 text-base bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Terminer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Geolocation Tutorial Modal */}
      <Suspense fallback={<SheetLoader />}>
        <GeolocationTutorialModal
          open={showTutorialModal}
          onClose={closeTutorialModal}
          isGpsDisabled={isGpsDisabled}
        />
      </Suspense>
    </div>
    </>

  );
};

export default Index;
