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

// Extract city from an address string (fallback without API call)
export function extractCityFromAddress(address: string): string {
  if (!address) return '';
  
  // French address format: "street, postal_code city, country"
  // Try to match postal code (5 digits) followed by city name
  const postalCityMatch = address.match(/\b(\d{5})\s+([^,]+)/);
  if (postalCityMatch && postalCityMatch[2]) {
    return postalCityMatch[2].trim();
  }
  
  // If no postal code found, try to get the second part after comma
  const parts = address.split(',');
  if (parts.length >= 2) {
    const cityPart = parts[1].trim();
    // Remove postal code if present at the start
    const cityWithoutPostal = cityPart.replace(/^\d{5}\s*/, '');
    if (cityWithoutPostal) {
      return cityWithoutPostal;
    }
  }
  
  return address;
}
