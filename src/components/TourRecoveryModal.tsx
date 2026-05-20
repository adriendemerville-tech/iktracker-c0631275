import { memo, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, Play, Square, Navigation, CheckCircle2, MapPin, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDistanceMeters } from '@/lib/loop-detection';
import type { TourStop } from '@/hooks/useTourTracker';

interface TourRecoveryModalProps {
  open: boolean;
  inactivityDuration: string;
  stopsCount: number;
  distanceKm: number;
  stops?: TourStop[];
  startedAt?: string;
  onResume: () => void;
  onFinalize: () => void;
  isProcessing?: boolean;
}

function formatTime(value: Date | string | number): string {
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const TourRecoveryModal = memo(function TourRecoveryModal({
  open,
  inactivityDuration,
  stopsCount,
  distanceKm,
  stops = [],
  startedAt,
  onResume,
  onFinalize,
  isProcessing = false,
}: TourRecoveryModalProps) {
  const stopsWithDelta = useMemo(() => {
    return stops.map((s, i) => {
      const prev = i > 0 ? stops[i - 1] : null;
      const deltaKm = prev
        ? getDistanceMeters({ lat: prev.lat, lng: prev.lng }, { lat: s.lat, lng: s.lng }) / 1000
        : 0;
      return { ...s, deltaKm };
    });
  }, [stops]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md p-0 overflow-hidden gap-0">
        {/* Header */}
        <AlertDialogHeader className="p-5 pb-3 space-y-2">
          <AlertDialogTitle className="flex items-center gap-2 text-base">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            Tournée interrompue
          </AlertDialogTitle>
          <p className="text-sm text-muted-foreground">
            Interrompue il y a <strong className="text-foreground">{inactivityDuration}</strong>
            {startedAt ? <> · démarrée à <strong className="text-foreground">{formatTime(startedAt)}</strong></> : null}
          </p>

          <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-accent/10 to-primary/5 border border-border/60 p-3 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground leading-tight">Mode Tournée</p>
                <p className="text-xs text-muted-foreground">{stopsCount} {stopsCount > 1 ? 'étapes' : 'étape'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary leading-none">{distanceKm.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">km</p>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Timeline */}
        {stopsWithDelta.length > 0 && (
          <div className="px-5 pb-3 max-h-[45vh] overflow-y-auto">
            <div className="relative">
              <div className="absolute left-[14px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/60 via-accent/60 to-muted" />
              <ul className="space-y-3">
                {stopsWithDelta.map((stop, i) => {
                  const isFirst = i === 0;
                  const isLast = i === stopsWithDelta.length - 1;
                  return (
                    <li key={stop.id} className="relative flex items-start gap-3">
                      <div
                        className={cn(
                          'relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ring-4 ring-background',
                          isLast
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-success text-success-foreground',
                        )}
                      >
                        {isLast ? <Car className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0 bg-muted/40 rounded-lg p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                              {isFirst && <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />}
                              {stop.city || stop.address || (isFirst ? 'Départ' : `Étape ${i + 1}`)}
                            </p>
                            {stop.address && stop.city && stop.address !== stop.city && (
                              <p className="text-xs text-muted-foreground truncate">{stop.address}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-medium text-primary">
                              {isFirst ? 'Départ' : `+${stop.deltaKm.toFixed(1)} km`}
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTime(stop.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <AlertDialogFooter className="flex-row gap-3 sm:space-x-0 p-4 pt-3 border-t border-border bg-background">
          <AlertDialogCancel
            onClick={onFinalize}
            disabled={isProcessing}
            className="flex-1 h-12 mt-0"
          >
            <Square className="w-4 h-4 mr-2" />
            Terminer
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onResume}
            disabled={isProcessing}
            className="flex-1 h-12 bg-primary"
          >
            <Play className="w-4 h-4 mr-2" />
            Reprendre
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
