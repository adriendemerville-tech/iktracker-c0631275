import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { Trip, Location } from '@/types/trip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { reverseGeocode } from '@/lib/geocoding';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

interface CompleteAddressSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  savedLocations: Location[];
  onCompleted: () => void;
}

export function CompleteAddressSheet({ 
  open, 
  onOpenChange, 
  trip, 
  savedLocations,
  onCompleted 
}: CompleteAddressSheetProps) {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [endCoords, setEndCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const startAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const endAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  const { getCurrentPosition, loading: geoLoading } = useGeolocation();
  const { loaded: googleMapsLoaded } = useGoogleMaps();
  // Pre-fill with home/office location
  useEffect(() => {
    if (open) {
      // Find home or office location
      const homeLocation = savedLocations.find(l => l.type === 'home');
      const officeLocation = savedLocations.find(l => l.type === 'office');
      const defaultLocation = homeLocation || officeLocation;
      
      if (defaultLocation) {
        setStartAddress(defaultLocation.address || defaultLocation.name);
        if (defaultLocation.lat && defaultLocation.lng) {
          setStartCoords({ lat: defaultLocation.lat, lng: defaultLocation.lng });
        }
      }
      
      // Reset end address
      setEndAddress('');
      setEndCoords(null);
    }
  }, [open, savedLocations]);

  // Initialize Google Places Autocomplete for start address
  useEffect(() => {
    if (!open || !googleMapsLoaded || !startInputRef.current) return;
    
    if (!window.google?.maps?.places) return;

    if (startAutocompleteRef.current) {
      window.google.maps.event.clearInstanceListeners(startAutocompleteRef.current);
    }

    startAutocompleteRef.current = new window.google.maps.places.Autocomplete(startInputRef.current, {
      componentRestrictions: { country: 'fr' },
      fields: ['formatted_address', 'geometry', 'name'],
      types: ['geocode'],
    });

    startAutocompleteRef.current.addListener('place_changed', () => {
      const place = startAutocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        setStartAddress(place.formatted_address || place.name || '');
        setStartCoords({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    });

    return () => {
      if (startAutocompleteRef.current && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(startAutocompleteRef.current);
        } catch (e) {}
      }
    };
  }, [open, googleMapsLoaded]);

  // Initialize Google Places Autocomplete for end address
  useEffect(() => {
    if (!open || !googleMapsLoaded || !endInputRef.current) return;
    
    if (!window.google?.maps?.places) return;

    if (endAutocompleteRef.current) {
      window.google.maps.event.clearInstanceListeners(endAutocompleteRef.current);
    }

    endAutocompleteRef.current = new window.google.maps.places.Autocomplete(endInputRef.current, {
      componentRestrictions: { country: 'fr' },
      fields: ['formatted_address', 'geometry', 'name'],
      types: ['geocode'],
    });

    endAutocompleteRef.current.addListener('place_changed', () => {
      const place = endAutocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        setEndAddress(place.formatted_address || place.name || '');
        setEndCoords({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    });

    return () => {
      if (endAutocompleteRef.current && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(endAutocompleteRef.current);
        } catch (e) {}
      }
    };
  }, [open, googleMapsLoaded]);

  const handleUseCurrentLocation = async (field: 'start' | 'end') => {
    try {
      const coords = await getCurrentPosition();
      const geocodeResult = await reverseGeocode(coords.lat, coords.lng);
      const address = geocodeResult?.fullAddress || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      
      if (field === 'start') {
        setStartAddress(address);
        setStartCoords(coords);
      } else {
        setEndAddress(address);
        setEndCoords(coords);
      }
    } catch (error) {
      console.error('Geolocation error:', error);
      toast.error('Impossible d\'obtenir votre position');
    }
  };

  const handleSelectSavedLocation = (location: Location, field: 'start' | 'end') => {
    const address = location.address || location.name;
    const coords = location.lat && location.lng ? { lat: location.lat, lng: location.lng } : null;
    
    if (field === 'start') {
      setStartAddress(address);
      setStartCoords(coords);
    } else {
      setEndAddress(address);
      setEndCoords(coords);
    }
  };

  const handleComplete = async () => {
    if (!startAddress.trim() || !endAddress.trim()) {
      toast.error('Veuillez renseigner les deux adresses');
      return;
    }

    setLoading(true);

    try {
      // Call edge function to recalculate distance with both addresses
      const { data, error } = await supabase.functions.invoke('recalculate-distances', {
        body: { 
          tripId: trip.id,
          newStartLocation: startAddress,
          newEndLocation: endAddress,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success(`Trajet complété : ${data.distance} km`);
        onCompleted();
        onOpenChange(false);
      } else {
        throw new Error(data?.error || 'Erreur lors du calcul');
      }
    } catch (error) {
      console.error('Error completing trip:', error);
      toast.error('Erreur lors de la mise à jour du trajet');
    } finally {
      setLoading(false);
    }
  };

  const getLocationIcon = (type: string) => {
    const colors: Record<string, string> = {
      home: 'text-primary',
      office: 'text-accent',
      client: 'text-warning',
      supplier: 'text-destructive',
      other: 'text-muted-foreground',
    };
    return colors[type] || colors.other;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader className="text-left">
          <SheetTitle>Compléter le trajet</SheetTitle>
          <SheetDescription>
            RDV: <span className="font-medium text-foreground">{trip.purpose}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Départ */}
          <div className="space-y-2">
            <Label htmlFor="start-address">Départ</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="start-address"
                ref={startInputRef}
                placeholder="Adresse de départ..."
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                className="pl-10"
              />
              {startCoords && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary">✓</span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleUseCurrentLocation('start')}
                disabled={geoLoading}
              >
                <Navigation className="w-3 h-3 mr-1" />
                Position
              </Button>
              {savedLocations.slice(0, 3).map((loc) => (
                <Button
                  key={loc.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectSavedLocation(loc, 'start')}
                  className="text-xs"
                >
                  <MapPin className={`w-3 h-3 mr-1 ${getLocationIcon(loc.type)}`} />
                  {loc.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Arrivée */}
          <div className="space-y-2">
            <Label htmlFor="end-address">Arrivée</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input
                id="end-address"
                ref={endInputRef}
                placeholder="Adresse d'arrivée..."
                value={endAddress}
                onChange={(e) => setEndAddress(e.target.value)}
                className="pl-10"
              />
              {endCoords && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary">✓</span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleUseCurrentLocation('end')}
                disabled={geoLoading}
              >
                <Navigation className="w-3 h-3 mr-1" />
                Position
              </Button>
              {savedLocations.slice(0, 3).map((loc) => (
                <Button
                  key={loc.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectSavedLocation(loc, 'end')}
                  className="text-xs"
                >
                  <MapPin className={`w-3 h-3 mr-1 ${getLocationIcon(loc.type)}`} />
                  {loc.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Lieux enregistrés */}
          {savedLocations.length > 3 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Autres lieux enregistrés</p>
              <div className="flex gap-2 flex-wrap">
                {savedLocations.slice(3).map((loc) => (
                  <Button
                    key={loc.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectSavedLocation(loc, 'end')}
                    className="text-xs"
                  >
                    <MapPin className={`w-3 h-3 mr-1 ${getLocationIcon(loc.type)}`} />
                    {loc.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={handleComplete}
              disabled={!startAddress.trim() || !endAddress.trim() || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Calcul...
                </>
              ) : (
                'Valider'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
