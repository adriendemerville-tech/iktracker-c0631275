import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGeopfSearchUrl,
  coordinatesForStorage,
  geocodeAddressWithGeopf,
  parseGeopfSearchResponse,
} from "./address-geocoding";

const feature = {
  properties: { label: "1 Rue du Test 75001 Paris" },
  geometry: { coordinates: [2.33, 48.86] },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("recherche Géoplateforme", () => {
  it("n'envoie pas le type combiné refusé par l'API", () => {
    const url = new URL(buildGeopfSearchUrl("1 Rue du Test 75001 Paris"));
    expect(url.origin + url.pathname).toBe("https://data.geopf.fr/geocodage/search");
    expect(url.searchParams.get("q")).toBe("1 Rue du Test 75001 Paris");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(url.searchParams.getAll("type")).toEqual([]);
    expect(url.search).not.toContain("housenumber,street");
  });

  it("lit longitude puis latitude et ignore un point nul", () => {
    expect(parseGeopfSearchResponse({ features: [feature] }, "saisie")).toEqual({
      address: "1 Rue du Test 75001 Paris",
      lat: 48.86,
      lng: 2.33,
    });
    expect(
      parseGeopfSearchResponse(
        {
          features: [{ properties: { label: "placeholder" }, geometry: { coordinates: [0, 0] } }],
        },
        "saisie",
      ),
    ).toBeNull();
  });

  it("retourne les coordonnées quand l'API répond 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ features: [feature] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(geocodeAddressWithGeopf("1 Rue du Test")).resolves.toEqual({
      address: "1 Rue du Test 75001 Paris",
      lat: 48.86,
      lng: 2.33,
    });

    const called = new URL(String(fetchMock.mock.calls[0][0]));
    expect(called.searchParams.has("type")).toBe(false);
  });

  it("retourne null sur HTTP 400, comme le type inattendu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 400 }), { status: 400 })),
    );
    await expect(geocodeAddressWithGeopf("1 Rue du Test")).resolves.toBeNull();
  });
});

describe("coordinatesForStorage", () => {
  it("remplace le placeholder 0,0 par une absence de coordonnées", () => {
    expect(coordinatesForStorage(0, 0)).toEqual({ latitude: null, longitude: null });
    expect(coordinatesForStorage(48.86, 2.33)).toEqual({ latitude: 48.86, longitude: 2.33 });
  });
});
