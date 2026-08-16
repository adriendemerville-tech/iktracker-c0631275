import { supabase } from "./supabase";
import { haversineKm } from "./geo";

/** Facteur de sinuosité : une route réelle est plus longue que la ligne droite. */
const ROAD_FACTOR = 1.25;

export interface Coord {
  lat: number;
  lng: number;
}

export function straightLineKm(a: Coord, b: Coord): number {
  return haversineKm({ ...a, timestamp: 0 }, { ...b, timestamp: 0 });
}

function fallbackKm(a: Coord, b: Coord): number {
  return Math.round(straightLineKm(a, b) * ROAD_FACTOR * 100) / 100;
}

let cachedKey: string | null = null;

async function getMapsKey(): Promise<string | null> {
  if (cachedKey) return cachedKey;
  try {
    const { data, error } = await supabase.functions.invoke("google-maps-key");
    if (error) return null;
    const key = (data as { key?: string } | null)?.key ?? null;
    cachedKey = key;
    return key;
  } catch {
    return null;
  }
}

/**
 * Distance routière départ → arrivée (Google Distance Matrix).
 * Retombe sur une estimation Haversine × 1,25 si l'API est indisponible.
 */
export async function drivingDistanceKm(
  origin: Coord,
  destination: Coord,
): Promise<{ km: number; source: "google" | "estimation" }> {
  const key = await getMapsKey();
  if (!key) return { km: fallbackKm(origin, destination), source: "estimation" };

  try {
    const url =
      "https://maps.googleapis.com/maps/api/distancematrix/json" +
      `?origins=${origin.lat},${origin.lng}` +
      `&destinations=${destination.lat},${destination.lng}` +
      `&mode=driving&units=metric&key=${key}`;
    const res = await fetch(url);
    const json = (await res.json()) as {
      rows?: Array<{ elements?: Array<{ status?: string; distance?: { value?: number } }> }>;
    };
    const el = json.rows?.[0]?.elements?.[0];
    if (el?.status === "OK" && typeof el.distance?.value === "number") {
      return { km: Math.round((el.distance.value / 1000) * 100) / 100, source: "google" };
    }
  } catch {
    // ignore : on bascule sur l'estimation
  }
  return { km: fallbackKm(origin, destination), source: "estimation" };
}
