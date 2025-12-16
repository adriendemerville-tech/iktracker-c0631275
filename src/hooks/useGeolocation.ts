import { useState, useCallback } from 'react';

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

// Calculate distance between two points using Haversine formula (fallback)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Calculate driving distance using Google Maps Distance Matrix API
export function calculateDrivingDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number> {
  return new Promise((resolve, reject) => {
    if (typeof google === 'undefined' || !google.maps) {
      // Fallback to Haversine if Google Maps not loaded
      console.warn('Google Maps not loaded, using straight-line distance');
      resolve(calculateDistance(lat1, lng1, lat2, lng2));
      return;
    }

    const service = new google.maps.DistanceMatrixService();
    
    service.getDistanceMatrix(
      {
        origins: [new google.maps.LatLng(lat1, lng1)],
        destinations: [new google.maps.LatLng(lat2, lng2)],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status === 'OK' && response) {
          const result = response.rows[0]?.elements[0];
          if (result?.status === 'OK' && result.distance) {
            // Convert meters to kilometers
            const distanceKm = result.distance.value / 1000;
            resolve(distanceKm);
          } else {
            console.warn('Distance Matrix returned no result, using straight-line distance');
            resolve(calculateDistance(lat1, lng1, lat2, lng2));
          }
        } else {
          console.warn('Distance Matrix API error:', status, ', using straight-line distance');
          resolve(calculateDistance(lat1, lng1, lat2, lng2));
        }
      }
    );
  });
}
