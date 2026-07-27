import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { Trip, Location } from '@/types/trip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { reverseGeocode } from '@/lib/geocoding';
import { useGeolocation } from '@/hooks/useGeolocation';
import { AddressAutocompleteInput } from '@/components/AddressAutocompleteInput';
import { AddressSuggestion } from '@/hooks/useAddressAutocomplete';

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
  
  const { getCurrentPosition, loading: geoLoading } = useGeolocation();
  // Pre-fill with original trip locations; fallback to home/office only for generic start addresses
  const isGenericAddress = (addr?: string) => {
    if (!addr) return true;
    const normalized = addr.toLowerCase().trim();
    return normalized === 'maison' || normalized === 'domicile';
  };

  useEffect(() => {
    if (open) {
      // Start: preserve the trip's original departure address
      if (trip.startLocation?.address && !isGenericAddress(trip.startLocation.address)) {
        setStartAddress(trip.startLocation.address);
        if (trip.startLocation.lat && trip.startLocation.lng) {
          setStartCoords({ lat: trip.startLocation.lat, lng: trip.startLocation.lng });
        } else {
          setStartCoords(null);
        }
      } else {
        const homeLocation = savedLocations.find(l => l.type === 'home');
        const officeLocation = savedLocations.find(l => l.type === 'office');
        const defaultLocation = homeLocation || officeLocation;

        if (defaultLocation) {
          setStartAddress(defaultLocation.address || defaultLocation.name);
          if (defaultLocation.lat && defaultLocation.lng) {
            setStartCoords({ lat: defaultLocation.lat, lng: defaultLocation.lng });
          } else {
            setStartCoords(null);
          }
        } else {
          setStartAddress('');
          setStartCoords(null);
        }
      }

      // End: preserve the trip's original arrival address if meaningful
      // Fallback to .name because sync-calendar stores the event summary in end_location
      // which is mapped to endLocation.name (not .address) by useTrips.
      const endValue = trip.endLocation?.address || trip.endLocation?.name || '';
      if (endValue && !isGenericAddress(endValue)) {
        setEndAddress(endValue);
        if (trip.endLocation?.lat && trip.endLocation?.lng) {
          setEndCoords({ lat: trip.endLocation.lat, lng: trip.endLocation.lng });
        } else {
          setEndCoords(null);
        }
      } else {
        setEndAddress('');
        setEndCoords(null);
      }
    }
  }, [open, savedLocations, trip]);

  const handleAddressSelect = (suggestion: AddressSuggestion, field: 'start' | 'end') => {
    const coords = suggestion.lat && suggestion.lng ? { lat: suggestion.lat, lng: suggestion.lng } : null;
    if (field === 'start') {
      setStartAddress(suggestion.fulltext);
      setStartCoords(coords);
    } else {
      setEndAddress(suggestion.fulltext);
      setEndCoords(coords);
    }
  };

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left pb-2">
          <DialogTitle className="text-base">Compléter le trajet</DialogTitle>
          {trip.purpose && (
            <DialogDescription className="text-xs">
              RDV: <span className="font-medium text-foreground">{trip.purpose}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Départ */}
          <div className="space-y-1.5">
            <Label htmlFor="start-address" className="text-xs font-medium text-muted-foreground">Départ</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <AddressAutocompleteInput
                placeholder="Adresse de départ..."
                value={startAddress}
                onChange={setStartAddress}
                onSelect={(suggestion) => handleAddressSelect(suggestion, 'start')}
                className="pl-10 h-10"
              />
              {startCoords && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary">✓</span>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleUseCurrentLocation('start')}
                disabled={geoLoading}
                className="h-7 text-xs px-2"
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
                  className="h-7 text-xs px-2"
                >
                  <MapPin className={`w-3 h-3 mr-1 ${getLocationIcon(loc.type)}`} />
                  {loc.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Arrivée */}
          <div className="space-y-1.5">
            <Label htmlFor="end-address" className="text-xs font-medium text-muted-foreground">Arrivée</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <AddressAutocompleteInput
                placeholder="Adresse d'arrivée..."
                value={endAddress}
                onChange={setEndAddress}
                onSelect={(suggestion) => handleAddressSelect(suggestion, 'end')}
                className="pl-10 h-10"
              />
              {endCoords && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary">✓</span>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleUseCurrentLocation('end')}
                disabled={geoLoading}
                className="h-7 text-xs px-2"
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
                  className="h-7 text-xs px-2"
                >
                  <MapPin className={`w-3 h-3 mr-1 ${getLocationIcon(loc.type)}`} />
                  {loc.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Lieux enregistrés supplémentaires */}
          {savedLocations.length > 3 && (
            <div className="flex gap-1.5 flex-wrap">
              {savedLocations.slice(3).map((loc) => (
                <Button
                  key={loc.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectSavedLocation(loc, 'end')}
                  className="h-7 text-xs px-2"
                >
                  <MapPin className={`w-3 h-3 mr-1 ${getLocationIcon(loc.type)}`} />
                  {loc.name}
                </Button>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
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
      </DialogContent>
    </Dialog>
  );
}
