import { useState, useEffect, useRef, useCallback } from 'react';
import { reverseGeocode } from '@/lib/geocoding';
import { calculateDrivingDistance } from '@/hooks/useGeolocation';

export interface TourStop {
  id: string;
  timestamp: Date;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  duration?: number; // in seconds
}

interface UseTourTrackerOptions {
  stopDurationThreshold?: number; // seconds - minimum time at same location to create a stop
  locationRadius?: number; // meters - radius to consider as "same location"
  trackingInterval?: number; // ms - how often to check position
}

interface PendingStop {
  lat: number;
  lng: number;
  arrivalTime: Date;
  address?: string;
  city?: string;
}

export function useTourTracker(options: UseTourTrackerOptions = {}) {
  const {
    stopDurationThreshold = 7 * 60, // 7 minutes in seconds
    locationRadius = 100, // 100 meters - considered same location
    trackingInterval = 30000, // 30 seconds
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [stops, setStops] = useState<TourStop[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(0); // Total accumulated distance (only increases)

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStopRef = useRef<PendingStop | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const maxDistanceReachedRef = useRef<number>(0); // Track max distance to ensure it only increases

  // Calculate distance between two points (Haversine formula) - for determining if in same location
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

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
    
    // Vibrate phone when new step is created (if supported)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 100]); // Triple vibration pattern
    }
    
    setStops((prev) => [...prev, newStop]);
  }, []);

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

  // Check position and manage stops based on 7-minute rule
  const checkPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const now = new Date();
        
        console.log(`Position update: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

        setCurrentPosition({ lat, lng });
        setPermissionStatus('granted');

        // Update total distance if we have a previous position
        if (lastPositionRef.current) {
          const distanceFromLast = getDistance(
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
          const distanceFromPending = getDistance(
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
            }
          } else {
            // Moved away - reset pending stop timer
            console.log(`Moved away from pending stop location (${distanceFromPending.toFixed(0)}m)`);
            pendingStopRef.current = null;
          }
        }

        // Check if we should start tracking a new potential stop
        // (if we're not already tracking one and we're potentially stopped)
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
          console.log(`Started tracking potential stop at: ${pendingStop.city || pendingStop.address || 'Unknown'}`);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        if (err.code === 1) {
          setError('Accès à la géolocalisation refusé. Veuillez autoriser l\'accès dans les paramètres de votre appareil.');
          setPermissionStatus('denied');
        } else if (err.code === 2) {
          setError('Position indisponible. Vérifiez que le GPS est activé.');
        } else if (err.code === 3) {
          setError('Délai de géolocalisation dépassé. Réessayez.');
        } else {
          setError('Erreur de géolocalisation');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  }, [stopDurationThreshold, locationRadius, addStop, updateTotalDistance]);

  const startTour = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStops([]);
    setTotalDistanceKm(0);
    maxDistanceReachedRef.current = 0;
    pendingStopRef.current = null;
    lastPositionRef.current = null;

    // Check permission first
    const hasPermission = await checkPermission();
    if (!hasPermission && permissionStatus === 'denied') {
      setError('Accès à la géolocalisation refusé. Veuillez autoriser l\'accès dans les paramètres.');
      setIsLoading(false);
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        console.log(`Tour started at: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        
        setCurrentPosition({ lat, lng });
        setPermissionStatus('granted');
        lastPositionRef.current = { lat, lng };
        
        // Add starting point as first stop immediately
        const startStop: TourStop = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
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

        // Start periodic position checking
        intervalRef.current = setInterval(checkPosition, trackingInterval);
        
        // Also use watchPosition for more responsive tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            setCurrentPosition({ lat: latitude, lng: longitude });
          },
          (err) => {
            console.warn('Watch position error:', err);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );
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
        timeout: 20000,
      }
    );
  }, [checkPosition, trackingInterval, checkPermission, permissionStatus]);

  const stopTour = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    pendingStopRef.current = null;
    setIsActive(false);
  }, []);

  const clearTour = useCallback(() => {
    stopTour();
    setStops([]);
    setCurrentPosition(null);
    setTotalDistanceKm(0);
    maxDistanceReachedRef.current = 0;
    lastPositionRef.current = null;
  }, [stopTour]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isActive,
    isLoading,
    error,
    stops,
    currentPosition,
    permissionStatus,
    totalDistanceKm, // Changed from distanceFromLastStop to totalDistanceKm
    startTour,
    stopTour,
    clearTour,
  };
}
