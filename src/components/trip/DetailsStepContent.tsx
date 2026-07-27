import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Location, TripDraft, Vehicle } from '@/types/trip';
import { MapPin, Car, CalendarIcon, RefreshCw, Pencil, Repeat } from 'lucide-react';
import { DAYS_FR } from '@/hooks/useRecurringTrips';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { geocodeAddress, reverseGeocode } from '@/lib/geocoding';
import { calculateDrivingDistance } from '@/hooks/useGeolocation';
import { AddressAutocompleteInput } from '@/components/AddressAutocompleteInput';
import { AddressSuggestion } from '@/hooks/useAddressAutocomplete';
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
  isRecurring?: boolean;
  setIsRecurring?: (v: boolean) => void;
  recurringDays?: number[];
  setRecurringDays?: (days: number[]) => void;
  showRecurring?: boolean;
  hideDatePicker?: boolean;
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
  isRecurring = false,
  setIsRecurring,
  recurringDays = [],
  setRecurringDays,
  showRecurring = false,
  hideDatePicker = false,
}: DetailsStepContentProps) {
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const toggleDay = (d: number) => {
    if (!setRecurringDays) return;
    setRecurringDays(recurringDays.includes(d) ? recurringDays.filter(x => x !== d) : [...recurringDays, d].sort());
  };
  
  const [startAddress, setStartAddress] = useState(draft.startLocation?.address || draft.startLocation?.name || '');
  const [endAddress, setEndAddress] = useState(draft.endLocation?.address || draft.endLocation?.name || '');

  // Sync local state with draft
  useEffect(() => {
    setStartAddress(draft.startLocation?.address || draft.startLocation?.name || '');
  }, [draft.startLocation]);
  
  useEffect(() => {
    setEndAddress(draft.endLocation?.address || draft.endLocation?.name || '');
  }, [draft.endLocation]);

  // Auto-recalcul de la distance à l'ouverture d'un trajet existant :
  // les coordonnées enregistrées peuvent être incorrectes (ex. import,
  // ancienne géoloc « Position »). On regéocode depuis les adresses
  // affichées et on met à jour si l'écart avec la valeur saisie est notable.
  const autoRecalcDone = useRef(false);
  useEffect(() => {
    if (autoRecalcDone.current) return;
    if (!isEditing) return;
    const start = draft.startLocation;
    const end = draft.endLocation;
    const startAddr = start?.address || start?.name;
    const endAddr = end?.address || end?.name;
    if (!startAddr || !endAddr) return;
    autoRecalcDone.current = true;

    (async () => {
      try {
        const [sc, ec] = await Promise.all([
          geocodeAddress(startAddr),
          geocodeAddress(endAddr),
        ]);
        if (!sc || !ec) return;
        const dist = await calculateDrivingDistance(sc.lat, sc.lng, ec.lat, ec.lng);
        if (!dist || dist <= 0) return;
        setCalculatedDistance(dist);
        const expected = roundTrip ? dist * 2 : dist;
        const entered = parseFloat(manualDistance) || 0;
        // Rafraîchit uniquement si écart > 15 % ou valeur absente
        if (!entered || Math.abs(entered - expected) > expected * 0.15) {
          setManualDistance(expected.toFixed(1));
          setIsBlinking(true);
          setTimeout(() => setIsBlinking(false), 650);
        }
      } catch (e) {
        console.warn('Auto-recalc distance failed:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, draft.startLocation, draft.endLocation]);

  // Handle Géoplateforme suggestion selection for start
  const handleStartSelect = async (suggestion: AddressSuggestion) => {
    const { lat, lng, city, fulltext } = suggestion;
    const newLocation: Location = {
      id: draft.startLocation?.id || `temp-${crypto.randomUUID()}`,
      name: city || 'Lieu',
      address: fulltext,
      lat,
      lng,
      type: draft.startLocation?.type || 'other',
    };
    setStartAddress(fulltext);
    setDraft(d => ({ ...d, startLocation: newLocation }));

    if (draft.endLocation?.lat && draft.endLocation?.lng) {
      try {
        const distance = await calculateDrivingDistance(lat, lng, draft.endLocation.lat, draft.endLocation.lng);
        setCalculatedDistance(distance);
        setManualDistance(roundTrip ? (distance * 2).toFixed(1) : distance.toFixed(1));
      } catch (e) {
        console.error('Error calculating distance:', e);
      }
    }
  };

  // Handle Géoplateforme suggestion selection for end
  const handleEndSelect = async (suggestion: AddressSuggestion) => {
    const { lat, lng, city, fulltext } = suggestion;
    const newLocation: Location = {
      id: draft.endLocation?.id || `temp-${crypto.randomUUID()}`,
      name: city || 'Lieu',
      address: fulltext,
      lat,
      lng,
      type: draft.endLocation?.type || 'other',
    };
    setEndAddress(fulltext);
    setDraft(d => ({ ...d, endLocation: newLocation }));

    if (draft.startLocation?.lat && draft.startLocation?.lng) {
      try {
        const distance = await calculateDrivingDistance(draft.startLocation.lat, draft.startLocation.lng, lat, lng);
        setCalculatedDistance(distance);
        setManualDistance(roundTrip ? (distance * 2).toFixed(1) : distance.toFixed(1));
      } catch (e) {
        console.error('Error calculating distance:', e);
      }
    }
  };

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
          <AddressAutocompleteInput
            ref={startInputRef}
            placeholder="Adresse de départ..."
            value={startAddress}
            onChange={setStartAddress}
            onSelect={handleStartSelect}
            className="text-sm"
          />
        </div>

        {/* Arrivée */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            Arrivée
          </div>
          <AddressAutocompleteInput
            ref={endInputRef}
            placeholder="Adresse d'arrivée..."
            value={endAddress}
            onChange={setEndAddress}
            onSelect={handleEndSelect}
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

      {/* Ligne compacte : Aller-retour / Date / Distance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
        {/* Aller-retour */}
        <div className={cn(
          "flex items-center justify-between px-3 h-12 rounded-md transition-colors outline-none ring-0",
          roundTrip ? "bg-primary/5 border-2 border-primary dark:bg-white/10" : "bg-muted border-0 dark:bg-white/5"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw className={cn("w-4 h-4 shrink-0", roundTrip ? "text-primary" : "text-muted-foreground")} />
            <p className="font-medium text-sm truncate">Aller-retour</p>
          </div>
          <Switch
            checked={roundTrip}
            onCheckedChange={(checked) => {
              const currentDistance = parseFloat(manualDistance) || 0;
              if (checked && !roundTrip) {
                setManualDistance((currentDistance * 2).toFixed(1));
              } else if (!checked && roundTrip) {
                setManualDistance((currentDistance / 2).toFixed(1));
              }
              setRoundTrip(checked);
            }}
            className="focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Date */}
        {!hideDatePicker ? (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 justify-start text-left font-normal px-3"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{format(tripDate, "d MMM yyyy", { locale: fr })}</span>
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
        ) : (
          <div />
        )}

        {/* Distance */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Distance *</label>
          <div className="flex items-center gap-2">
            <Input
              ref={distanceInputRef}
              type="text"
              inputMode="decimal"
              placeholder="Ex: 25.5 km"
              className={cn("flex-1 h-12", isBlinking ? 'animate-blink-orange' : '')}
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
        </div>
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

      {showRecurring && setIsRecurring && (
        <div className="space-y-3">
          <div className={cn(
            "flex items-center justify-between p-4 rounded-md transition-colors w-[85%] mx-auto",
            isRecurring ? "bg-primary/5 border-2 border-primary dark:bg-white/10" : "bg-muted border-0 dark:bg-white/5"
          )}>
            <div className="flex items-center gap-3">
              <Repeat className={cn("w-5 h-5", isRecurring ? "text-primary" : "text-muted-foreground")} />
              <p className="font-medium">Récurrent</p>
            </div>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
          {isRecurring && (
            <div className="space-y-2 w-[85%] mx-auto">
              <p className="text-xs text-muted-foreground">Jours de la semaine</p>
              <div className="grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 0].map(d => {
                  const active = recurringDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={cn(
                        "py-2 rounded-md text-xs font-medium transition-colors",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                      )}
                    >
                      {DAYS_FR[d]}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Le trajet sera créé automatiquement chaque jour coché.
              </p>
            </div>
          )}
        </div>
      )}


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