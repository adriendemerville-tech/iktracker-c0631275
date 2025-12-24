import { useState } from 'react';
import { Trip, Vehicle } from '@/types/trip';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Archive, RotateCcw, Trash2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArchivedTripsSectionProps {
  archivedTrips: Trip[];
  vehicles: Vehicle[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export const ArchivedTripsSection = ({
  archivedTrips,
  vehicles,
  onRestore,
  onPermanentDelete,
}: ArchivedTripsSectionProps) => {
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  if (archivedTrips.length === 0) return null;

  const getVehicleName = (vehicleId: string | null) => {
    if (!vehicleId) return null;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.make} ${vehicle.model}` : null;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  return (
    <>
      <Accordion type="single" collapsible className="mt-6">
        <AccordionItem value="archived" className="border-none">
          <AccordionTrigger className="py-3 px-2 text-muted-foreground hover:text-foreground hover:no-underline rounded-lg hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4" />
              <span>Archivés ({archivedTrips.length})</span>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground px-2 mb-3">
              Les trajets archivés sont conservés 30 jours avant suppression définitive.
            </p>
            
            {archivedTrips.map((trip) => (
              <div 
                key={trip.id}
                className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{formatDate(new Date(trip.startTime))}</span>
                      {trip.calendarEventId && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          Calendrier
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate mt-1">
                      {trip.purpose || 'Sans motif'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {trip.startLocation.name} → {trip.endLocation.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{trip.distance.toFixed(1)} km</span>
                      <span>{trip.ikAmount.toFixed(2)} €</span>
                      {getVehicleName(trip.vehicleId) && (
                        <span className="truncate">{getVehicleName(trip.vehicleId)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => onRestore(trip.id)}
                      title="Restaurer"
                      aria-label="Restaurer le trajet"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setTripToDelete(trip.id)}
                      title="Supprimer définitivement"
                      aria-label="Supprimer définitivement le trajet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Permanent delete confirmation */}
      <AlertDialog open={!!tripToDelete} onOpenChange={() => setTripToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce trajet sera supprimé de façon permanente et ne pourra plus être restauré.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (tripToDelete) {
                  onPermanentDelete(tripToDelete);
                  setTripToDelete(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
