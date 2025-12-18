// Reverse geocoding utility using Google Maps Geocoding API

export interface GeocodingResult {
  city: string;
  postalCode?: string;
  fullAddress?: string;
}

// Extract city name from geocoding result
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  return new Promise((resolve) => {
    if (typeof google === 'undefined' || !google.maps) {
      console.warn('Google Maps not loaded');
      resolve(null);
      return;
    }

    const geocoder = new google.maps.Geocoder();
    const latlng = { lat, lng };

    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === 'OK' && results && results.length > 0) {
        let city = '';
        let postalCode = '';
        let fullAddress = results[0].formatted_address;

        // Find the city (locality) and postal code from address components
        for (const result of results) {
          for (const component of result.address_components) {
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('postal_code')) {
              postalCode = component.long_name;
            }
            // If no locality, try sublocality or administrative_area_level_2
            if (!city && component.types.includes('sublocality')) {
              city = component.long_name;
            }
            if (!city && component.types.includes('administrative_area_level_2')) {
              city = component.long_name;
            }
          }
          // Stop if we found a city
          if (city) break;
        }

        resolve({
          city: city || 'Lieu inconnu',
          postalCode,
          fullAddress,
        });
      } else {
        console.warn('Geocoding failed:', status);
        resolve(null);
      }
    });
  });
}

// Geocode an address to coordinates (lat/lng)
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!address?.trim()) {
      resolve(null);
      return;
    }

    if (typeof google === 'undefined' || !google.maps) {
      console.warn('Google Maps not loaded');
      resolve(null);
      return;
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        console.warn('Geocoding failed:', status);
        resolve(null);
      }
    });
  });
}

// Extract city from an address string (fallback without API call)
export function extractCityFromAddress(address: string): string {
  if (!address) return '';
  
  // Common country names to filter out
  const countries = ['France', 'Belgium', 'Belgique', 'Switzerland', 'Suisse', 'Luxembourg', 'Germany', 'Allemagne', 'Spain', 'Espagne', 'Italy', 'Italie', 'Netherlands', 'Pays-Bas'];
  
  // French address format: "street, postal_code city, country"
  // Try to match postal code (5 digits) followed by city name
  const postalCityMatch = address.match(/\b(\d{5})\s+([^,]+)/);
  if (postalCityMatch && postalCityMatch[2]) {
    const city = postalCityMatch[2].trim();
    // Make sure it's not a country
    if (!countries.some(c => c.toLowerCase() === city.toLowerCase())) {
      return city;
    }
  }
  
  // Split by comma and look for the city part
  const parts = address.split(',').map(p => p.trim());
  
  // Filter out country names and find city with postal code
  for (const part of parts) {
    // Check if this part contains a postal code (5 digits)
    const cityWithPostal = part.match(/^\d{5}\s+(.+)$/);
    if (cityWithPostal && cityWithPostal[1]) {
      const city = cityWithPostal[1].trim();
      if (!countries.some(c => c.toLowerCase() === city.toLowerCase())) {
        return city;
      }
    }
  }
  
  // Try to find any part that's not a country and not a street
  for (let i = parts.length - 2; i >= 0; i--) {
    const part = parts[i].trim();
    // Skip if it's a country
    if (countries.some(c => c.toLowerCase() === part.toLowerCase())) continue;
    // Skip if it's just a postal code
    if (/^\d{5}$/.test(part)) continue;
    // Skip if it looks like a street (contains numbers at the start)
    if (/^\d+\s/.test(part)) continue;
    // Remove postal code if present
    const cityWithoutPostal = part.replace(/^\d{5}\s*/, '').trim();
    if (cityWithoutPostal) {
      return cityWithoutPostal;
    }
  }
  
  return address;
}

// Remove country from address string for display purposes
export function removeCountryFromAddress(address: string): string {
  if (!address) return '';
  
  // Common country names to remove (case insensitive)
  const countries = [
    'France', 'Belgium', 'Belgique', 'Switzerland', 'Suisse', 'Luxembourg',
    'Germany', 'Allemagne', 'Spain', 'Espagne', 'Italy', 'Italie', 
    'Netherlands', 'Pays-Bas', 'United Kingdom', 'Royaume-Uni', 'UK',
    'Portugal', 'Austria', 'Autriche', 'Monaco'
  ];
  
  // Split by comma and filter out country names
  const parts = address.split(',').map(p => p.trim());
  const filteredParts = parts.filter(part => {
    const normalizedPart = part.toLowerCase().trim();
    return !countries.some(c => c.toLowerCase() === normalizedPart);
  });
  
  return filteredParts.join(', ').trim();
}
