/// <reference types="vite/client" />

// Google Maps types - loaded dynamically via script tag
declare namespace google {
  namespace maps {
    class Geocoder {
      geocode(request: GeocoderRequest, callback?: (results: GeocoderResult[] | null, status: GeocoderStatus) => void): Promise<GeocoderResponse>;
    }
    class DistanceMatrixService {
      getDistanceMatrix(request: DistanceMatrixRequest, callback?: (response: DistanceMatrixResponse | null, status: DistanceMatrixStatus) => void): Promise<DistanceMatrixResponse>;
    }
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }
    class Map {
      constructor(mapDiv: Element, opts?: MapOptions);
      setCenter(latlng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
    }
    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(latlng: LatLng | LatLngLiteral): void;
    }

    namespace places {
      class Autocomplete {
        constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions);
        addListener(eventName: string, handler: () => void): void;
        getPlace(): PlaceResult;
        setBounds(bounds: any): void;
      }
      interface AutocompleteOptions {
        types?: string[];
        componentRestrictions?: { country: string | string[] };
        fields?: string[];
        bounds?: any;
      }
      interface PlaceResult {
        formatted_address?: string;
        geometry?: { location?: LatLng };
        name?: string;
        address_components?: any[];
      }
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      [key: string]: any;
    }
    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      draggable?: boolean;
      [key: string]: any;
    }
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    interface GeocoderRequest {
      address?: string;
      location?: LatLng | LatLngLiteral;
      [key: string]: any;
    }
    interface GeocoderResult {
      formatted_address: string;
      geometry: { location: LatLng };
      address_components: any[];
      [key: string]: any;
    }
    interface GeocoderResponse {
      results: GeocoderResult[];
    }
    enum GeocoderStatus {
      OK = 'OK',
      ZERO_RESULTS = 'ZERO_RESULTS',
      ERROR = 'ERROR',
    }
    interface DistanceMatrixRequest {
      origins: (string | LatLng | LatLngLiteral)[];
      destinations: (string | LatLng | LatLngLiteral)[];
      travelMode: TravelMode;
      unitSystem?: UnitSystem;
      [key: string]: any;
    }
    interface DistanceMatrixResponse {
      rows: DistanceMatrixResponseRow[];
    }
    interface DistanceMatrixResponseRow {
      elements: DistanceMatrixResponseElement[];
    }
    interface DistanceMatrixResponseElement {
      status: string;
      distance?: { value: number; text: string };
      duration?: { value: number; text: string };
    }
    enum DistanceMatrixStatus {
      OK = 'OK',
    }
    enum TravelMode {
      DRIVING = 'DRIVING',
    }
    enum UnitSystem {
      METRIC = 0,
    }
    namespace event {
      function clearInstanceListeners(instance: any): void;
    }
  }
}

interface Window {
  google?: typeof google;
}
