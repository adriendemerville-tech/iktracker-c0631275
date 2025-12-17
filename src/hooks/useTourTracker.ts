import { useState, useEffect, useRef, useCallback } from 'react';
import { reverseGeocode } from '@/lib/geocoding';

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
  distanceThreshold?: number; // meters - minimum distance to create a new step
  trackingInterval?: number; // ms - how often to check position
}

export function useTourTracker(options: UseTourTrackerOptions = {}) {
  const {
    distanceThreshold = 1000, // 1 km - create a step when moved 1km
    trackingInterval = 10000, // 10 seconds
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [stops, setStops] = useState<TourStop[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  const watchIdRef = useRef<number | null>(null);
  const lastStopPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate distance between two points (Haversine formula)
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

    // Check permission API if available (modern browsers)
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
        
        // Listen for permission changes
        result.addEventListener('change', () => {
          setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
        });
        
        return result.state !== 'denied';
      } catch (e) {
        console.log('Permission API not fully supported, will try geolocation directly');
      }
    }
    
    return true; // Will try geolocation directly
  }, []);

  // Add a new stop
  const addStop = useCallback(async (lat: number, lng: number) => {
    const newStop: TourStop = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      lat,
      lng,
    };

    // Get address info
    try {
      const geocodeResult = await reverseGeocode(lat, lng);
      if (geocodeResult) {
        newStop.address = geocodeResult.fullAddress;
        newStop.city = geocodeResult.city;
      }
    } catch (e) {
      console.warn('Failed to geocode stop:', e);
    }

    console.log(`New stop added: ${newStop.city || newStop.address || 'Unknown'} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    
    setStops((prev) => [...prev, newStop]);
    lastStopPositionRef.current = { lat, lng };
  }, []);

  // Check position and create step if moved > 1km
  const checkPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        console.log(`Position update: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

        setCurrentPosition({ lat, lng });
        setPermissionStatus('granted');

        // Check distance from last stop
        if (lastStopPositionRef.current) {
          const distance = getDistance(
            lastStopPositionRef.current.lat,
            lastStopPositionRef.current.lng,
            lat,
            lng
          );

          console.log(`Distance from last stop: ${(distance / 1000).toFixed(2)} km`);

          // If moved more than threshold (1km), create a new step
          if (distance >= distanceThreshold) {
            console.log(`Distance threshold exceeded (${distanceThreshold}m), creating new step`);
            await addStop(lat, lng);
          }
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        if (err.code === 1) { // PERMISSION_DENIED
          setError('Accès à la géolocalisation refusé. Veuillez autoriser l\'accès dans les paramètres de votre appareil.');
          setPermissionStatus('denied');
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          setError('Position indisponible. Vérifiez que le GPS est activé.');
        } else if (err.code === 3) { // TIMEOUT
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
  }, [distanceThreshold, addStop]);

  const startTour = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStops([]);
    lastStopPositionRef.current = null;

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
        
        // Add starting point as first stop
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
        lastStopPositionRef.current = { lat, lng };
        setIsActive(true);
        setIsLoading(false);

        // Start periodic position checking
        intervalRef.current = setInterval(checkPosition, trackingInterval);
        
        // Also use watchPosition for more responsive tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            setCurrentPosition({ lat: latitude, lng: longitude });
            
            if (lastStopPositionRef.current) {
              const distance = getDistance(
                lastStopPositionRef.current.lat,
                lastStopPositionRef.current.lng,
                latitude,
                longitude
              );
              
              if (distance >= distanceThreshold) {
                console.log(`Watch: Distance threshold exceeded, creating new step`);
                await addStop(latitude, longitude);
              }
            }
          },
          (err) => {
            console.warn('Watch position error:', err);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
            distanceFilter: 100, // Only trigger when moved 100m (if supported)
          } as PositionOptions
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
  }, [checkPosition, trackingInterval, checkPermission, permissionStatus, distanceThreshold, addStop]);

  const stopTour = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsActive(false);
  }, []);

  const clearTour = useCallback(() => {
    stopTour();
    setStops([]);
    setCurrentPosition(null);
    lastStopPositionRef.current = null;
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
    startTour,
    stopTour,
    clearTour,
  };
}
