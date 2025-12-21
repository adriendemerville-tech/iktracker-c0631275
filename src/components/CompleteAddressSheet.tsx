import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Loader2, Check } from 'lucide-react';
import { Trip, Location } from '@/types/trip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!selectedLocation) {
      toast.error('Veuillez sélectionner une destination');
      return;
    }

    setLoading(true);

    try {
      // Call edge function to recalculate distance
      const { data, error } = await supabase.functions.invoke('recalculate-distances', {
        body: { 
          tripId: trip.id,
          newEndLocation: selectedLocation.address || selectedLocation.name,
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

  const getLocationLabel = (type: string) => {
    const labels: Record<string, string> = {
      home: 'Domicile',
      office: 'Bureau',
      client: 'Client',
      supplier: 'Fournisseur',
      other: 'Autre',
    };
    return labels[type] || 'Autre';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader className="text-left">
          <SheetTitle>Compléter l'adresse</SheetTitle>
          <SheetDescription>
            RDV: <span className="font-medium text-foreground">{trip.purpose}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Sélectionnez la destination pour ce rendez-vous :
          </p>

          <ScrollArea className="h-[calc(70vh-200px)]">
            <div className="space-y-2 pr-4">
              {savedLocations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun lieu enregistré. Ajoutez des lieux dans vos paramètres.
                </p>
              ) : (
                savedLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => setSelectedLocation(location)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                      selectedLocation?.id === location.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <MapPin className={cn("w-5 h-5 shrink-0", getLocationIcon(location.type))} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{location.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {location.address || getLocationLabel(location.type)}
                      </p>
                    </div>
                    {selectedLocation?.id === location.id && (
                      <Check className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="mt-4 flex gap-3">
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
              disabled={!selectedLocation || loading}
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
