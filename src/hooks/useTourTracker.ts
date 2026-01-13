import { useState, useEffect, useRef, useCallback } from 'react';
import { reverseGeocode } from '@/lib/geocoding';
import { calculateDrivingDistance, getDistanceInMeters } from '@/lib/distance';
import { useWakeLock } from '@/hooks/useWakeLock';
import { playNotificationSound } from '@/lib/sounds';
import { toast } from 'sonner';

export interface TourStop {
  id: string;
  timestamp: Date;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  duration?: number; // in seconds
}

export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
}

interface UseTourTrackerOptions {
  stopDurationThreshold?: number; // seconds - minimum time at same location to create a stop
  locationRadius?: number; // meters - radius to consider as "same location"
  trackingInterval?: number; // ms - how often to capture points (default 10s)
  accuracyThreshold?: number; // meters - max accuracy to accept (default 50m)
}

interface PendingStop {
  lat: number;
  lng: number;
  arrivalTime: Date;
  address?: string;
  city?: string;
}

// LocalStorage keys
const STORAGE_KEYS = {
  TOUR_ACTIVE: 'tour_active',
  TOUR_START_TIME: 'tour_start_time',
  TOUR_STOPS: 'tour_stops',
  TOUR_GPS_POINTS: 'tour_gps_points',
  TOUR_TOTAL_DISTANCE: 'tour_total_distance',
  TOUR_PENDING_STOP: 'tour_pending_stop',
};

// Save data to localStorage immediately for data persistence
function saveTourData(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save tour data to localStorage:', e);
  }
}

function loadTourData<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load tour data from localStorage:', e);
  }
  return defaultValue;
}

function clearTourStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

