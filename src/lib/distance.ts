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
export function isUsableCoord(lat?: number | null, lng?: number | null): boolean {
  return typeof lat === 'number' && typeof lng === 'number'
    && Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    // (0,0) is the Gulf of Guinea placeholder returned by non-geocoded
    // Google Places predictions: never compute a distance from it.
    && !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001);
}

export function calculateDrivingDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number> {
  return new Promise((resolve) => {
    if (!isUsableCoord(lat1, lng1) || !isUsableCoord(lat2, lng2)) {
      console.warn('Invalid coordinates for distance calculation, returning 0', { lat1, lng1, lat2, lng2 });
      resolve(0);
      return;
    }

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

export interface MatrixCell { distanceKm: number; durationSec: number }

/**
 * Full N×N driving matrix (Google Distance Matrix). Falls back to Haversine
 * for distance and an average 60 km/h estimation for duration if API fails.
 */
export function calculateDrivingMatrix(
  points: Array<{ lat: number; lng: number }>
): Promise<MatrixCell[][]> {
  const n = points.length;
  const fallback = (): MatrixCell[][] =>
    points.map((a) =>
      points.map((b) => {
        const km = getDistanceInKm(a.lat, a.lng, b.lat, b.lng);
        return { distanceKm: km, durationSec: (km / 60) * 3600 };
      })
    );

  return new Promise((resolve) => {
    if (typeof google === 'undefined' || !google.maps) {
      resolve(fallback());
      return;
    }
    const service = new google.maps.DistanceMatrixService();
    const latLngs = points.map((p) => new google.maps.LatLng(p.lat, p.lng));
    service.getDistanceMatrix(
      {
        origins: latLngs,
        destinations: latLngs,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status !== 'OK' || !response) {
          resolve(fallback());
          return;
        }
        const out: MatrixCell[][] = [];
        for (let i = 0; i < n; i++) {
          const row: MatrixCell[] = [];
          for (let j = 0; j < n; j++) {
            const el = response.rows[i]?.elements[j];
            if (el?.status === 'OK' && el.distance && el.duration) {
              row.push({ distanceKm: el.distance.value / 1000, durationSec: el.duration.value });
            } else {
              const km = getDistanceInKm(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
              row.push({ distanceKm: km, durationSec: (km / 60) * 3600 });
            }
          }
          out.push(row);
        }
        resolve(out);
      }
    );
  });
}

/**
 * Brute-force TSP with fixed start (index 0) and end (index n-1).
 * Optimizes the order of intermediate stops (indices 1..n-2) to minimize total duration.
 * Returns the ordered list of intermediate indices.
 */
export function optimizeStopOrder(matrix: MatrixCell[][]): number[] {
  const n = matrix.length;
  if (n <= 2) return [];
  const stops = Array.from({ length: n - 2 }, (_, i) => i + 1);
  if (stops.length <= 1) return stops;

  let bestOrder = stops.slice();
  let bestCost = Infinity;

  const permute = (arr: number[], start: number) => {
    if (start === arr.length - 1) {
      let cost = matrix[0][arr[0]].durationSec;
      for (let i = 0; i < arr.length - 1; i++) cost += matrix[arr[i]][arr[i + 1]].durationSec;
      cost += matrix[arr[arr.length - 1]][n - 1].durationSec;
      if (cost < bestCost) { bestCost = cost; bestOrder = arr.slice(); }
      return;
    }
    for (let i = start; i < arr.length; i++) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      permute(arr, start + 1);
      [arr[start], arr[i]] = [arr[i], arr[start]];
    }
  };
  // Cap at 7 intermediates (5040 permutations) to keep it snappy
  if (stops.length > 7) return stops;
  permute(stops, 0);
  return bestOrder;
}
