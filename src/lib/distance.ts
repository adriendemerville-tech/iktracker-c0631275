// Distance calculation utilities

/**
 * Calculate straight-line distance between two points using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in meters
 */
export function getDistanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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
}

/**
 * Calculate straight-line distance between two points in kilometers
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function getDistanceInKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return getDistanceInMeters(lat1, lng1, lat2, lng2) / 1000;
}

/**
 * Calculate driving distance using Google Maps Distance Matrix API
 * Falls back to straight-line distance if API unavailable
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Promise with distance in kilometers
 */
export function calculateDrivingDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number> {
  return new Promise((resolve) => {
    if (typeof google === 'undefined' || !google.maps) {
      // Fallback to Haversine if Google Maps not loaded
      console.warn('Google Maps not loaded, using straight-line distance');
      resolve(getDistanceInKm(lat1, lng1, lat2, lng2));
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
            resolve(getDistanceInKm(lat1, lng1, lat2, lng2));
          }
        } else {
          console.warn('Distance Matrix API error:', status, ', using straight-line distance');
          resolve(getDistanceInKm(lat1, lng1, lat2, lng2));
        }
      }
    );
  });
}
