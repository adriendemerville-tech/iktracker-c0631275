import { useState, useEffect } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDjuGRMRKrDb5OYhO0_Efcm8I7QpUe70IY';
const SCRIPT_ID = 'google-maps-script';

let isLoading = false;
let isLoaded = false;
const callbacks: (() => void)[] = [];

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(isLoaded);

  useEffect(() => {
    // Already loaded
    if (isLoaded) {
      setLoaded(true);
      return;
    }

    // Already loading - add callback
    if (isLoading) {
      callbacks.push(() => setLoaded(true));
      return;
    }

    // Check if script already exists (from index.html)
    const existingScript = document.getElementById(SCRIPT_ID) || 
      document.querySelector('script[src*="maps.googleapis.com"]');
    
    if (existingScript) {
      // Script exists, check if Google Maps is ready
      if (window.google?.maps) {
        isLoaded = true;
        setLoaded(true);
        return;
      }
      // Wait for it to load
      isLoading = true;
      existingScript.addEventListener('load', () => {
        isLoaded = true;
        isLoading = false;
        setLoaded(true);
        callbacks.forEach(cb => cb());
        callbacks.length = 0;
      });
      return;
    }

    // Load script dynamically
    isLoading = true;
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=fr`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      setLoaded(true);
      callbacks.forEach(cb => cb());
      callbacks.length = 0;
    };

    script.onerror = () => {
      isLoading = false;
      console.error('Failed to load Google Maps');
    };

    document.head.appendChild(script);

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
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=fr`;
  script.async = true;
  script.defer = true;
  
  script.onload = () => {
    isLoaded = true;
    isLoading = false;
    callbacks.forEach(cb => cb());
    callbacks.length = 0;
  };

  document.head.appendChild(script);
}
