import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { LocationPicker } from './LocationPicker';
import { VehicleCard } from './VehicleCard';
import { Location, TripDraft, Vehicle } from '@/types/trip';
import { calculateDrivingDistance } from '@/hooks/useGeolocation';
import { geocodeAddress } from '@/lib/geocoding';
import { toast } from '@/components/ui/sonner';
import { MapPin, ArrowRight, Clock, FileText, Check, Car, Plus, CalendarIcon, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NewTripSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedLocations: Location[];
  vehicles: Vehicle[];
  editTrip?: {
    id: string;
    vehicleId: string;
    startLocation: Location;
    endLocation: Location;
    distance: number;
    baseDistance: number;
    roundTrip: boolean;
    purpose: string;
    startTime: Date;
    endTime: Date;
    ikAmount: number;
  } | null;
  onAddLocation: (location: Omit<Location, 'id'>) => Promise<Location | null> | Location | null;
  onDeleteLocation?: (id: string) => void;
  onUpdateLocation?: (id: string, updates: Partial<Location>) => void;
  onAddVehicle: () => void;
  onCreateTrip: (trip: {
    vehicleId: string;
    startLocation: Location;
    endLocation: Location;
    distance: number;
    baseDistance: number;
    roundTrip: boolean;
    purpose: string;
    startTime: Date;
    endTime: Date;
  }) => void;
  onUpdateTrip?: (id: string, trip: {
    vehicleId: string;
    startLocation: Location;
    endLocation: Location;
    distance: number;
    baseDistance: number;
    roundTrip: boolean;
    purpose: string;
    startTime: Date;
    endTime: Date;
  }) => void;
  getTotalAnnualKm: (vehicleId: string) => number;
}

type Step = 'vehicle' | 'start' | 'end' | 'details';

// Store last selected vehicle ID
let lastSelectedVehicleId: string | null = null;

