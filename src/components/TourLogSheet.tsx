import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { TourStop } from '@/hooks/useTourTracker';
import { MapPin, Clock, Car, Play, History, Timer, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isActive: boolean;
  isLoading: boolean;
  stops: TourStop[];
  totalDistanceKm?: number;
  onStart: () => void;
  onFinish: () => void;
  onClear: () => void;
  hasHistory?: boolean;
  onShowHistory?: () => void;
  isHistory?: boolean;
}

export function TourLogSheet({
  open,
  onOpenChange,
  isActive,
  isLoading,
  stops,
  totalDistanceKm = 0,
  onStart,
  onFinish,
  onClear,
  hasHistory,
  onShowHistory,
  isHistory,
}: TourLogSheetProps) {
  const [elapsedTime, setElapsedTime] = useState('');

  // Calculate elapsed time
  useEffect(() => {
    if (!isActive || stops.length === 0) {
      setElapsedTime('');
      return;
    }

    const startTime = stops[0].timestamp;
    
    const updateElapsed = () => {
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      
      if (hours > 0) {
        setElapsedTime(`${hours}h${mins.toString().padStart(2, '0')}`);
      } else {
        setElapsedTime(`${mins} min`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [isActive, stops]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    return `${Math.round(seconds / 3600)}h`;
  };

  // Show full list if multiple stops
  const showFullList = stops.length > 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className={cn(
          "rounded-t-2xl mx-auto max-w-md left-1/2 -translate-x-1/2",
          showFullList ? "h-[55vh]" : "h-auto pb-6"
        )}
      >
        <SheetHeader className="pb-4 pt-2">
          <SheetTitle className="text-base flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            {isHistory ? 'Dernière tournée' : 'Tournée'}
          </SheetTitle>
        </SheetHeader>

        {/* Stats bar when active */}
        {isActive && stops.length > 0 && (
          <div className="mb-4 flex items-center justify-center gap-6 py-2 px-3 bg-muted/50 rounded-lg">
            {elapsedTime && (
              <div className="flex items-center gap-1.5 text-sm">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{elapsedTime}</span>
              </div>
            )}
            {totalDistanceKm > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Navigation className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{totalDistanceKm.toFixed(1)} km</span>
              </div>
            )}
          </div>
        )}

        {/* Single stop - compact centered view */}
        {!showFullList && stops.length === 1 && (
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-2 shadow-md">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium">{stops[0].city || 'Point de départ'}</p>
            <p className="text-xs text-muted-foreground">
              Démarré à {formatTime(stops[0].timestamp)}
            </p>
          </div>
        )}

        {/* No stops yet */}
        {stops.length === 0 && isActive && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              En attente de la première position...
            </p>
          </div>
        )}

        {/* Full stops list for non-compact view */}
        {showFullList && (
          <div className="space-y-3 overflow-y-auto h-[calc(100%-7rem)] pb-4">
            {stops.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Étapes détectées
                </p>
                <div className="relative">
                  <div className="absolute left-3 top-5 bottom-5 w-0.5 bg-border" />

                  {stops.map((stop, index) => (
                    <div key={stop.id} className="relative flex gap-3 py-2">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0",
                          index === 0
                            ? "bg-primary text-primary-foreground"
                            : index === stops.length - 1 && !isActive
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        <MapPin className="w-3 h-3" />
                      </div>

                      <div className="flex-1 min-w-0 bg-card rounded-md p-2.5 shadow-sm border border-border/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {stop.city || 'Position'}
                            </p>
                            {stop.address && (
                              <p className="text-xs text-muted-foreground truncate">
                                {stop.address}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-medium flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
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
              <div className="text-center py-8">
                <Car className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Aucune étape pour le moment</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isActive
                    ? "Les arrêts seront détectés automatiquement"
                    : "Démarrez une tournée pour commencer"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className={cn(
          "flex justify-center gap-2",
          showFullList && "absolute bottom-0 left-0 right-0 p-4 bg-background border-t"
        )}>
          {isActive ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={onFinish}
            >
              <span className="w-2.5 h-2.5 bg-white rounded-sm mr-1.5" />
              Terminer
            </Button>
          ) : !isHistory ? (
            <>
              {stops.length === 0 && (
                <Button
                  variant="secondary"
                  size="default"
                  onClick={onStart}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isLoading ? 'Démarrage...' : 'Nouvelle tournée'}
                </Button>
              )}
              {hasHistory && onShowHistory && (
                <Button
                  variant="outline"
                  size="default"
                  onClick={onShowHistory}
                  className="flex items-center gap-2"
                >
                  <History className="w-4 h-4" />
                  Historique
                </Button>
              )}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
