import { TourStopData } from '@/types/trip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MapPin, Clock, Truck } from 'lucide-react';
import { removeCountryFromAddress } from '@/lib/geocoding';

interface TourDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stops: TourStopData[];
  totalDistance: number;
  date: Date;
}

export function TourDetailSheet({ open, onOpenChange, stops, totalDistance, date }: TourDetailSheetProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h${remainingMins > 0 ? remainingMins : ''}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-left">Détail de la tournée</SheetTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })} • {totalDistance.toFixed(1)} km • {stops.length} étapes
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="py-4 overflow-y-auto max-h-[calc(85vh-120px)]">
          <div className="space-y-0">
            {stops.map((stop, index) => {
              const isFirst = index === 0;
              const isLast = index === stops.length - 1;
              const isIntermediate = !isFirst && !isLast;
              
              // Labels pour le design
              const label = isFirst ? 'Départ' : isLast ? 'Arrivée' : `Étape ${index}`;
              
              return (
                <div key={stop.id} className="relative pl-10">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gradient-to-b from-border to-border/50" />
                  )}
                  
                  {/* Timeline dot avec label */}
                  <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-sm ${
                    isFirst 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : isLast 
                        ? 'bg-accent border-accent text-accent-foreground'
                        : 'bg-background border-primary/40'
                  }`}>
                    {isFirst ? (
                      <MapPin className="w-4 h-4" />
                    ) : isLast ? (
                      <MapPin className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-semibold text-primary">{index}</span>
                    )}
                  </div>

                  {/* Stop content */}
                  <div className="pb-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">
                          {label}
                        </p>
                        <p className="font-semibold text-foreground truncate">
                          {stop.city || (stop.address ? removeCountryFromAddress(stop.address) : 'Position')}
                        </p>
                        {stop.address && stop.city && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {removeCountryFromAddress(stop.address)}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(stop.timestamp)}
                        </div>
                        {stop.duration && stop.duration > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Arrêt: {formatDuration(stop.duration)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}