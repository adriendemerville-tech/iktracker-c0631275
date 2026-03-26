import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SCRIPT_ID = 'google-maps-script';

let isLoading = false;
let isLoaded = false;
let cachedKey: string | null = null;
const callbacks: (() => void)[] = [];

async function fetchApiKey(): Promise<string | null> {
  if (cachedKey) return cachedKey;

  try {
    const { data, error } = await supabase.functions.invoke('google-maps-key');
    if (error || !data?.key) {
      console.error('Failed to fetch Google Maps key:', error);
      return null;
    }
    cachedKey = data.key;
    return cachedKey;
  } catch (e) {
    console.error('Failed to fetch Google Maps key:', e);
    return null;
  }
}

function loadScript(apiKey: string) {
  const existingScript = document.getElementById(SCRIPT_ID) || 
    document.querySelector('script[src*="maps.googleapis.com"]');

  if (existingScript) {
    if (window.google?.maps) {
      isLoaded = true;
      isLoading = false;
      callbacks.forEach(cb => cb());
      callbacks.length = 0;
      return;
    }
    existingScript.addEventListener('load', () => {
      isLoaded = true;
      isLoading = false;
      callbacks.forEach(cb => cb());
      callbacks.length = 0;
    });
    return;
  }

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=fr`;
  script.async = true;
  script.defer = true;

  script.onload = () => {
    isLoaded = true;
    isLoading = false;
    callbacks.forEach(cb => cb());
    callbacks.length = 0;
  };

  script.onerror = () => {
    isLoading = false;
    console.error('Failed to load Google Maps');
  };

  document.head.appendChild(script);
}

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(isLoaded);

  useEffect(() => {
    if (isLoaded) {
      setLoaded(true);
      return;
    }

    if (isLoading) {
      callbacks.push(() => setLoaded(true));
      return;
    }

    isLoading = true;

    // Check if script already exists
    const existingScript = document.getElementById(SCRIPT_ID) || 
      document.querySelector('script[src*="maps.googleapis.com"]');

    if (existingScript && window.google?.maps) {
      isLoaded = true;
      isLoading = false;
      setLoaded(true);
      return;
    }

    callbacks.push(() => setLoaded(true));

    fetchApiKey().then((key) => {
      if (!key) {
        isLoading = false;
        console.error('No Google Maps API key available');
        return;
      }
      loadScript(key);
    });

    return () => {
      const idx = callbacks.indexOf(() => setLoaded(true));
      if (idx > -1) callbacks.splice(idx, 1);
    };
  }, []);

  return { loaded };
}

// Preload Google Maps (call this when user enters app routes)
export function preloadGoogleMaps() {
  if (isLoaded || isLoading) return;

  const existingScript = document.getElementById(SCRIPT_ID) || 
    document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript) return;

  isLoading = true;

  fetchApiKey().then((key) => {
    if (!key) {
      isLoading = false;
      return;
    }
    loadScript(key);
  });
}
