import { ALLOWED_RADIUS_M } from "./constants.ts";
import type { DangerZone } from "./types.ts";

const CACHE_KEY = "ik-zones-v1";
const FILE_URL = "/data/danger-zones.v1.json";

function browserStore(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function parseDangerZoneFile(data: unknown): DangerZone[] {
  if (!data || typeof data !== "object") return [];
  const record = data as { v?: unknown; zones?: unknown };
  if (record.v !== 1 || !Array.isArray(record.zones)) return [];

  const allowed = new Set<number>(ALLOWED_RADIUS_M);
  const zones: DangerZone[] = [];

  for (const raw of record.zones) {
    if (!raw || typeof raw !== "object") continue;
    const zone = raw as { id?: unknown; c?: unknown };
    if (typeof zone.id !== "string" || !Array.isArray(zone.c)) continue;
    const circles = [];
    for (const item of zone.c) {
      if (!Array.isArray(item) || item.length < 3) continue;
      const lat = Number(item[0]);
      const lng = Number(item[1]);
      const radiusM = Number(item[2]);
      const vmaRaw = item[3];
      const vma =
        typeof vmaRaw === "number" && Number.isFinite(vmaRaw) && vmaRaw > 0 ? vmaRaw : null;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !allowed.has(radiusM)) continue;
      circles.push({ lat, lng, radiusM, vma });
    }
    if (circles.length > 0) zones.push({ id: zone.id, circles });
  }

  return zones;
}

export async function loadDangerZones(): Promise<DangerZone[]> {
  try {
    const response = await fetch(FILE_URL, { cache: "no-cache" });
    if (response.ok) {
      const json = await response.json();
      const zones = parseDangerZoneFile(json);
      if (zones.length > 0) {
        try {
          browserStore()?.setItem(CACHE_KEY, JSON.stringify(json));
        } catch {
          // The phone can keep going with the copy already in memory.
        }
        return zones;
      }
    }
  } catch {
    // Offline or blocked: fall back to the last copy kept on the phone.
  }

  try {
    const cached = browserStore()?.getItem(CACHE_KEY);
    if (cached) return parseDangerZoneFile(JSON.parse(cached));
  } catch {
    return [];
  }
  return [];
}
