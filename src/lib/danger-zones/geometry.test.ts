import { describe, expect, it } from "vitest";
import { buildDangerZoneFile, circleFromRow, parseSourceCsv, protocolLengthM } from "./build";
import { MOTORWAY_LENGTH_M, ROAD_LENGTH_M, TOWN_LENGTH_M } from "./constants";
import { distanceMeters, minimumTraversalMeters, placeZoneCenter } from "./geometry";
import type { SourceRow } from "./types";

const meta = {
  generatedAt: "2026-10-27T00:00:00.000Z",
  contentSha256: "abc",
  resourceLastModified: "2025-12-30T13:42:47.222000+00:00",
  resourceId: "resource",
};

describe("longueur des zones", () => {
  it("applique 4 km, 2 km et 300 m selon la limitation", () => {
    expect(protocolLengthM("ETT", 130)).toBe(MOTORWAY_LENGTH_M);
    expect(protocolLengthM("ETF", 110)).toBe(MOTORWAY_LENGTH_M);
    expect(protocolLengthM("ETF", 90)).toBe(ROAD_LENGTH_M);
    expect(protocolLengthM("ETF", 60)).toBe(ROAD_LENGTH_M);
    expect(protocolLengthM("ETF", 80)).toBe(ROAD_LENGTH_M);
    expect(protocolLengthM("ETF", 50)).toBe(TOWN_LENGTH_M);
    expect(protocolLengthM("ETF", 30)).toBe(TOWN_LENGTH_M);
    expect(protocolLengthM("ETU", 50)).toBe(TOWN_LENGTH_M);
    expect(protocolLengthM("ETU", null)).toBe(TOWN_LENGTH_M);
    expect(protocolLengthM("ETT", null)).toBe(MOTORWAY_LENGTH_M);
  });

  it("ignore les feux, les passages à niveau et les tronçons", () => {
    expect(protocolLengthM("ETFR", 50)).toBeNull();
    expect(protocolLengthM("ETPN", null)).toBeNull();
    expect(circleFromRow({ id: "s1", type: "ETVM", vma: 110, lat: 45, lng: 1 })).toBe("section");
  });
});

describe("position dans la zone", () => {
  it("ne met jamais le point d'origine au centre et garde une traversée d'au moins L", () => {
    for (const length of [TOWN_LENGTH_M, ROAD_LENGTH_M, MOTORWAY_LENGTH_M]) {
      const seen = new Set<string>();
      for (let n = 0; n < 80; n++) {
        const id = `seed-${length}-${n}`;
        const placed = placeZoneCenter(id, 46.5, 2.3, length);
        const chord = minimumTraversalMeters(placed.radiusM, placed.offsetM);
        expect(placed.offsetM).toBeGreaterThan(1);
        expect(placed.offsetM).toBeLessThanOrEqual(placed.radiusM);
        expect(chord).toBeGreaterThanOrEqual(length - 0.01);
        expect(distanceMeters(46.5, 2.3, placed.lat, placed.lng)).toBeLessThanOrEqual(
          placed.radiusM,
        );
        seen.add(`${Math.round(placed.offsetM)}:${placed.lat.toFixed(5)}:${placed.lng.toFixed(5)}`);
        expect(placeZoneCenter(id, 46.5, 2.3, length)).toEqual(placed);
      }
      expect(seen.size).toBeGreaterThan(40);
    }
  });

  it("fusionne les zones qui se chevauchent et n'écrit pas l'identifiant d'origine", () => {
    const rows: SourceRow[] = [
      { id: "SOURCE-KEY-884411", type: "ETF", vma: 50, lat: 45, lng: 1 },
      { id: "SOURCE-KEY-884412", type: "ETF", vma: 50, lat: 45.0008, lng: 1 },
      { id: "SOURCE-KEY-884413", type: "ETT", vma: 130, lat: 48, lng: 3 },
    ];
    const file = buildDangerZoneFile(rows, meta);
    expect(file.source.included).toBe(3);
    expect(file.zones).toHaveLength(2);
    const town = file.zones.find((zone) => zone.c.length === 2);
    expect(town).toBeTruthy();
    const raw = JSON.stringify(file);
    expect(raw).not.toContain("SOURCE-KEY-884411");
    expect(raw).not.toContain("SOURCE-KEY-884412");
    expect(raw).not.toContain("SOURCE-KEY-884413");
  });

  it("lit un tableau séparé par des points-virgules", () => {
    const csv = [
      "Numéro;Type;Date;VMA ;Latitude; Longitude",
      "12001;ETD;31/10/2011 00:00;70;+45.361;+4.2526",
      "9;ETFR;01/01/2020 00:00;NA;+48.1;+2.2",
    ].join("\n");
    const parsed = parseSourceCsv(csv);
    expect(parsed.invalid).toBe(0);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      id: "12001",
      type: "ETD",
      vma: 70,
      lat: 45.361,
      lng: 4.2526,
    });
    const file = buildDangerZoneFile(parsed.rows, meta, parsed.invalid);
    expect(file.source.included).toBe(1);
    expect(file.source.skippedNotSpeed).toBe(1);
    expect(file.zones[0].c[0][2]).toBe(ROAD_LENGTH_M * 0.625);
  });
});
