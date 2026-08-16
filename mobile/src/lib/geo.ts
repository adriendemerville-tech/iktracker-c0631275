export interface Point {
  lat: number;
  lng: number;
  timestamp: number;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Point, b: Point): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Filtres identiques au web : on ignore <5 m (bruit GPS) et >50 m/s (saut aberrant). */
export function accumulateDistance(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const km = haversineKm(prev, cur);
    const seconds = Math.max(1, (cur.timestamp - prev.timestamp) / 1000);
    const speedMs = (km * 1000) / seconds;
    if (km * 1000 < 5) continue;
    if (speedMs > 50) continue;
    total += km;
  }
  return Math.round(total * 100) / 100;
}

/** Arrêt détecté : immobile (<100 m) pendant au moins 2 minutes. */
export function detectStops(points: Point[]): Point[] {
  const stops: Point[] = [];
  let anchor = points[0];
  if (!anchor) return stops;
  for (const p of points) {
    if (haversineKm(anchor, p) * 1000 > 100) {
      anchor = p;
      continue;
    }
    if (p.timestamp - anchor.timestamp >= 120_000) {
      stops.push(anchor);
      anchor = p;
    }
  }
  return stops;
}
