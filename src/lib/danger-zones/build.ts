import {
  DATASET_ID,
  LICENSE,
  MOTORWAY_LENGTH_M,
  PUBLISHER,
  RADIUS_FACTOR,
  ROAD_LENGTH_M,
  TOWN_LENGTH_M,
} from "./constants.ts";
import { distanceMeters, fnvHex, minimumTraversalMeters, placeZoneCenter } from "./geometry.ts";
import type { SourceRow } from "./types.ts";

const SPEED_TYPES = new Set(["ETF", "ETD", "ETT", "ETU"]);
const SECTION_TYPES = new Set(["ETVM"]);

export interface BuildMeta {
  generatedAt: string;
  contentSha256: string;
  resourceLastModified: string;
  resourceId: string;
  datasetId?: string;
}

export interface BuiltCircle {
  lat: number;
  lng: number;
  radiusM: number;
  vma: number | null;
  lengthM: number;
  sourceId: string;
  sourceLat: number;
  sourceLng: number;
}

export interface DangerZoneFile {
  v: 1;
  generatedAt: string;
  source: {
    publisher: string;
    datasetId: string;
    resourceId: string;
    resourceLastModified: string;
    contentSha256: string;
    license: string;
    rows: number;
    included: number;
    groups: number;
    skippedNotSpeed: number;
    skippedSection: number;
    skippedInvalid: number;
  };
  rules: {
    motorwayM: number;
    roadM: number;
    townM: number;
    radiusFactor: number;
  };
  zones: Array<{ id: string; c: Array<[number, number, number, number | null]> }>;
}

export function parseVma(raw: string): number | null {
  const text = raw.trim().toUpperCase();
  if (!text || text === "NA" || text === "N/A" || text === "-") return null;
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** Section length in metres, or null when this row is not a fixed speed device. */
export function protocolLengthM(type: string, vma: number | null): number | null {
  const code = type.trim().toUpperCase();
  if (!SPEED_TYPES.has(code)) return null;
  if (code === "ETU" || (vma != null && vma >= 30 && vma <= 50)) return TOWN_LENGTH_M;
  if (vma === 110 || vma === 130) return MOTORWAY_LENGTH_M;
  if (vma != null && vma >= 60 && vma <= 90) return ROAD_LENGTH_M;
  // Missing or unexpected limit on a non-urban device: use the longest section.
  return MOTORWAY_LENGTH_M;
}

export function parseSourceCsv(text: string): { rows: SourceRow[]; invalid: number } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], invalid: 0 };

  const header = lines[0].split(";").map((cell) => cell.trim().toLowerCase());
  const index = (prefix: string) => header.findIndex((cell) => cell.startsWith(prefix));
  const iId = index("num");
  const iType = index("type");
  const iVma = index("vma");
  const iLat = index("lat");
  const iLng = index("lon");
  if ([iId, iType, iVma, iLat, iLng].some((value) => value < 0)) {
    throw new Error("Unexpected source table header");
  }

  const rows: SourceRow[] = [];
  let invalid = 0;
  for (const line of lines.slice(1)) {
    const cells = line.split(";");
    const lat = Number(cells[iLat]?.trim());
    const lng = Number(cells[iLng]?.trim());
    const id = cells[iId]?.trim() ?? "";
    if (
      !id ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      invalid += 1;
      continue;
    }
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
      invalid += 1;
      continue;
    }
    rows.push({
      id,
      type: cells[iType]?.trim() ?? "",
      vma: parseVma(cells[iVma] ?? ""),
      lat,
      lng,
    });
  }
  return { rows, invalid };
}

export function circleFromRow(row: SourceRow): BuiltCircle | "section" | "not-speed" | null {
  const code = row.type.trim().toUpperCase();
  if (SECTION_TYPES.has(code)) return "section";
  const lengthM = protocolLengthM(row.type, row.vma);
  if (lengthM == null) return "not-speed";
  const placed = placeZoneCenter(row.id, row.lat, row.lng, lengthM);
  const chord = minimumTraversalMeters(placed.radiusM, placed.offsetM);
  if (!(placed.offsetM > 1 && chord + 1e-3 >= lengthM)) {
    throw new Error(`Zone geometry rejected for ${row.id}`);
  }
  if (distanceMeters(row.lat, row.lng, placed.lat, placed.lng) > placed.radiusM) {
    throw new Error(`Source point left the zone for ${row.id}`);
  }
  return {
    lat: placed.lat,
    lng: placed.lng,
    radiusM: placed.radiusM,
    vma: row.vma,
    lengthM,
    sourceId: row.id,
    sourceLat: row.lat,
    sourceLng: row.lng,
  };
}