export function useTourTracker(options: UseTourTrackerOptions = {}) {
  const {
    stopDurationThreshold = 7 * 60, // 7 minutes in seconds
    locationRadius = 100, // 100 meters - considered same location
    trackingInterval = 10000, // 10 seconds - capture point frequency
    accuracyThreshold = 50, // 50 meters - max accuracy to accept
  } = options;

  // Restore state from localStorage on init
  const [isActive, setIsActive] = useState(() => loadTourData(STORAGE_KEYS.TOUR_ACTIVE, false));
  const [stops, setStops] = useState<TourStop[]>(() => {
    const stored = loadTourData<TourStop[]>(STORAGE_KEYS.TOUR_STOPS, []);
    return stored.map(s => ({ ...s, timestamp: new Date(s.timestamp) }));
  });
  const [gpsPoints, setGpsPoints] = useState<GpsPoint[]>(() => loadTourData(STORAGE_KEYS.TOUR_GPS_POINTS, []));
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(() => loadTourData(STORAGE_KEYS.TOUR_TOTAL_DISTANCE, 0));
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsSignalStrength, setGpsSignalStrength] = useState<'excellent' | 'good' | 'poor' | 'lost'>('lost');
  const [tourStartTime, setTourStartTime] = useState<Date | null>(() => {
    const stored = loadTourData<string | null>(STORAGE_KEYS.TOUR_START_TIME, null);
    return stored ? new Date(stored) : null;
  });

  // Wake Lock integration
  const wakeLock = useWakeLock();

  const watchIdRef = useRef<number | null>(null);
  const pendingStopRef = useRef<PendingStop | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const maxDistanceReachedRef = useRef<number>(loadTourData(STORAGE_KEYS.TOUR_TOTAL_DISTANCE, 0));
  const lastPointTimeRef = useRef<number>(0);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore pending stop from localStorage on init
  useEffect(() => {
    const stored = loadTourData<PendingStop | null>(STORAGE_KEYS.TOUR_PENDING_STOP, null);
    if (stored) {
      pendingStopRef.current = { ...stored, arrivalTime: new Date(stored.arrivalTime) };
    }
  }, []);

  // Persist state changes to localStorage
  useEffect(() => {
    saveTourData(STORAGE_KEYS.TOUR_ACTIVE, isActive);
  }, [isActive]);

  useEffect(() => {
    saveTourData(STORAGE_KEYS.TOUR_STOPS, stops);
  }, [stops]);

  useEffect(() => {
    saveTourData(STORAGE_KEYS.TOUR_GPS_POINTS, gpsPoints);
  }, [gpsPoints]);

  useEffect(() => {
    saveTourData(STORAGE_KEYS.TOUR_TOTAL_DISTANCE, totalDistanceKm);
    maxDistanceReachedRef.current = Math.max(totalDistanceKm, maxDistanceReachedRef.current);
  }, [totalDistanceKm]);

  useEffect(() => {
    if (tourStartTime) {
      saveTourData(STORAGE_KEYS.TOUR_START_TIME, tourStartTime.toISOString());
    }
  }, [tourStartTime]);

  // Calculate GPS signal strength from accuracy
  const updateGpsSignal = useCallback((accuracy: number | null) => {
    setGpsAccuracy(accuracy);
    if (accuracy === null) {
      setGpsSignalStrength('lost');
    } else if (accuracy <= 10) {
      setGpsSignalStrength('excellent');
    } else if (accuracy <= 30) {
      setGpsSignalStrength('good');
    } else if (accuracy <= 50) {
      setGpsSignalStrength('poor');
    } else {
      setGpsSignalStrength('lost');
    }
  }, []);

  // Reset GPS timeout - show warning if no signal for 30s
  const resetGpsTimeout = useCallback(() => {
    if (gpsTimeoutRef.current) {
      clearTimeout(gpsTimeoutRef.current);
    }
    gpsTimeoutRef.current = setTimeout(() => {
      updateGpsSignal(null);
      toast.warning('Signal GPS perdu', {
        description: 'Vérifiez que le GPS est activé et que vous êtes en extérieur.',
        duration: 5000,
      });
    }, 30000);
  }, [updateGpsSignal]);

  // Check geolocation permission status
  const checkPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée sur cet appareil');
      setPermissionStatus('denied');
      return false;
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
        
        result.addEventListener('change', () => {
          setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
        });
        
        return result.state !== 'denied';
      } catch (e) {
        console.log('Permission API not fully supported, will try geolocation directly');
      }
    }
    
    return true;
  }, []);

  // Add a confirmed stop
  const addStop = useCallback(async (lat: number, lng: number, arrivalTime: Date, address?: string, city?: string) => {
    const newStop: TourStop = {
      id: crypto.randomUUID(),
      timestamp: arrivalTime,
      lat,
      lng,
      address,
      city,
    };

    console.log(`New stop added: ${city || address || 'Unknown'} (${lat.toFixed(4)}, ${lng.toFixed(4)}) after 7+ minutes`);
    
    // Play notification sound
    playNotificationSound('subtle');
    
    // Vibrate phone when new step is created (if supported)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 100]); // Triple vibration pattern
    }
    
    setStops((prev) => [...prev, newStop]);
  }, []);

  // Add GPS point with filtering
  const addGpsPoint = useCallback((lat: number, lng: number, accuracy: number) => {
    const now = Date.now();
    
    // Enforce minimum interval (10 seconds)
    if (now - lastPointTimeRef.current < trackingInterval) {
      return false;
    }
    
    // Filter out inaccurate points
    if (accuracy > accuracyThreshold) {
      console.log(`GPS point rejected: accuracy ${accuracy.toFixed(0)}m > ${accuracyThreshold}m threshold`);
      return false;
    }
    
    const point: GpsPoint = { lat, lng, timestamp: now, accuracy };
    setGpsPoints(prev => [...prev, point]);
    lastPointTimeRef.current = now;
    
    console.log(`GPS point captured: (${lat.toFixed(5)}, ${lng.toFixed(5)}) accuracy: ${accuracy.toFixed(0)}m`);
    return true;
  }, [trackingInterval, accuracyThreshold]);

  // Update total distance using Distance Matrix API
  const updateTotalDistance = useCallback(async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    try {
      const segmentDistance = await calculateDrivingDistance(fromLat, fromLng, toLat, toLng);
      
      setTotalDistanceKm((prev) => {
        const newTotal = prev + segmentDistance;
        // Ensure distance only increases
        const maxDistance = Math.max(newTotal, maxDistanceReachedRef.current);
        maxDistanceReachedRef.current = maxDistance;
        return maxDistance;
      });
    } catch (e) {
      console.warn('Failed to calculate driving distance:', e);
    }
  }, []);

  // Process position from watchPosition
  const processPosition = useCallback(async (position: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, accuracy } = position.coords;
    const now = new Date();
    
    // Reset GPS timeout
    resetGpsTimeout();
    
    // Update GPS signal strength
    updateGpsSignal(accuracy);
    
    // Filter by accuracy
    if (accuracy > accuracyThreshold) {
      console.log(`Position update ignored: accuracy ${accuracy.toFixed(0)}m > ${accuracyThreshold}m`);
      return;
    }
    
    // Add GPS point (respects interval)
    addGpsPoint(lat, lng, accuracy);
    
    setCurrentPosition({ lat, lng });
    setPermissionStatus('granted');

    // Update total distance if we have a previous position
    if (lastPositionRef.current) {
      const distanceFromLast = getDistanceInMeters(
        lastPositionRef.current.lat,
        lastPositionRef.current.lng,
        lat,
        lng
      );
      
      // Only update distance if moved significantly (> 50m to avoid GPS jitter)
      if (distanceFromLast > 50) {
        await updateTotalDistance(
          lastPositionRef.current.lat,
          lastPositionRef.current.lng,
          lat,
          lng
        );
        lastPositionRef.current = { lat, lng };
      }
    } else {
      lastPositionRef.current = { lat, lng };
    }

    // Check if we're at the same location as pending stop
    if (pendingStopRef.current) {
      const distanceFromPending = getDistanceInMeters(
        pendingStopRef.current.lat,
        pendingStopRef.current.lng,
        lat,
        lng
      );

      if (distanceFromPending <= locationRadius) {
        // Still at same location - check if 7 minutes have passed
        const secondsAtLocation = (now.getTime() - pendingStopRef.current.arrivalTime.getTime()) / 1000;
        
        console.log(`Still at same location: ${secondsAtLocation.toFixed(0)}s / ${stopDurationThreshold}s`);
        
        if (secondsAtLocation >= stopDurationThreshold) {
          // 7+ minutes at this location - create a stop
          await addStop(
            pendingStopRef.current.lat,
            pendingStopRef.current.lng,
            pendingStopRef.current.arrivalTime,
            pendingStopRef.current.address,
            pendingStopRef.current.city
          );
          pendingStopRef.current = null;
          saveTourData(STORAGE_KEYS.TOUR_PENDING_STOP, null);
        }
      } else {
        // Moved away - reset pending stop timer
        console.log(`Moved away from pending stop location (${distanceFromPending.toFixed(0)}m)`);
        pendingStopRef.current = null;
        saveTourData(STORAGE_KEYS.TOUR_PENDING_STOP, null);
      }
    }

    // Check if we should start tracking a new potential stop
    if (!pendingStopRef.current) {
      // Start a new pending stop
      const pendingStop: PendingStop = {
        lat,
        lng,
        arrivalTime: now,
      };

      // Get address info
      try {
        const geocodeResult = await reverseGeocode(lat, lng);
        if (geocodeResult) {
          pendingStop.address = geocodeResult.fullAddress;
          pendingStop.city = geocodeResult.city;
        }
      } catch (e) {
        console.warn('Failed to geocode position:', e);
      }

      pendingStopRef.current = pendingStop;
      saveTourData(STORAGE_KEYS.TOUR_PENDING_STOP, pendingStop);
      console.log(`Started tracking potential stop at: ${pendingStop.city || pendingStop.address || 'Unknown'}`);
    }
  }, [accuracyThreshold, addGpsPoint, addStop, locationRadius, resetGpsTimeout, stopDurationThreshold, updateGpsSignal, updateTotalDistance]);

  // Handle visibility change - sync when returning to foreground
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isActive) {
        console.log('App returned to foreground - syncing tour data');
        
        // Re-request wake lock
        await wakeLock.request();
        
        // Restart watchPosition if not running
        if (watchIdRef.current === null) {
          startWatching();
        }
        
        toast.info('Suivi GPS repris', {
          description: 'Le tracking continue en arrière-plan.',
          duration: 3000,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, wakeLock]);

  // Start watching position
  const startWatching = useCallback(() => {
    if (watchIdRef.current !== null) return;
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      processPosition,
      (err) => {
        console.error('Watch position error:', err);
        updateGpsSignal(null);
        
        if (err.code === 1) {
          setError('Accès à la géolocalisation refusé. Veuillez autoriser l\'accès dans les paramètres de votre appareil.');
          setPermissionStatus('denied');
          toast.error('GPS refusé', {
            description: 'Autorisez l\'accès à la localisation dans les paramètres.',
          });
        } else if (err.code === 2) {
          toast.warning('GPS indisponible', {
            description: 'Vérifiez que le GPS est activé.',
          });
        } else if (err.code === 3) {
          toast.warning('Signal GPS perdu', {
            description: 'Tentative de reconnexion...',
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Always get fresh position
      }
    );
    
    resetGpsTimeout();
  }, [processPosition, resetGpsTimeout, updateGpsSignal]);

  const startTour = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // Clear previous tour data
    clearTourStorage();
    setStops([]);
    setGpsPoints([]);
    setTotalDistanceKm(0);
    maxDistanceReachedRef.current = 0;
    pendingStopRef.current = null;
    lastPositionRef.current = null;
    lastPointTimeRef.current = 0;

    // Check permission first
    const hasPermission = await checkPermission();
    if (!hasPermission) {
      setError("Accès à la géolocalisation refusé. Veuillez autoriser l'accès dans les paramètres.");
      setIsLoading(false);
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        console.log(`Tour started at: (${lat.toFixed(4)}, ${lng.toFixed(4)}) accuracy: ${accuracy.toFixed(0)}m`);
        
        const startTime = new Date();
        setTourStartTime(startTime);
        setCurrentPosition({ lat, lng });
        setPermissionStatus('granted');
        updateGpsSignal(accuracy);
        lastPositionRef.current = { lat, lng };
        
        // Add initial GPS point
        addGpsPoint(lat, lng, accuracy);
        
        // Add starting point as first stop immediately
        const startStop: TourStop = {
          id: crypto.randomUUID(),
          timestamp: startTime,
          lat,
          lng,
        };

        try {
          const geocodeResult = await reverseGeocode(lat, lng);
          if (geocodeResult) {
            startStop.address = geocodeResult.fullAddress;
            startStop.city = geocodeResult.city;
          }
        } catch (e) {
          console.warn('Failed to geocode start:', e);
        }

        setStops([startStop]);
        setIsActive(true);
        setIsLoading(false);

        // Request wake lock to keep screen on
        const wakeLockAcquired = await wakeLock.request();
        if (!wakeLockAcquired) {
          toast.info('Mode écran actif', {
            description: 'L\'écran peut s\'éteindre sur ce navigateur. Gardez l\'app visible.',
            duration: 5000,
          });
        }

        // Start watching position with watchPosition
        startWatching();
      },
      (err) => {
        console.error('Geolocation error:', err);
        if (err.code === 1) {
          setError('Accès à la géolocalisation refusé. Veuillez autoriser l\'accès dans les paramètres de votre appareil.');
          setPermissionStatus('denied');
        } else if (err.code === 2) {
          setError('Position indisponible. Vérifiez que le GPS est activé.');
        } else {
          setError('Impossible de démarrer la tournée. Vérifiez vos paramètres de localisation.');
        }
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 60000,
      }
    );
  }, [addGpsPoint, checkPermission, startWatching, updateGpsSignal, wakeLock]);

  const stopTour = useCallback(async () => {
    // Clear watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Clear GPS timeout
    if (gpsTimeoutRef.current) {
      clearTimeout(gpsTimeoutRef.current);
      gpsTimeoutRef.current = null;
    }
    
    pendingStopRef.current = null;
    setIsActive(false);
    setGpsSignalStrength('lost');
    
    // Release wake lock
    await wakeLock.release();
    
    console.log(`Tour stopped. Total GPS points: ${gpsPoints.length}, Distance: ${totalDistanceKm.toFixed(2)}km`);
  }, [gpsPoints.length, totalDistanceKm, wakeLock]);

  const clearTour = useCallback(() => {
    stopTour();
    clearTourStorage();
    setStops([]);
    setGpsPoints([]);
    setCurrentPosition(null);
    setTotalDistanceKm(0);
    setTourStartTime(null);
    maxDistanceReachedRef.current = 0;
    lastPositionRef.current = null;
    lastPointTimeRef.current = 0;
  }, [stopTour]);

  // Get tour data for saving to Supabase
  const getTourData = useCallback(() => {
    return {
      stops,
      gpsPoints,
      totalDistanceKm,
      tourStartTime,
    };
  }, [gpsPoints, stops, totalDistanceKm, tourStartTime]);

  // Resume tour if it was active (for page refresh recovery)
  useEffect(() => {
    if (isActive && watchIdRef.current === null) {
      console.log('Resuming tour tracking after page reload');
      startWatching();
      wakeLock.request();
    }
  }, [isActive, startWatching, wakeLock]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (gpsTimeoutRef.current) {
        clearTimeout(gpsTimeoutRef.current);
      }
    };
  }, []);

  return {
    isActive,
    isLoading,
    error,
    stops,
    gpsPoints,
    currentPosition,
    permissionStatus,
    totalDistanceKm,
    gpsAccuracy,
    gpsSignalStrength,
    tourStartTime,
    wakeLockActive: wakeLock.isActive,
    lowBattery: wakeLock.lowBattery,
    startTour,
    stopTour,
    clearTour,
    getTourData,
  };
}
