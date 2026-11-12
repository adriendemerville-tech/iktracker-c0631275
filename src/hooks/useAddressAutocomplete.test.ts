import { afterEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_INCLUDED_PRIMARY_TYPES, searchGoogle } from "./useAddressAutocomplete";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const prediction = {
  suggestions: [
    {
      placePrediction: {
        text: { text: "1 Rue du Test" },
        structuredFormat: {
          mainText: { text: "1 Rue du Test" },
          secondaryText: { text: "75001 Paris, France" },
        },
      },
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("types Google Places", () => {
  it("n'envoie pas plus de 5 includedPrimaryTypes", async () => {
    expect(GOOGLE_INCLUDED_PRIMARY_TYPES).toEqual([
      "street_address",
      "route",
      "premise",
      "locality",
      "postal_code",
    ]);
    expect(GOOGLE_INCLUDED_PRIMARY_TYPES.length).toBeLessThanOrEqual(5);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ suggestions: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await searchGoogle("1 rue du test", "fixture-key", new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:autocomplete");
    expect((init.headers as Record<string, string>)["X-Goog-Api-Key"]).toBe("fixture-key");
    const body = JSON.parse(String(init.body));
    expect(body.includedPrimaryTypes).toEqual([...GOOGLE_INCLUDED_PRIMARY_TYPES]);
    expect(body.includedPrimaryTypes).toHaveLength(5);
    expect(body.includedPrimaryTypes).not.toContain("sublocality");
    expect(body.includedPrimaryTypes).not.toContain("administrative_area_level_3");
    expect(body.includedPrimaryTypes).not.toContain("subpremise");
  });

  it("renvoie un placeholder 0,0 à géocoder à la sélection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => prediction,
      }),
    );

    const results = await searchGoogle(
      "1 rue du test",
      "fixture-key",
      new AbortController().signal,
    );

    expect(results).toHaveLength(1);
    expect(results?.[0]).toMatchObject({
      street: "1 Rue du Test",
      zipcode: "75001",
      city: "Paris",
      lat: 0,
      lng: 0,
    });
  });

  it("signale un échec pour laisser la place au repli", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }),
    );
    await expect(
      searchGoogle("1 rue du test", "fixture-key", new AbortController().signal),
    ).resolves.toBeNull();
  });
});