export function NewTripSheet({
  open,
  onOpenChange,
  savedLocations,
  vehicles,
  editTrip,
  onAddLocation,
  onDeleteLocation,
  onUpdateLocation,
  onAddVehicle,
  onCreateTrip,
  onUpdateTrip,
  getTotalAnnualKm,
}: NewTripSheetProps) {
  const [step, setStep] = useState<Step>('vehicle');
  const [draft, setDraft] = useState<TripDraft>({});
  const [purpose, setPurpose] = useState('');
  const [manualDistance, setManualDistance] = useState('');
  const [tripDate, setTripDate] = useState<Date>(new Date());
  const [roundTrip, setRoundTrip] = useState(false);

  const isEditing = !!editTrip;

  // Initialize form with edit data
  useEffect(() => {
    if (open && editTrip) {
      setDraft({
        vehicleId: editTrip.vehicleId,
        startLocation: editTrip.startLocation,
        endLocation: editTrip.endLocation,
        startTime: new Date(editTrip.startTime),
        endTime: new Date(editTrip.endTime),
      });
      setPurpose(editTrip.purpose || '');
      setManualDistance(editTrip.baseDistance.toString());
      setRoundTrip(editTrip.roundTrip);
      setTripDate(new Date(editTrip.startTime));
      setStep('details');
    }
  }, [open, editTrip]);

  // Auto-select vehicle when opening (only for new trips)
  useEffect(() => {
    if (open && !editTrip && vehicles.length > 0 && !draft.vehicleId) {
      let vehicleToSelect: string | null = null;
      
      if (vehicles.length === 1) {
        vehicleToSelect = vehicles[0].id;
      } else if (lastSelectedVehicleId && vehicles.find(v => v.id === lastSelectedVehicleId)) {
        vehicleToSelect = lastSelectedVehicleId;
      }
      
      if (vehicleToSelect) {
        setDraft(d => ({ ...d, vehicleId: vehicleToSelect }));
        setStep('start');
      }
    }
  }, [open, editTrip, vehicles, draft.vehicleId]);

  const resetForm = () => {
    setStep('vehicle');
    setDraft({});
    setPurpose('');
    setManualDistance('');
    setTripDate(new Date());
    setRoundTrip(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  };

  const preventCloseOnGoogleAutocomplete = (event: any) => {
    const target = event?.target as HTMLElement | null;
    if (target?.closest?.('.pac-container')) {
      event.preventDefault();
    }
  };

  const handleSelectVehicle = (vehicleId: string) => {
    lastSelectedVehicleId = vehicleId;
    setDraft({ ...draft, vehicleId });
    setStep('start');
  };

  const handleSelectStart = (location: Location) => {
    setDraft({
      ...draft,
      startLocation: location,
      startTime: new Date(),
    });
    setStep('end');
  };

  const handleSelectEnd = async (location: Location) => {
    const newDraft = {
      ...draft,
      endLocation: location,
      endTime: new Date(),
    };
    setDraft(newDraft);

    const resolveCoords = async (loc: Location): Promise<{ lat: number; lng: number } | null> => {
      if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        return { lat: loc.lat, lng: loc.lng };
      }
      if (loc.address) {
        return await geocodeAddress(loc.address);
      }
      return null;
    };

    // Auto-calculate distance (route) if possible
    try {
      const start = draft.startLocation;

      if (start) {
        const sameAddress = !!start.address && !!location.address && start.address === location.address;
        const sameCoords =
          typeof start.lat === 'number' &&
          typeof start.lng === 'number' &&
          typeof location.lat === 'number' &&
          typeof location.lng === 'number' &&
          start.lat === location.lat &&
          start.lng === location.lng;

        if (sameAddress || sameCoords) {
          toast.message("Départ et arrivée identiques", {
            description: "Choisis une adresse d'arrivée différente pour calculer la distance.",
          });
          setManualDistance('0');
        } else {
          const [startCoords, endCoords] = await Promise.all([
            resolveCoords(start),
            resolveCoords(location),
          ]);

          if (startCoords && endCoords) {
            const distance = await calculateDrivingDistance(
              startCoords.lat,
              startCoords.lng,
              endCoords.lat,
              endCoords.lng
            );
            setManualDistance(distance.toFixed(1));
          }
        }
      }
    } catch (error) {
      console.error('Error calculating distance:', error);
    }

    setStep('details');
  };

  const handleConfirm = () => {
    if (!draft.vehicleId || !draft.startLocation || !draft.endLocation) return;

    const baseDistance = parseFloat(manualDistance) || 0;
    const distance = roundTrip ? baseDistance * 2 : baseDistance;
    
    // Preserve the time from draft but use the selected date
    const startTime = draft.startTime || new Date();
    const endTime = draft.endTime || new Date();
    
    // Combine tripDate with the original times
    const finalStartTime = new Date(tripDate);
    finalStartTime.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());
    
    const finalEndTime = new Date(tripDate);
    finalEndTime.setHours(endTime.getHours(), endTime.getMinutes(), endTime.getSeconds());
    
    const tripData = {
      vehicleId: draft.vehicleId,
      startLocation: draft.startLocation,
      endLocation: draft.endLocation,
      distance,
      baseDistance,
      roundTrip,
      purpose,
      startTime: finalStartTime,
      endTime: finalEndTime,
    };

    if (isEditing && editTrip && onUpdateTrip) {
      onUpdateTrip(editTrip.id, tripData);
    } else {
      onCreateTrip(tripData);
    }

    handleClose();
  };

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'vehicle', label: 'Véhicule', icon: <Car className="w-4 h-4" /> },
    { key: 'start', label: 'Départ', icon: <MapPin className="w-4 h-4" /> },
    { key: 'end', label: 'Arrivée', icon: <MapPin className="w-4 h-4" /> },
    { key: 'details', label: 'Détails', icon: <FileText className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);
  const selectedVehicle = vehicles.find(v => v.id === draft.vehicleId);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-3xl"
        onInteractOutside={preventCloseOnGoogleAutocomplete}
        onPointerDownOutside={preventCloseOnGoogleAutocomplete}
        onFocusOutside={preventCloseOnGoogleAutocomplete}
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">{isEditing ? 'Modifier le trajet' : 'Nouveau trajet'}</SheetTitle>
          
          <div className="flex items-center justify-center gap-2 pt-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
                    i < currentStepIndex && "bg-accent text-accent-foreground",
                    i === currentStepIndex && "bg-primary text-primary-foreground",
                    i > currentStepIndex && "bg-muted text-muted-foreground"
                  )}
                >
                  {i < currentStepIndex ? <Check className="w-4 h-4" /> : s.icon}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-6 h-0.5 mx-1 transition-colors",
                      i < currentStepIndex ? "bg-accent" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-full pb-24">
          {step === 'vehicle' && (
            <div className="animate-fade-in space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Sélectionner un véhicule
              </h3>
              
              {vehicles.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun véhicule enregistré</p>
                  <Button onClick={onAddVehicle}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un véhicule
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {vehicles.map(vehicle => (
                      <VehicleCard
                        key={vehicle.id}
                        vehicle={vehicle}
                        selected={draft.vehicleId === vehicle.id}
                        onSelect={() => handleSelectVehicle(vehicle.id)}
                        totalKm={getTotalAnnualKm(vehicle.id)}
                      />
                    ))}
                  </div>
                  <Button variant="ghost" className="w-full" onClick={onAddVehicle}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un véhicule
                  </Button>
                </>
              )}
            </div>
          )}

          {step === 'start' && (
            <div className="animate-fade-in">
              {selectedVehicle && (
                <div className="mb-4 p-3 bg-muted rounded-lg flex items-center gap-3">
                  <Car className="w-4 h-4 text-primary" />
                  <span className="font-medium">{selectedVehicle.make} {selectedVehicle.model}</span>
                  <span className="text-muted-foreground">({selectedVehicle.licensePlate})</span>
                </div>
              )}
              
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Départ
              </h3>
              <LocationPicker
                key="start-location"
                savedLocations={savedLocations}
                onSelect={handleSelectStart}
                onAddNew={onAddLocation}
                onDelete={onDeleteLocation}
                onUpdate={onUpdateLocation}
              />
              
              <Button variant="ghost" className="mt-4" onClick={() => setStep('vehicle')}>
                ← Retour
              </Button>
            </div>
          )}

          {step === 'end' && (
            <div className="animate-fade-in">
              <div className="mb-4 p-3 bg-muted rounded-lg flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">{draft.startLocation?.name}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">?</span>
              </div>
              
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" />
                Arrivée
              </h3>
              <LocationPicker
                key="end-location"
                savedLocations={savedLocations}
                onSelect={handleSelectEnd}
                onAddNew={onAddLocation}
                onDelete={onDeleteLocation}
                onUpdate={onUpdateLocation}
              />
              
              <Button variant="ghost" className="mt-4" onClick={() => setStep('start')}>
                ← Retour
              </Button>
            </div>
          )}

          {step === 'details' && (
            <div className="animate-fade-in space-y-6">
              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-3 text-sm mb-2">
                  <Car className="w-4 h-4 text-primary" />
                  <span className="font-medium">{selectedVehicle?.make} {selectedVehicle?.model}</span>
                  <span className="text-muted-foreground">• {selectedVehicle?.fiscalPower} CV</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">{draft.startLocation?.name}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <MapPin className="w-4 h-4 text-accent" />
                  <span className="font-medium">{draft.endLocation?.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {draft.startTime?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {' → '}
                    {draft.endTime?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className={cn(
                "flex items-center justify-between p-4 rounded-xl transition-colors outline-none ring-0",
                roundTrip ? "bg-primary/5 border-2 border-primary" : "bg-muted border-0"
              )}>
                <div className="flex items-center gap-3">
                  <RefreshCw className={cn("w-5 h-5", roundTrip ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className="font-medium">Aller-retour</p>
                    <p className="text-xs text-muted-foreground">
                      {roundTrip 
                        ? `Distance totale : ${((parseFloat(manualDistance) || 0) * 2).toFixed(1)} km`
                        : 'Double la distance parcourue'
                      }
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={roundTrip} 
                  onCheckedChange={setRoundTrip}
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
                <label className="text-sm font-medium">Distance (km) *</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 25.5"
                  value={manualDistance}
                  onChange={(e) => setManualDistance(e.target.value)}
                />
                {typeof draft.startLocation?.lat === 'number' &&
                typeof draft.startLocation?.lng === 'number' &&
                typeof draft.endLocation?.lat === 'number' &&
                typeof draft.endLocation?.lng === 'number' ? (
                  <p className="text-xs text-accent">
                    ✓ Distance calculée automatiquement (modifiable)
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ajoutez des coordonnées GPS aux lieux pour un calcul automatique
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motif du déplacement *</label>
                <Input
                  placeholder="Ex: Réunion client, Livraison..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => isEditing ? handleClose() : setStep('end')}>
                  {isEditing ? 'Annuler' : '← Retour'}
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1"
                  onClick={handleConfirm}
                >
                  {isEditing ? 'Modifier' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
