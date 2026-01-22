import { memo } from 'react';
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
import { Clock, Play, Square } from 'lucide-react';

interface TourRecoveryModalProps {
  open: boolean;
  inactivityDuration: string;
  stopsCount: number;
  distanceKm: number;
  onResume: () => void;
  onFinalize: () => void;
  isProcessing?: boolean;
}

export const TourRecoveryModal = memo(function TourRecoveryModal({
  open,
  inactivityDuration,
  stopsCount,
  distanceKm,
  onResume,
  onFinalize,
  isProcessing = false,
}: TourRecoveryModalProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Tournée interrompue
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Votre tournée a été interrompue il y a <strong>{inactivityDuration}</strong>.
              </p>
              <div className="flex gap-4 justify-center py-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stopsCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {stopsCount === 1 ? 'étape' : 'étapes'}
                  </p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{distanceKm.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">km</p>
                </div>
              </div>
              <p className="text-sm">Voulez-vous la reprendre ?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3 sm:space-x-0">
          <AlertDialogCancel 
            onClick={onFinalize} 
            disabled={isProcessing}
            className="flex-1 h-12"
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