function circlesOverlap(a: BuiltCircle, b: BuiltCircle): boolean {
  return distanceMeters(a.lat, a.lng, b.lat, b.lng) <= a.radiusM + b.radiusM;
}

export function mergeCircles(
  circles: BuiltCircle[],
): Array<{ id: string; circles: BuiltCircle[] }> {
  const parent = circles.map((_, index) => index);
  const find = (index: number): number => {
    let cursor = index;
    while (parent[cursor] !== cursor) {
      parent[cursor] = parent[parent[cursor]];
      cursor = parent[cursor];
    }
    return cursor;
  };
  const union = (a: number, b: number) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent[pa] = pb;
  };

  const cell = 0.1;
  const buckets = new Map<string, number[]>();
  const keyOf = (lat: number, lng: number) => `${Math.floor(lat / cell)}:${Math.floor(lng / cell)}`;
  circles.forEach((circle, index) => {
    const key = keyOf(circle.lat, circle.lng);
    const list = buckets.get(key);
    if (list) list.push(index);
    else buckets.set(key, [index]);
  });

  circles.forEach((circle, index) => {
    const y = Math.floor(circle.lat / cell);
    const x = Math.floor(circle.lng / cell);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const list = buckets.get(`${y + dy}:${x + dx}`);
        if (!list) continue;
        for (const other of list) {
          if (other <= index) continue;
          if (circlesOverlap(circle, circles[other])) union(index, other);
        }
      }
    }
  });

  const groups = new Map<number, BuiltCircle[]>();
  circles.forEach((circle, index) => {
    const root = find(index);
    const list = groups.get(root);
    if (list) list.push(circle);
    else groups.set(root, [circle]);
  });

  return [...groups.values()].map((group) => {
    const signature = group
      .map((circle) => `${circle.lat.toFixed(5)},${circle.lng.toFixed(5)},${circle.radiusM}`)
      .sort()
      .join("|");
    return { id: fnvHex(signature), circles: group };
  });
}

export function buildDangerZoneFile(
  rows: SourceRow[],
  meta: BuildMeta,
  invalidRows = 0,
): DangerZoneFile {
  const circles: BuiltCircle[] = [];
  let skippedNotSpeed = 0;
  let skippedSection = 0;
  for (const row of rows) {
    const circle = circleFromRow(row);
    if (circle === "section") {
      skippedSection += 1;
      continue;
    }
    if (circle === "not-speed" || circle == null) {
      skippedNotSpeed += 1;
      continue;
    }
    circles.push(circle);
  }

  const groups = mergeCircles(circles).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return {
    v: 1,
    generatedAt: meta.generatedAt,
    source: {
      publisher: PUBLISHER,
      datasetId: meta.datasetId ?? DATASET_ID,
      resourceId: meta.resourceId,
      resourceLastModified: meta.resourceLastModified,
      contentSha256: meta.contentSha256,
      license: LICENSE,
      rows: rows.length + invalidRows,
      included: circles.length,
      groups: groups.length,
      skippedNotSpeed,
      skippedSection,
      skippedInvalid: invalidRows,
    },
    rules: {
      motorwayM: MOTORWAY_LENGTH_M,
      roadM: ROAD_LENGTH_M,
      townM: TOWN_LENGTH_M,
      radiusFactor: RADIUS_FACTOR,
    },
    zones: groups.map((group) => ({
      id: group.id,
      c: group.circles.map((circle) => [circle.lat, circle.lng, circle.radiusM, circle.vma]),
    })),
  };
}

/** Public file shape: zone centers only. Source coordinates are not copied. */
export function publicZonesOmitSources(file: DangerZoneFile, rows: SourceRow[]): boolean {
  const raw = JSON.stringify(file);
  return rows.every((row) => !raw.includes(`"${row.id}"`) && !raw.includes(row.id));
}
