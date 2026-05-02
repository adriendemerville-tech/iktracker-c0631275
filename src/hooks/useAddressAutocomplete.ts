import { useState, useRef, useCallback } from 'react';

export interface AddressSuggestion {
  fulltext: string;
  street: string;
  city: string;
  zipcode: string;
  lat: number;
  lng: number;
}

const GEOPF_URL = 'https://data.geopf.fr/geocodage/completion/';

/**
 * Hook for address autocomplete using the free French Géoplateforme API.
 * No API key required. Rate limit: 10 req/s.
 */
export function useAddressAutocomplete() {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((text: string) => {
    // Cancel previous request
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
        const params = new URLSearchParams({
          text,
          type: 'StreetAddress',
          maximumResponses: '5',
        });

        const res = await fetch(`${GEOPF_URL}?${params}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (data.status === 'OK' && Array.isArray(data.results)) {
          setSuggestions(
            data.results.map((r: any) => ({
              fulltext: r.fulltext,
              street: r.street || '',
              city: r.city || '',
              zipcode: r.zipcode || '',
              lat: r.y,
              lng: r.x,
            }))
          );
        } else {
          setSuggestions([]);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('Géoplateforme autocomplete error:', e);
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250); // 250ms debounce
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { suggestions, isLoading, search, clear };
}
