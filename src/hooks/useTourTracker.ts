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
  stopThreshold?: number; // meters - distance threshold to consider as stopped
  stopDuration?: number; // ms - how long to wait before registering a stop
  trackingInterval?: number; // ms - how often to check position
}

export function useTourTracker(options: UseTourTrackerOptions = {}) {
  const {
    stopThreshold = 50, // 50 meters
    stopDuration = 60000, // 1 minute
    trackingInterval = 10000, // 10 seconds
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [stops, setStops] = useState<TourStop[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const stoppedSinceRef = useRef<number | null>(null);
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

  const addStop = useCallback(async (lat: number, lng: number) => {
    // Check if we already have a stop very close to this one
    const existingStop = stops.find(
      (s) => getDistance(s.lat, s.lng, lat, lng) < stopThreshold
    );

    if (existingStop) {
      // Update duration of existing stop
      setStops((prev) =>
        prev.map((s) =>
          s.id === existingStop.id
            ? { ...s, duration: (s.duration || 0) + stopDuration / 1000 }
            : s
        )
      );
      return;
    }

    // Create new stop
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

    setStops((prev) => [...prev, newStop]);
  }, [stops, stopThreshold, stopDuration]);

  const checkPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const now = Date.now();

        setCurrentPosition({ lat, lng });

        if (lastPositionRef.current) {
          const distance = getDistance(
            lastPositionRef.current.lat,
            lastPositionRef.current.lng,
            lat,
            lng
          );

          if (distance < stopThreshold) {
            // User hasn't moved much
            if (!stoppedSinceRef.current) {
              stoppedSinceRef.current = now;
            } else if (now - stoppedSinceRef.current >= stopDuration) {
              // User has been stopped long enough, register a stop
              await addStop(lat, lng);
              stoppedSinceRef.current = now; // Reset to avoid duplicates
            }
          } else {
            // User is moving
            stoppedSinceRef.current = null;
          }
        }

        lastPositionRef.current = { lat, lng, timestamp: now };
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Erreur de géolocalisation');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, [stopThreshold, stopDuration, addStop]);

  const startTour = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setStops([]);
    lastPositionRef.current = null;
    stoppedSinceRef.current = null;

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setCurrentPosition({ lat, lng });
        lastPositionRef.current = { lat, lng, timestamp: Date.now() };
        
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
        setIsActive(true);
        setIsLoading(false);

        // Start periodic position checking
        intervalRef.current = setInterval(checkPosition, trackingInterval);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Impossible de démarrer la tournée');
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  }, [checkPosition, trackingInterval]);

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
    lastPositionRef.current = null;
    stoppedSinceRef.current = null;
  }, [stopTour]);

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
    startTour,
    stopTour,
    clearTour,
  };
}
