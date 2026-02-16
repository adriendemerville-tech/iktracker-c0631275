import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Location, TripDraft, Vehicle } from '@/types/trip';
import { MapPin, Car, CalendarIcon, RefreshCw, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { geocodeAddress, reverseGeocode } from '@/lib/geocoding';
import { calculateDrivingDistance } from '@/hooks/useGeolocation';
import wazeLogo from '@/assets/waze-logo.webp';
import googleMapsLogo from '@/assets/google-maps-logo.webp';

interface DetailsStepContentProps {
  draft: TripDraft;
  setDraft: React.Dispatch<React.SetStateAction<TripDraft>>;
  isEditing: boolean;
  selectedVehicle?: Vehicle;
  setStep: (step: 'vehicle' | 'start' | 'end' | 'details') => void;
  handleNavigateWithWaze: () => void;
  handleNavigateWithMaps: () => void;
  isNavigating: boolean;
  roundTrip: boolean;
  setRoundTrip: (value: boolean) => void;
  manualDistance: string;
  setManualDistance: (value: string) => void;
  calculatedDistance: number | null;
  setCalculatedDistance: (value: number | null) => void;
  tripDate: Date;
  setTripDate: (date: Date) => void;
  purpose: string;
  setPurpose: (value: string) => void;
  isBlinking: boolean;
  setIsBlinking: (value: boolean) => void;
  distanceInputRef: React.RefObject<HTMLInputElement>;
  purposeInputRef: React.RefObject<HTMLInputElement>;
  handleConfirm: () => void;
}

export function DetailsStepContent({
  draft,
  setDraft,
  isEditing,
  selectedVehicle,
  setStep,
  handleNavigateWithWaze,
  handleNavigateWithMaps,
  isNavigating,
  roundTrip,
  setRoundTrip,
  manualDistance,
  setManualDistance,
  calculatedDistance,
  setCalculatedDistance,
  tripDate,
  setTripDate,
  purpose,
  setPurpose,
  isBlinking,
  setIsBlinking,
  distanceInputRef,
  purposeInputRef,
  handleConfirm,
}: DetailsStepContentProps) {
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const startAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const endAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  const [startAddress, setStartAddress] = useState(draft.startLocation?.address || draft.startLocation?.name || '');
  const [endAddress, setEndAddress] = useState(draft.endLocation?.address || draft.endLocation?.name || '');

  // Sync local state with draft
  useEffect(() => {
    setStartAddress(draft.startLocation?.address || draft.startLocation?.name || '');
  }, [draft.startLocation]);
  
  useEffect(() => {
    setEndAddress(draft.endLocation?.address || draft.endLocation?.name || '');
  }, [draft.endLocation]);

  // Initialize Google Places Autocomplete for start address
  useEffect(() => {
    if (!startInputRef.current) return;
    
    const initStartAutocomplete = () => {
      if (!window.google?.maps?.places || !startInputRef.current) return;

      if (startAutocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(startAutocompleteRef.current);
      }

      startAutocompleteRef.current = new window.google.maps.places.Autocomplete(startInputRef.current, {
        componentRestrictions: { country: 'fr' },
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['geocode'],
      });

      startAutocompleteRef.current.addListener('place_changed', async () => {
        const place = startAutocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          // Use reverse geocoding to get the city name
          let cityName = place.name || 'Lieu';
          const geocodeResult = await reverseGeocode(lat, lng);
          if (geocodeResult?.city) {
            cityName = geocodeResult.city;
          }
          
          const newLocation: Location = {
            id: draft.startLocation?.id || `temp-${crypto.randomUUID()}`,
            name: cityName,
            address: place.formatted_address || '',
            lat,
            lng,
            type: draft.startLocation?.type || 'other',
          };
          
          setStartAddress(place.formatted_address || '');
          setDraft(d => ({ ...d, startLocation: newLocation }));
          
          // Recalculate distance if both locations have coordinates
          if (draft.endLocation?.lat && draft.endLocation?.lng) {
            try {
              const distance = await calculateDrivingDistance(lat, lng, draft.endLocation.lat, draft.endLocation.lng);
              setCalculatedDistance(distance);
              setManualDistance(roundTrip ? (distance * 2).toFixed(1) : distance.toFixed(1));
            } catch (e) {
              console.error('Error calculating distance:', e);
            }
          }
        }
      });
    };

    const timer = setTimeout(() => {
      if (window.google?.maps?.places) {
        initStartAutocomplete();
      }
    }, 300);
    
    return () => {
      clearTimeout(timer);
      if (startAutocompleteRef.current && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(startAutocompleteRef.current);
        } catch (e) {}
      }
    };
  }, [draft.endLocation, roundTrip, setDraft, setCalculatedDistance, setManualDistance]);

  // Initialize Google Places Autocomplete for end address
  useEffect(() => {
    if (!endInputRef.current) return;
    
    const initEndAutocomplete = () => {
      if (!window.google?.maps?.places || !endInputRef.current) return;

      if (endAutocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(endAutocompleteRef.current);
      }

      endAutocompleteRef.current = new window.google.maps.places.Autocomplete(endInputRef.current, {
        componentRestrictions: { country: 'fr' },
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['geocode'],
      });

      endAutocompleteRef.current.addListener('place_changed', async () => {
        const place = endAutocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          // Use reverse geocoding to get the city name
          let cityName = place.name || 'Lieu';
          const geocodeResult = await reverseGeocode(lat, lng);
          if (geocodeResult?.city) {
            cityName = geocodeResult.city;
          }
          
          const newLocation: Location = {
            id: draft.endLocation?.id || `temp-${crypto.randomUUID()}`,
            name: cityName,
            address: place.formatted_address || '',
            lat,
            lng,
            type: draft.endLocation?.type || 'other',
          };
          
          setEndAddress(place.formatted_address || '');
          setDraft(d => ({ ...d, endLocation: newLocation }));
          
          // Recalculate distance if both locations have coordinates
          if (draft.startLocation?.lat && draft.startLocation?.lng) {
            try {
              const distance = await calculateDrivingDistance(draft.startLocation.lat, draft.startLocation.lng, lat, lng);
              setCalculatedDistance(distance);
              setManualDistance(roundTrip ? (distance * 2).toFixed(1) : distance.toFixed(1));
            } catch (e) {
              console.error('Error calculating distance:', e);
            }
          }
        }
      });
    };

    const timer = setTimeout(() => {
      if (window.google?.maps?.places) {
        initEndAutocomplete();
      }
    }, 300);
    
    return () => {
      clearTimeout(timer);
      if (endAutocompleteRef.current && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(endAutocompleteRef.current);
        } catch (e) {}
      }
    };
  }, [draft.startLocation, roundTrip, setDraft, setCalculatedDistance, setManualDistance]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Départ et Arrivée côte à côte avec inputs */}
      <div className="grid grid-cols-2 gap-3">
        {/* Départ */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            Départ
          </div>
          <Input
            ref={startInputRef}
            placeholder="Adresse de départ..."
            value={startAddress}
            onChange={(e) => setStartAddress(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Arrivée */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            Arrivée
          </div>
          <Input
            ref={endInputRef}
            placeholder="Adresse d'arrivée..."
            value={endAddress}
            onChange={(e) => setEndAddress(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Vehicle row */}
      <button
        onClick={() => setStep('vehicle')}
        className="flex items-center gap-3 text-sm p-3 bg-muted/50 rounded-lg w-full hover:bg-muted transition-colors group"
      >
        <Car className="w-4 h-4 text-primary" />
        <span className="font-medium">{selectedVehicle?.make} {selectedVehicle?.model}</span>
        <span className="text-muted-foreground">• {selectedVehicle?.fiscalPower} CV</span>
        {selectedVehicle?.licensePlate && (
          <span className="ml-auto bg-foreground text-background px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider">
            {selectedVehicle.licensePlate}
          </span>
        )}
        <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Navigation Assistée - Waze & Maps Buttons - Only show for NEW trips */}
      {!isEditing && draft.endLocation && (draft.endLocation.address || draft.endLocation.name) && (
        <div className="flex gap-3 sm:gap-6 md:gap-12 justify-center flex-wrap">
          <button
            onClick={handleNavigateWithWaze}
            disabled={isNavigating}
            className="flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 
              bg-primary/5 hover:bg-primary/10 border border-primary/20 
              rounded-xl transition-all duration-200 
              font-urbanist font-medium text-primary text-base sm:text-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              group flex-1 min-w-[120px] max-w-[160px]"
          >
            <img src={wazeLogo} alt="Waze" className="w-6 h-6 sm:w-7 sm:h-7 rounded group-hover:scale-110 transition-transform" />
            <span>Waze</span>
          </button>
          <button
            onClick={handleNavigateWithMaps}
            disabled={isNavigating}
            className="flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 
              bg-primary/5 hover:bg-primary/10 border border-primary/20 
              rounded-xl transition-all duration-200 
              font-urbanist font-medium text-primary text-base sm:text-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              group flex-1 min-w-[120px] max-w-[160px]"
          >
            <img src={googleMapsLogo} alt="Google Maps" className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" />
            <span>Maps</span>
          </button>
        </div>
      )}

      <div className={cn(
        "flex items-center justify-between p-4 rounded-md transition-colors outline-none ring-0 w-[85%] mx-auto",
        roundTrip ? "bg-primary/5 border-2 border-primary dark:bg-white/10" : "bg-muted border-0 dark:bg-white/5"
      )}>
        <div className="flex items-center gap-3">
          <RefreshCw className={cn("w-5 h-5", roundTrip ? "text-primary" : "text-muted-foreground")} />
          <p className="font-medium">Aller-retour</p>
        </div>
        <Switch 
          checked={roundTrip} 
          onCheckedChange={(checked) => {
            const currentDistance = parseFloat(manualDistance) || 0;
            if (checked && !roundTrip) {
              // Turning ON: double the distance
              setManualDistance((currentDistance * 2).toFixed(1));
            } else if (!checked && roundTrip) {
              // Turning OFF: halve the distance
              setManualDistance((currentDistance / 2).toFixed(1));
            }
            setRoundTrip(checked);
          }}
          className="focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Date du trajet</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(tripDate, "EEEE d MMMM yyyy", { locale: fr })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={tripDate}
              onSelect={(date) => date && setTripDate(date)}
              initialFocus
              className="pointer-events-auto"
              locale={fr}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Distance *</label>
        <div className="flex items-center gap-2">
          <Input
            ref={distanceInputRef}
            type="text"
            inputMode="decimal"
            placeholder="Ex: 25.5 km"
            className={cn("flex-1", isBlinking ? 'animate-blink-orange' : '')}
            value={manualDistance ? `${manualDistance} km` : ''}
            onChange={(e) => {
              let value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
              const parts = value.split('.');
              if (parts.length > 1) {
                value = parts[0] + '.' + parts[1].slice(0, 1);
              }
              setManualDistance(value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const expectedDistance = calculatedDistance ? (roundTrip ? calculatedDistance * 2 : calculatedDistance) : null;
                const enteredDistance = parseFloat(manualDistance) || 0;
                const tolerance = 0.15;
                if (expectedDistance && enteredDistance > 0 && Math.abs(enteredDistance - expectedDistance) > expectedDistance * tolerance) {
                  setManualDistance(expectedDistance.toFixed(1));
                  setIsBlinking(true);
                  setTimeout(() => setIsBlinking(false), 650);
                } else {
                  purposeInputRef.current?.focus();
                }
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0"
            title="Mettre à jour la distance"
            onClick={async () => {
              const start = draft.startLocation;
              const end = draft.endLocation;
              if (!start || !end) return;
              try {
                const resolveCoords = async (loc: Location) => {
                  if (typeof loc.lat === 'number' && typeof loc.lng === 'number') return { lat: loc.lat, lng: loc.lng };
                  if (loc.address) return await geocodeAddress(loc.address);
                  return null;
                };
                const [sc, ec] = await Promise.all([resolveCoords(start), resolveCoords(end)]);
                if (sc && ec) {
                  const dist = await calculateDrivingDistance(sc.lat, sc.lng, ec.lat, ec.lng);
                  setCalculatedDistance(dist);
                  const finalDist = roundTrip ? (dist * 2) : dist;
                  setManualDistance(finalDist.toFixed(1));
                }
              } catch (err) {
                console.error('Error recalculating distance:', err);
              }
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        {calculatedDistance ? (
          <p className="text-xs text-accent">
            ✓ Calcul automatique (modifiable)
          </p>
        ) : typeof draft.startLocation?.lat === 'number' &&
        typeof draft.startLocation?.lng === 'number' &&
        typeof draft.endLocation?.lat === 'number' &&
        typeof draft.endLocation?.lng === 'number' ? (
          <p className="text-xs text-muted-foreground">
            Calcul de la distance en cours...
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Calcul automatique
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Motif *</label>
        <Input
          ref={purposeInputRef}
          placeholder="Ex: Réunion client, Livraison..."
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleConfirm();
            }
          }}
        />
      </div>

      <div className="flex justify-center">
        <Button
          variant="gradient"
          className="px-8 sm:px-12 py-2.5 sm:py-3 h-10 sm:h-12 text-base sm:text-lg"
          onClick={handleConfirm}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}