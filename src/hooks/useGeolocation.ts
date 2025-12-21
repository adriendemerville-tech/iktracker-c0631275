import { useState, useCallback } from 'react';

// Re-export distance functions from centralized module
export { 
  getDistanceInKm as calculateDistance, 
  calculateDrivingDistance 
} from '@/lib/distance';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    loading: false,
    error: null,
  });

  const getCurrentPosition = useCallback(() => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'La géolocalisation n\'est pas supportée';
        setState(s => ({ ...s, error, loading: false }));
        reject(new Error(error));
        return;
      }

      setState(s => ({ ...s, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setState({
            ...coords,
            loading: false,
            error: null,
          });
          resolve(coords);
        },
        (error) => {
          let message = 'Erreur de géolocalisation';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permission refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Position indisponible';
              break;
            case error.TIMEOUT:
              message = 'Délai dépassé';
              break;
          }
          setState(s => ({ ...s, loading: false, error: message }));
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  return {
    ...state,
    getCurrentPosition,
  };
}
