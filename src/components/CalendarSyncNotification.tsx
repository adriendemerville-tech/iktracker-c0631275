import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CalendarSyncNotificationProps {
  dateRange: { startDate: string; endDate: string } | null;
  tripsCreated: number;
  onClose: () => void;
}

export function CalendarSyncNotification({ dateRange, tripsCreated, onClose }: CalendarSyncNotificationProps) {
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCloseButton(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!dateRange) return null;

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd MMMM yyyy', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="relative mx-4 max-w-md bg-muted/95 p-6 shadow-xl">
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-background/50 hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        
        <div className="space-y-3 text-center">
          <p className="text-lg font-medium text-foreground">
            Import terminé
          </p>
          <p className="text-sm text-muted-foreground">
            {tripsCreated > 0 ? (
              <>
                <span className="font-semibold text-foreground">{tripsCreated} trajet{tripsCreated > 1 ? 's' : ''}</span> importé{tripsCreated > 1 ? 's' : ''} depuis votre calendrier
              </>
            ) : (
              <>Aucun nouveau trajet à importer</>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Du <span className="font-medium">{formatDate(dateRange.startDate)}</span> au <span className="font-medium">{formatDate(dateRange.endDate)}</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
