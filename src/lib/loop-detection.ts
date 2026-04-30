/**
 * Loop detection for tour mode.
 *
 * A "loop" (aller-retour) is when the start point and end point of a tour
 * are geographically very close, AND there has been a meaningful excursion
 * in between (otherwise short pauses near the same address would be flagged).
 */

export interface LoopPoint {
  lat: number;
  lng: number;
}

/** Haversine distance in meters between two GPS points. */
export function getDistanceMeters(a: LoopPoint, b: LoopPoint): number {
  const R = 6371e3; // earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface LoopDetectionOptions {
  /** Max distance (m) between start & end to be considered "same point". */
  loopRadiusMeters?: number;
  /** Min total distance (km) to consider an actual excursion happened. */
  minExcursionKm?: number;
  /** Min distance (m) of the farthest stop from start (real loop, not pause). */
  minFarthestStopMeters?: number;
}

export interface LoopDetectionResult {
  isLoop: boolean;
  startEndDistanceMeters: number;
  farthestStopMeters: number;
  reason: string;
}

const DEFAULTS: Required<LoopDetectionOptions> = {
  loopRadiusMeters: 300,
  minExcursionKm: 2,
  minFarthestStopMeters: 1000,
};

/**
 * Detects if a sequence of stops forms a loop (start ≈ end with real travel in between).
 * Requires at least 2 stops and a meaningful total distance.
 */
export function detectLoop(
  stops: LoopPoint[],
  totalDistanceKm: number,
  options: LoopDetectionOptions = {},
): LoopDetectionResult {
  const opts = { ...DEFAULTS, ...options };

  if (stops.length < 2) {
    return {
      isLoop: false,
      startEndDistanceMeters: 0,
      farthestStopMeters: 0,
      reason: 'not_enough_stops',
    };
  }

  const start = stops[0];
  const end = stops[stops.length - 1];
  const startEnd = getDistanceMeters(start, end);

  // Farthest stop from start = excursion radius
  let farthest = 0;
  for (const s of stops) {
    const d = getDistanceMeters(start, s);
    if (d > farthest) farthest = d;
  }

  if (totalDistanceKm < opts.minExcursionKm) {
    return {
      isLoop: false,
      startEndDistanceMeters: startEnd,
      farthestStopMeters: farthest,
      reason: 'distance_too_short',
    };
  }

  if (farthest < opts.minFarthestStopMeters) {
    return {
      isLoop: false,
      startEndDistanceMeters: startEnd,
      farthestStopMeters: farthest,
      reason: 'no_real_excursion',
    };
  }

  if (startEnd > opts.loopRadiusMeters) {
    return {
      isLoop: false,
      startEndDistanceMeters: startEnd,
      farthestStopMeters: farthest,
      reason: 'start_end_too_far',
    };
  }

  return {
    isLoop: true,
    startEndDistanceMeters: startEnd,
    farthestStopMeters: farthest,
    reason: 'loop_detected',
  };
}
