import { useState, useEffect, useRef } from 'react';
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
import { MapPin, ArrowRight, Clock, FileText, Check, Car, Plus, CalendarIcon, RefreshCw, Navigation, Map, X } from 'lucide-react';
import { WazeIcon } from './icons/WazeIcon';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Normalize address for consistent caching
const normalizeAddress = (address: string): string => {
  return address.toLowerCase().trim().replace(/\s+/g, ' ');
};

// Cache functions for distance
const getCachedDistance = async (startAddress: string, endAddress: string): Promise<number | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const normalizedStart = normalizeAddress(startAddress);
  const normalizedEnd = normalizeAddress(endAddress);
  
  try {
    const { data } = await supabase
      .from('distance_cache')
      .select('distance')
      .eq('user_id', user.id)
      .eq('start_address', normalizedStart)
      .eq('end_address', normalizedEnd)
      .maybeSingle();
    
    if (data?.distance) {
      console.log('Cache hit for distance:', normalizedStart, '->', normalizedEnd);
    }
    
    return data?.distance ?? null;
  } catch (error) {
    console.error('Error fetching cached distance:', error);
    return null;
  }
};

const saveCachedDistance = async (startAddress: string, endAddress: string, distance: number): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const normalizedStart = normalizeAddress(startAddress);
  const normalizedEnd = normalizeAddress(endAddress);
  
  try {
    await supabase
      .from('distance_cache')
      .upsert({
        user_id: user.id,
        start_address: normalizedStart,
        end_address: normalizedEnd,
        distance
      }, { onConflict: 'user_id,start_address,end_address', ignoreDuplicates: true });
    console.log('Distance cached:', normalizedStart, '->', normalizedEnd, distance, 'km');
  } catch (error) {
    console.error('Error caching distance:', error);
  }
};

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
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const [tripDate, setTripDate] = useState<Date>(new Date());
  const [roundTrip, setRoundTrip] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const distanceInputRef = useRef<HTMLInputElement>(null);
  const purposeInputRef = useRef<HTMLInputElement>(null);

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
      // Show total distance in input (already doubled if round trip)
      setManualDistance(editTrip.distance.toString());
      setRoundTrip(editTrip.roundTrip);
      setTripDate(new Date(editTrip.startTime));
      setStep('details');
      
      // Recalculate distance from cache or API if coordinates are available
      const start = editTrip.startLocation;
      const end = editTrip.endLocation;
      const startAddr = start?.address || start?.name;
      const endAddr = end?.address || end?.name;
      
      const fetchDistance = async () => {
        // Check cache first
        if (startAddr && endAddr) {
          const cached = await getCachedDistance(startAddr, endAddr);
          if (cached !== null) {
            setCalculatedDistance(cached);
            return;
          }
        }
        
        // Fall back to API
        if (typeof start?.lat === 'number' && typeof start?.lng === 'number' &&
            typeof end?.lat === 'number' && typeof end?.lng === 'number') {
          const distance = await calculateDrivingDistance(start.lat, start.lng, end.lat, end.lng);
          setCalculatedDistance(distance);
          
          // Save to cache
          if (startAddr && endAddr) {
            saveCachedDistance(startAddr, endAddr, distance);
          }
        }
      };
      
      fetchDistance().catch((err) => console.error('Error fetching distance:', err));
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

  // Restore draft from localStorage when opening (if not editing)
  useEffect(() => {
    if (open && !editTrip) {
      const savedDraft = localStorage.getItem('iktracker_trip_draft');
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          // Only restore if saved within last 24 hours
          const savedAt = new Date(draftData.savedAt);
          const hoursSinceSaved = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceSaved < 24) {
            setDraft({
              vehicleId: draftData.vehicleId,
              startLocation: draftData.startLocation,
              endLocation: draftData.endLocation,
              startTime: draftData.startTime ? new Date(draftData.startTime) : undefined,
              endTime: draftData.endTime ? new Date(draftData.endTime) : undefined,
            });
            setPurpose(draftData.purpose || '');
            setManualDistance(draftData.manualDistance || '');
            setRoundTrip(draftData.roundTrip || false);
            setTripDate(draftData.tripDate ? new Date(draftData.tripDate) : new Date());
            
            // Go to details step if we have enough data
            if (draftData.vehicleId && draftData.startLocation && draftData.endLocation) {
              setStep('details');
              toast.info("Brouillon restauré", {
                description: "Votre trajet précédent a été restauré.",
              });
            }
            
            // Clear the draft after restoring
            localStorage.removeItem('iktracker_trip_draft');
          } else {
            // Draft too old, remove it
            localStorage.removeItem('iktracker_trip_draft');
          }
        } catch (e) {
          console.error('Error restoring draft:', e);
          localStorage.removeItem('iktracker_trip_draft');
        }
      }
    }
  }, [open, editTrip]);

  const resetForm = () => {
    setStep('vehicle');
    setDraft({});
    setPurpose('');
    setManualDistance('');
    setCalculatedDistance(null);
    setTripDate(new Date());
    setRoundTrip(false);
  };

  const handleClose = () => {
    // Always reset form immediately when closing
    resetForm();
    onOpenChange(false);
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
          const startAddr = start.address || start.name;
          const endAddr = location.address || location.name;
          
          // Check cache first
          if (startAddr && endAddr) {
            const cachedDistance = await getCachedDistance(startAddr, endAddr);
            if (cachedDistance !== null) {
              setCalculatedDistance(cachedDistance);
              setManualDistance(cachedDistance.toFixed(1));
              setStep('details');
              return;
            }
          }

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
            setCalculatedDistance(distance);
            setManualDistance(distance.toFixed(1));
            
            // Save to cache
            if (startAddr && endAddr) {
              saveCachedDistance(startAddr, endAddr, distance);
            }
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

    const distance = parseFloat(manualDistance) || 0;
    const baseDistance = roundTrip ? distance / 2 : distance;
    
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

  // Save draft before navigation
  const saveDraftBeforeNavigate = () => {
    const draftData = {
      vehicleId: draft.vehicleId,
      startLocation: draft.startLocation,
      endLocation: draft.endLocation,
      startTime: draft.startTime?.toISOString(),
      endTime: draft.endTime?.toISOString(),
      purpose,
      manualDistance,
      roundTrip,
      tripDate: tripDate.toISOString(),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('iktracker_trip_draft', JSON.stringify(draftData));
  };

  // Navigate with Waze - saves draft before opening
  const handleNavigateWithWaze = async () => {
    if (!draft.endLocation) return;
    
    setIsNavigating(true);
    
    try {
      const destinationAddress = draft.endLocation.address || draft.endLocation.name;
      
      if (!destinationAddress) {
        toast.error("Adresse de destination manquante");
        setIsNavigating(false);
        return;
      }
      
      saveDraftBeforeNavigate();
      const encodedAddress = encodeURIComponent(destinationAddress);
      const wazeUrl = `waze://?q=${encodedAddress}&navigate=yes`;
      const webFallbackUrl = `https://www.waze.com/ul?q=${encodedAddress}&navigate=yes`;
      
      const startTime = Date.now();
      window.location.href = wazeUrl;
      
      setTimeout(() => {
        if (Date.now() - startTime < 2500) {
          window.open(webFallbackUrl, '_blank');
        }
      }, 2000);
      
      toast.success("Brouillon sauvegardé", {
        description: "Votre trajet sera conservé à votre retour.",
      });
      
    } catch (error) {
      console.error('Error navigating with Waze:', error);
      toast.error("Erreur lors de l'ouverture de Waze");
    } finally {
      setIsNavigating(false);
    }
  };

  // Navigate with Google Maps - saves draft before opening
  const handleNavigateWithMaps = async () => {
    if (!draft.endLocation) return;
    
    setIsNavigating(true);
    
    try {
      const destinationAddress = draft.endLocation.address || draft.endLocation.name;
      
      if (!destinationAddress) {
        toast.error("Adresse de destination manquante");
        setIsNavigating(false);
        return;
      }
      
      saveDraftBeforeNavigate();
      const encodedAddress = encodeURIComponent(destinationAddress);
      
      // Google Maps URL - works on both mobile and web
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
      
      window.open(mapsUrl, '_blank');
      
      toast.success("Brouillon sauvegardé", {
        description: "Votre trajet sera conservé à votre retour.",
      });
      
    } catch (error) {
      console.error('Error navigating with Maps:', error);
      toast.error("Erreur lors de l'ouverture de Maps");
    } finally {
      setIsNavigating(false);
    }
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
        className="h-[85vh] rounded-t-3xl w-full max-w-[95vw] sm:max-w-[90%] md:max-w-[82%] mx-auto overflow-x-hidden"
        onInteractOutside={preventCloseOnGoogleAutocomplete}
        onPointerDownOutside={preventCloseOnGoogleAutocomplete}
        onFocusOutside={preventCloseOnGoogleAutocomplete}
      >
        <SheetHeader className="pb-4 px-2">
          <SheetTitle className="text-xl">{isEditing ? 'Modifier le trajet' : 'Nouveau trajet'}</SheetTitle>
          
          {/* Stepper - responsive sizing */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 pt-2 overflow-hidden">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all duration-300 shrink-0",
                    i < currentStepIndex && "bg-accent text-accent-foreground",
                    i === currentStepIndex && "bg-primary text-primary-foreground",
                    i > currentStepIndex && "bg-muted text-muted-foreground"
                  )}
                >
                  {i < currentStepIndex ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : s.icon}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-4 sm:w-6 h-0.5 mx-0.5 sm:mx-1 transition-colors shrink-0",
                      i < currentStepIndex ? "bg-accent" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto overflow-x-hidden h-full pb-24 px-3 sm:px-4">
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
                  {selectedVehicle.licensePlate && <span className="text-muted-foreground">({selectedVehicle.licensePlate})</span>}
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
            </div>
          )}

          {step === 'details' && (
            <div className="animate-fade-in space-y-6">
              <div className="p-4 bg-muted rounded-md relative">
                <button
                  onClick={handleClose}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Fermer et réinitialiser"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-3 text-sm mb-2 pr-6">
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
              </div>

              {/* Navigation Assistée - Waze & Maps Buttons */}
              {draft.endLocation && (draft.endLocation.address || draft.endLocation.name) && (
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
                    <WazeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:scale-110 transition-transform" />
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
                    <Map className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:scale-110 transition-transform" />
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
                <Input
                  ref={distanceInputRef}
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 25.5 km"
                  className={isBlinking ? 'animate-blink-orange' : ''}
                  value={manualDistance ? `${manualDistance} km` : ''}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    // Limite à 1 décimale max
                    const parts = value.split('.');
                    if (parts.length > 1) {
                      value = parts[0] + '.' + parts[1].slice(0, 1);
                    }
                    setManualDistance(value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      
                      // Validation de la distance au moment de Entrée
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
                    Ajoutez des coordonnées GPS aux lieux pour un calcul automatique
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motif du déplacement *</label>
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
