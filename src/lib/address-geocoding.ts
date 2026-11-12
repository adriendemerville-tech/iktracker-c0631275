import { isUsableCoord } from "@/lib/distance";

const GEOPF_SEARCH_URL = "https://data.geopf.fr/geocodage/search";

export interface GeopfGeocodeResult {
  address: string;
  lat: number;
  lng: number;
}

/**
 * Recherche d'adresse sur la Géoplateforme.
 * L'API n'accepte qu'une seule valeur de `type` (housenumber, street, locality
 * ou municipality). `type=housenumber,street` répond HTTP 400
 * (« unexpected value ») et faisait échouer toute validation sans suggestion.
 * Sans filtre, le premier résultat est le meilleur candidat (numéro, voie ou commune).
 */
export function buildGeopfSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    limit: "1",
  });
  return `${GEOPF_SEARCH_URL}?${params}`;
}

export function parseGeopfSearchResponse(
  data: unknown,
  fallbackAddress: string,
): GeopfGeocodeResult | null {
  if (!data || typeof data !== "object") return null;
  const features = (data as { features?: unknown }).features;
  if (!Array.isArray(features) || features.length === 0) return null;

  const feature = features[0] as {
    properties?: { label?: string };
    geometry?: { coordinates?: unknown };
  };
  const coordinates = feature.geometry?.coordinates;
  if (!Array.isArray(coordinates)) return null;

  // GeoJSON : [longitude, latitude]
  const lng = coordinates[0];
  const lat = coordinates[1];
  if (typeof lat !== "number" || typeof lng !== "number" || !isUsableCoord(lat, lng)) {
    return null;
  }

  return {
    address: feature.properties?.label || fallbackAddress,
    lat,
    lng,
  };
}

export async function geocodeAddressWithGeopf(
  addressText: string,
): Promise<GeopfGeocodeResult | null> {
  const query = addressText.trim();
  if (!query) return null;

  try {
    const res = await fetch(buildGeopfSearchUrl(query));
    if (!res.ok) return null;
    return parseGeopfSearchResponse(await res.json(), query);
  } catch {
    return null;
  }
}

/** Coordonnées persistables. Le point 0,0 est un placeholder, pas une position. */
export function coordinatesForStorage(
  lat?: number | null,
  lng?: number | null,
): { latitude: number | null; longitude: number | null } {
  if (!isUsableCoord(lat, lng)) {
    return { latitude: null, longitude: null };
  }
  return { latitude: lat as number, longitude: lng as number };
}
