import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { LocationPicker } from './LocationPicker';
import { Location, TripDraft } from '@/types/trip';
import { calculateDistance } from '@/hooks/useGeolocation';
import { MapPin, ArrowRight, Clock, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewTripSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedLocations: Location[];
  onAddLocation: (location: Omit<Location, 'id'>) => Location;
  onCreateTrip: (trip: {
    startLocation: Location;
    endLocation: Location;
    distance: number;
    purpose: string;
    startTime: Date;
    endTime: Date;
  }) => void;
}

type Step = 'start' | 'end' | 'details' | 'confirm';

export function NewTripSheet({
  open,
  onOpenChange,
  savedLocations,
  onAddLocation,
  onCreateTrip,
}: NewTripSheetProps) {
  const [step, setStep] = useState<Step>('start');
  const [draft, setDraft] = useState<TripDraft>({});
  const [purpose, setPurpose] = useState('');
  const [manualDistance, setManualDistance] = useState('');

  const resetForm = () => {
    setStep('start');
    setDraft({});
    setPurpose('');
    setManualDistance('');
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  };

  const handleSelectStart = (location: Location) => {
    setDraft({
      ...draft,
      startLocation: location,
      startTime: new Date(),
    });
    setStep('end');
  };

  const handleSelectEnd = (location: Location) => {
    setDraft({
      ...draft,
      endLocation: location,
      endTime: new Date(),
    });
    setStep('details');
  };

  const handleConfirm = () => {
    if (!draft.startLocation || !draft.endLocation || !purpose.trim()) return;

    let distance = parseFloat(manualDistance) || 0;
    
    // If both locations have coordinates, calculate distance
    if (
      draft.startLocation.lat &&
      draft.startLocation.lng &&
      draft.endLocation.lat &&
      draft.endLocation.lng &&
      !manualDistance
    ) {
      distance = calculateDistance(
        draft.startLocation.lat,
        draft.startLocation.lng,
        draft.endLocation.lat,
        draft.endLocation.lng
      );
    }

    onCreateTrip({
      startLocation: draft.startLocation,
      endLocation: draft.endLocation,
      distance,
      purpose,
      startTime: draft.startTime || new Date(),
      endTime: draft.endTime || new Date(),
    });

    handleClose();
  };

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'start', label: 'Départ', icon: <MapPin className="w-4 h-4" /> },
    { key: 'end', label: 'Arrivée', icon: <MapPin className="w-4 h-4" /> },
    { key: 'details', label: 'Détails', icon: <FileText className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Nouveau trajet</SheetTitle>
          
          {/* Progress indicator */}
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
                      "w-8 h-0.5 mx-1 transition-colors",
                      i < currentStepIndex ? "bg-accent" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-full pb-24">
          {step === 'start' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Point de départ
              </h3>
              <LocationPicker
                savedLocations={savedLocations}
                onSelect={handleSelectStart}
                onAddNew={onAddLocation}
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
                Point d'arrivée
              </h3>
              <LocationPicker
                savedLocations={savedLocations}
                onSelect={handleSelectEnd}
                onAddNew={onAddLocation}
              />
              
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => setStep('start')}
              >
                ← Retour
              </Button>
            </div>
          )}

          {step === 'details' && (
            <div className="animate-fade-in space-y-6">
              <div className="p-4 bg-muted rounded-xl">
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Distance (km)</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 25.5"
                  value={manualDistance}
                  onChange={(e) => setManualDistance(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Entrez la distance parcourue en kilomètres
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motif du déplacement</label>
                <Input
                  placeholder="Ex: Réunion client, Livraison..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setStep('end')}
                >
                  ← Retour
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1"
                  onClick={handleConfirm}
                  disabled={!purpose.trim() || !manualDistance}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
