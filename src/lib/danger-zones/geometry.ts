import { OFFSET_FRACTION_MIN, OFFSET_FRACTION_SPAN, RADIUS_FACTOR } from "./constants.ts";

const EARTH_RADIUS_M = 6_371_000;

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function destinationPoint(
  lat: number,
  lng: number,
  distanceM: number,
  bearingRad: number,
): { lat: number; lng: number } {
  const δ = distanceM / EARTH_RADIUS_M;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(bearingRad),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  const lngDeg = (((((λ2 * 180) / Math.PI) % 360) + 540) % 360) - 180;
  return { lat: (φ2 * 180) / Math.PI, lng: lngDeg };
}

export function bearingDegrees(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function headingDeltaDegrees(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Shortest straight crossing of a circle through a point `offsetM` from its center. */
export function minimumTraversalMeters(radiusM: number, offsetM: number): number {
  const d = Math.min(Math.abs(offsetM), radiusM);
  return 2 * Math.sqrt(Math.max(0, radiusM * radiusM - d * d));
}

function hashUnit(seed: string, salt: string): number {
  let h = 2_166_136_261;
  const text = `${salt}\0${seed}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return (h >>> 0) / 4_294_967_296;
}

export function fnvHex(text: string): string {
  const left = hashUnit(text, "id-a");
  const right = hashUnit(text, "id-b");
  const hex = (unit: number) =>
    Math.floor(unit * 4_294_967_296)
      .toString(16)
      .padStart(8, "0");
  return `${hex(left)}${hex(right)}`;
}

export function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

/**
 * Place the zone center away from the source point.
 * The shift is stable for a given id and different from one id to the next.
 * The source point stays inside the circle and is never the center.
 */
export function placeZoneCenter(
  sourceId: string,
  lat: number,
  lng: number,
  lengthM: number,
): { lat: number; lng: number; radiusM: number; offsetM: number } {
  const radiusM = lengthM * RADIUS_FACTOR;
  const bearing = hashUnit(sourceId, "angle") * Math.PI * 2;
  let fraction = OFFSET_FRACTION_MIN + hashUnit(sourceId, "distance") * OFFSET_FRACTION_SPAN;

  let center = { lat, lng };
  let offsetM = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const raw = destinationPoint(lat, lng, fraction * radiusM, bearing);
    center = { lat: roundCoord(raw.lat), lng: roundCoord(raw.lng) };
    offsetM = distanceMeters(lat, lng, center.lat, center.lng);
    const chord = minimumTraversalMeters(radiusM, offsetM);
    if (offsetM > 1 && offsetM <= radiusM && chord + 1e-3 >= lengthM) {
      return { lat: center.lat, lng: center.lng, radiusM, offsetM };
    }
    fraction *= 0.85;
  }

  throw new Error(`Zone geometry rejected for ${sourceId}`);
}
