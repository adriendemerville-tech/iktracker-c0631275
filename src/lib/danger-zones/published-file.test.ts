import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDangerZoneFile } from "./catalog";
import { ALLOWED_RADIUS_M } from "./constants";
import { DANGER_ZONE_COPY } from "./copy";

const FORBIDDEN = ["ra", "dar"].join("");

function walk(dir: string, files: string[]) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(ts|tsx|js|jsx|json|yml|yaml)$/.test(name)) files.push(path);
  }
}

describe("fichier publié", () => {
  const raw = readFileSync("public/data/danger-zones.v1.json", "utf8");
  const json = JSON.parse(raw) as {
    v: number;
    source: {
      rows: number;
      included: number;
      groups: number;
      skippedNotSpeed: number;
      skippedSection: number;
      skippedInvalid: number;
      license: string;
      publisher: string;
    };
    rules: { motorwayM: number; roadM: number; townM: number };
    zones: unknown[];
  };

  it("respecte les longueurs du protocole et ne publie pas un rayon plus court", () => {
    expect(json.v).toBe(1);
    expect(json.rules).toEqual({ motorwayM: 4000, roadM: 2000, townM: 300, radiusFactor: 0.625 });
    expect(json.source.license).toBe("Licence Ouverte 2.0");
    expect(json.source.publisher).toContain("Intérieur");
    const accounted =
      json.source.included +
      json.source.skippedNotSpeed +
      json.source.skippedSection +
      json.source.skippedInvalid;
    expect(accounted).toBe(json.source.rows);
    expect(json.source.included).toBeGreaterThan(2000);
    expect(json.source.groups).toBe(json.zones.length);
    expect(json.source.groups).toBeLessThanOrEqual(json.source.included);

    const zones = parseDangerZoneFile(json);
    expect(zones).toHaveLength(json.zones.length);
    const radii = new Set<number>();
    for (const zone of zones) {
      expect(zone.id).toMatch(/^[0-9a-f]{16}$/);
      for (const circle of zone.circles) {
        expect(ALLOWED_RADIUS_M).toContain(circle.radiusM);
        radii.add(circle.radiusM);
      }
    }
    expect(radii).toEqual(new Set(ALLOWED_RADIUS_M));
  });

  it("n'emploie pas le mot interdit dans l'interface ni dans le fichier", () => {
    const files = ["public/data/danger-zones.v1.json", ".github/workflows/danger-zones.yml"];
    walk("src", files);
    walk("scripts", files);
    const hits = files.filter((path) =>
      readFileSync(path, "utf8").toLowerCase().includes(FORBIDDEN),
    );
    expect(hits).toEqual([]);
    const copy = JSON.stringify(DANGER_ZONE_COPY).toLowerCase();
    expect(copy).not.toContain(FORBIDDEN);
  });
});
