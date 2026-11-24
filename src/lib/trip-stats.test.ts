import { describe, expect, it, vi } from "vitest";
import { cachedStat, lastKnown } from "@/lib/public-stats-cache.server";
import {
  PUBLIC_TRIP_STATS_DEADLINE_MS,
  isZeroTripStatsFallback,
  parsePublicTripStats,
  publicTripStatsSeed,
  publishablePublicTripStats,
} from "@/lib/trip-stats";

const REAL = { tripCount: 9_778, totalKm: 1_280_700 };

describe("compteurs publics trajets et kilomètres", () => {
  it("laisse à la base le temps de répondre au rendu", () => {
    expect(PUBLIC_TRIP_STATS_DEADLINE_MS).toBeGreaterThanOrEqual(2_000);
    expect(PUBLIC_TRIP_STATS_DEADLINE_MS).not.toBe(120);
  });

  it("lit une ligne, un tableau, ou des nombres en chaîne", () => {
    expect(parsePublicTripStats([{ trip_count: 9778, total_distance: 1_280_699.4 }])).toEqual({
      tripCount: 9778,
      totalKm: 1_280_699,
    });
    expect(parsePublicTripStats({ trip_count: "9778", total_distance: "1280700.2" })).toEqual({
      tripCount: 9778,
      totalKm: 1_280_700,
    });
    expect(parsePublicTripStats([{ trip_count: 0, total_distance: 12.4 }])).toEqual({
      tripCount: 0,
      totalKm: 12,
    });
  });

  it("refuse une charge illisible au lieu d'inventer zéro", () => {
    for (const payload of [null, undefined, [], {}, [{ trip_count: 9778 }], "9778", -1]) {
      expect(parsePublicTripStats(payload)).toBeNull();
    }
    expect(parsePublicTripStats([{ trip_count: "12.5", total_distance: 10 }])).toBeNull();
    expect(parsePublicTripStats([{ trip_count: -1, total_distance: 10 }])).toBeNull();
    const displayed = publishablePublicTripStats(parsePublicTripStats(undefined));
    expect(displayed).toBeNull();
    expect(displayed).not.toEqual({ tripCount: 0, totalKm: 0 });
  });

  it("ne publie pas le couple nul de repli", () => {
    const zeros = parsePublicTripStats([{ trip_count: 0, total_distance: 0 }]);
    expect(zeros).toEqual({ tripCount: 0, totalKm: 0 });
    expect(isZeroTripStatsFallback(zeros!)).toBe(true);
    expect(publishablePublicTripStats(zeros)).toBeNull();
    expect(publicTripStatsSeed(0, 0)).toBeNull();
    expect(publicTripStatsSeed(undefined, undefined)).toBeNull();
    expect(publicTripStatsSeed(9778, 1_280_700)).toEqual(REAL);
    expect(publicTripStatsSeed(3, 0)).toEqual({ tripCount: 3, totalKm: 0 });
  });
});

describe("cache des stats de trajets", () => {
  it("n'enregistre pas le couple nul et réessaie ensuite", async () => {
    const key = `trip-stats-zero-${Date.now()}`;
    let calls = 0;
    await expect(
      cachedStat(key, async () => {
        calls += 1;
        const parsed = publishablePublicTripStats(
          parsePublicTripStats([{ trip_count: 0, total_distance: 0 }]),
        );
        if (!parsed) throw new Error("repli");
        return parsed;
      }),
    ).rejects.toThrow("repli");
    expect(lastKnown(key, null)).toBeNull();

    await expect(
      cachedStat(key, async () => {
        calls += 1;
        return REAL;
      }),
    ).resolves.toEqual(REAL);
    expect(calls).toBe(2);
    expect(lastKnown(key, { tripCount: 0, totalKm: 0 })).toEqual(REAL);
  });

  it("ressert la dernière mesure quand le rafraîchissement échoue", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = new Date("2026-06-01T00:00:00Z");
    vi.setSystemTime(start);
    const key = `trip-stats-stale-${start.getTime()}`;
    try {
      await expect(cachedStat(key, async () => REAL)).resolves.toEqual(REAL);
      vi.setSystemTime(new Date(start.getTime() + 11 * 60 * 1000));
      await expect(
        cachedStat(key, async () => {
          throw new Error("indisponible");
        }),
      ).resolves.toEqual(REAL);
      expect(lastKnown(key, null)).toEqual(REAL);
    } finally {
      vi.useRealTimers();
    }
  });
});
