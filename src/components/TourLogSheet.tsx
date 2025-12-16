import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { TourStop } from '@/hooks/useTourTracker';
import { MapPin, Clock, Truck, Play, Square, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isActive: boolean;
  isLoading: boolean;
  stops: TourStop[];
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  onConvertToTrips?: (stops: TourStop[]) => void;
}

export function TourLogSheet({
  open,
  onOpenChange,
  isActive,
  isLoading,
  stops,
  onStart,
  onStop,
  onClear,
  onConvertToTrips,
}: TourLogSheetProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    return `${Math.round(seconds / 3600)}h`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Journal de tournée
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto h-[calc(100%-8rem)] pb-4">
          {/* Status banner */}
          <div
            className={cn(
              "p-4 rounded-xl flex items-center gap-3",
              isActive
                ? "bg-accent/20 border border-accent"
                : "bg-muted"
            )}
          >
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                isActive ? "bg-accent animate-pulse" : "bg-muted-foreground"
              )}
            />
            <span className="font-medium">
              {isActive ? "Tournée en cours..." : "Tournée inactive"}
            </span>
            {isActive && stops.length > 0 && (
              <span className="text-sm text-muted-foreground ml-auto">
                {stops.length} arrêt{stops.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Stops list */}
          {stops.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Étapes détectées</p>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-border" />

                {stops.map((stop, index) => (
                  <div key={stop.id} className="relative flex gap-4 py-3">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0",
                        index === 0
                          ? "bg-primary text-primary-foreground"
                          : index === stops.length - 1 && !isActive
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 bg-card rounded-lg p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {stop.city || 'Position'}
                          </p>
                          {stop.address && (
                            <p className="text-sm text-muted-foreground truncate">
                              {stop.address}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(stop.timestamp)}
                          </p>
                          {stop.duration && (
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(stop.duration)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Aucune étape pour le moment</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isActive
                  ? "Les arrêts seront détectés automatiquement"
                  : "Démarrez une tournée pour commencer"}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="flex gap-3">
            {stops.length > 0 && !isActive && (
              <Button
                variant="outline"
                size="lg"
                onClick={onClear}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Effacer
              </Button>
            )}

            {isActive ? (
              <Button
                variant="destructive"
                size="lg"
                onClick={onStop}
                className="flex-1"
              >
                <Square className="w-4 h-4 mr-2" />
                Arrêter la tournée
              </Button>
            ) : (
              <Button
                variant="gradient"
                size="lg"
                onClick={onStart}
                disabled={isLoading}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Démarrage...' : 'Démarrer une tournée'}
              </Button>
            )}

            {stops.length >= 2 && !isActive && onConvertToTrips && (
              <Button
                variant="success"
                size="lg"
                onClick={() => onConvertToTrips(stops)}
                className="flex-1"
              >
                Créer les trajets
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
