import { describe, expect, it } from "vitest";
import { cachedStat } from "@/lib/public-stats-cache.server";
import {
  USER_COUNT_OFFSET,
  displayedRegisteredUserCount,
  parsePublicUserCount,
} from "@/lib/user-count";

describe("compteur public d'inscrits", () => {
  it("ajoute le décalage nommé au nombre réel", () => {
    expect(USER_COUNT_OFFSET).toBe(1432);
    expect(displayedRegisteredUserCount(627)).toBe(627 + 1432);
    expect(displayedRegisteredUserCount(0)).toBe(1432);
  });

  it("accepte un entier JSON ou une chaîne, et refuse le reste", () => {
    expect(parsePublicUserCount(627)).toBe(627);
    expect(parsePublicUserCount("627")).toBe(627);
    expect(parsePublicUserCount(0)).toBe(0);
    expect(parsePublicUserCount("0")).toBe(0);
    expect(parsePublicUserCount(null)).toBeNull();
    expect(parsePublicUserCount(undefined)).toBeNull();
    expect(parsePublicUserCount("")).toBeNull();
    expect(parsePublicUserCount("12.5")).toBeNull();
    expect(parsePublicUserCount(-1)).toBeNull();
    expect(parsePublicUserCount({ count: 627 })).toBeNull();
  });

  it("ne remplace pas un comptage illisible par le décalage", () => {
    expect(parsePublicUserCount("pas-un-nombre")).toBeNull();
    const base = parsePublicUserCount(undefined);
    const displayed = base == null ? null : displayedRegisteredUserCount(base);
    expect(displayed).toBeNull();
    expect(displayed).not.toBe(1000);
    expect(displayed).not.toBe(USER_COUNT_OFFSET);
  });
});

describe("cache des stats publiques", () => {
  it("relance la lecture après un échec à froid", async () => {
    const key = `user-count-retry-${Date.now()}`;
    let calls = 0;
    await expect(
      cachedStat(key, async () => {
        calls += 1;
        throw new Error("indisponible");
      }),
    ).rejects.toThrow("indisponible");

    await expect(
      cachedStat(key, async () => {
        calls += 1;
        return 2059;
      }),
    ).resolves.toBe(2059);
    expect(calls).toBe(2);
  });
});
