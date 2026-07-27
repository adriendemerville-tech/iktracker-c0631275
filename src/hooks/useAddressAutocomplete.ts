import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AddressSuggestion {
  fulltext: string;
  street: string;
  city: string;
  zipcode: string;
  lat: number;
  lng: number;
}

const GEOPF_URL = 'https://data.geopf.fr/geocodage/completion/';

// --- Google Maps key cache ---
let googleKeyPromise: Promise<string | null> | null = null;
let googleKeyResolved: string | null | undefined = undefined; // undefined = not yet resolved

function getGoogleApiKey(): Promise<string | null> {
  if (googleKeyResolved !== undefined) return Promise.resolve(googleKeyResolved);
  if (!googleKeyPromise) {
    googleKeyPromise = supabase.functions
      .invoke('google-maps-key')
      .then(({ data, error }) => {
        if (error || !data?.key) {
          googleKeyResolved = null;
          return null;
        }
        googleKeyResolved = data.key;
        return data.key as string;
      })
      .catch(() => {
        googleKeyResolved = null;
        return null;
      });
  }
  return googleKeyPromise;
}

function createTimeoutSignal(parentSignal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  const abort = () => controller.abort();
  parentSignal.addEventListener('abort', abort, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeout);
      parentSignal.removeEventListener('abort', abort);
    },
  };
}

// --- Google Places Autocomplete (New API via REST) ---
async function searchGoogle(
  text: string,
  apiKey: string,
  signal: AbortSignal
): Promise<AddressSuggestion[] | null> {
  const timedSignal = createTimeoutSignal(signal, 1000);

  try {
    const res = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input: text,
          languageCode: 'fr',
          regionCode: 'FR',
          // Autoriser aussi villes / codes postaux : ni la voie ni le numéro ne sont obligatoires
          includedPrimaryTypes: [
            'locality',
            'sublocality',
            'postal_code',
            'administrative_area_level_3',
            'street_address',
            'route',
            'premise',
            'subpremise',
          ],
        }),
        signal: timedSignal.signal,
      }
    );

    if (!res.ok) {
      console.warn('Google Places API error:', res.status);
      return null; // signal to fallback
    }

    const data = await res.json();
    const suggestions = data.suggestions;

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return null;
    }

    // We need to get place details for coordinates
    const results: AddressSuggestion[] = [];
    for (const s of suggestions.slice(0, 5)) {
      const prediction = s.placePrediction;
      if (!prediction) continue;

      const fulltext = prediction.text?.text || prediction.structuredFormat?.mainText?.text || '';
      const secondary = prediction.structuredFormat?.secondaryText?.text || '';

      // Extract city and zipcode from secondary text (e.g. "75001 Paris, France")
      const zipMatch = secondary.match(/(\d{5})/);
      const zipcode = zipMatch ? zipMatch[1] : '';
      const city = secondary.replace(/\d{5}\s*/, '').replace(/,?\s*France\s*$/i, '').trim();

      results.push({
        fulltext: `${fulltext}, ${secondary}`.replace(/,?\s*France\s*$/i, '').trim(),
        street: prediction.structuredFormat?.mainText?.text || fulltext,
        city,
        zipcode,
        lat: 0, // Will be geocoded when selected if needed
        lng: 0,
      });
    }

    const normalized = text.trim().toLowerCase();
    results.sort((a, b) => {
      const am = (a.city || a.fulltext).toLowerCase().startsWith(normalized) ? 0 : 1;
      const bm = (b.city || b.fulltext).toLowerCase().startsWith(normalized) ? 0 : 1;
      return am - bm;
    });

    return results;
  } catch (e: any) {
    if (e.name === 'AbortError' && signal.aborted) throw e;
    console.warn('Google Places fetch error:', e);
    return null; // fallback
  } finally {
    timedSignal.cleanup();
  }
}

// --- Géoplateforme fallback ---
async function searchGeopf(
  text: string,
  signal: AbortSignal
): Promise<AddressSuggestion[]> {
  // Deux requêtes en parallèle : villes (PositionOfInterest) et adresses complètes.
  // On priorise les villes lorsque le texte matche exactement pour que "Noves"
  // propose la commune avant les voies contenant "Noves".
  const commonParams = { text, maximumResponses: '5' };
  const cityParams = new URLSearchParams({ ...commonParams, type: 'PositionOfInterest' });
  const addrParams = new URLSearchParams({ ...commonParams, type: 'StreetAddress' });

  const parse = async (params: URLSearchParams): Promise<AddressSuggestion[]> => {
    try {
      const res = await fetch(`${GEOPF_URL}?${params}`, { signal });
      if (!res.ok) return [];
      const data = await res.json();
      if (data.status !== 'OK' || !Array.isArray(data.results)) return [];
      return data.results.map((r: any) => ({
        fulltext: r.fulltext,
        street: r.street || '',
        city: r.city || (Array.isArray(r.city) ? r.city[0] : '') || r.fulltext,
        zipcode: r.zipcode || (Array.isArray(r.zipcodes) ? r.zipcodes[0] : ''),
        lat: r.y,
        lng: r.x,
      }));
    } catch {
      return [];
    }
  };

  const [cities, addresses] = await Promise.all([parse(cityParams), parse(addrParams)]);
  const normalized = text.trim().toLowerCase();
  const cityMatchFirst = cities.filter((c) =>
    (c.city || c.fulltext).toLowerCase().startsWith(normalized)
  );
  const cityRest = cities.filter((c) => !cityMatchFirst.includes(c));
  return [...cityMatchFirst, ...addresses, ...cityRest].slice(0, 6);
}

/**
 * Hook for address autocomplete.
 * Primary: Google Places Autocomplete API (requires GOOGLE_MAPS_API_KEY secret).
 * Fallback: Free French Géoplateforme API (no key required).
 */
export function useAddressAutocomplete() {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleKeyRef = useRef<string | null | undefined>(undefined);

  // Pre-fetch Google key on mount
  useEffect(() => {
    getGoogleApiKey().then((key) => {
      googleKeyRef.current = key;
    });
  }, []);

  const search = useCallback((text: string) => {
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text || text.length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const apiKey = googleKeyRef.current ?? (await getGoogleApiKey());
        googleKeyRef.current = apiKey;

        let results: AddressSuggestion[] | null = null;

        // Try Google first if key available
        if (apiKey) {
          results = await searchGoogle(text, apiKey, controller.signal);
        }

        // Fallback to Géoplateforme if Google unavailable or errored
        if (results === null || results.length === 0) {
          console.info('Falling back to Géoplateforme autocomplete');
          results = await searchGeopf(text, controller.signal);
        }

        setSuggestions(results);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('Autocomplete error:', e);
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 400);
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { suggestions, isLoading, search, clear };
}
