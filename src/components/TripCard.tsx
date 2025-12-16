import { Trip } from '@/types/trip';
import { MapPin, Clock, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface TripCardProps {
  trip: Trip;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}

export function TripCard({ trip, onDelete, showDelete = false }: TripCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
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

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{formatDate(trip.startTime)}</span>
          <span>•</span>
          <span>{formatTime(trip.startTime)}</span>
        </div>
        {showDelete && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(trip.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <MapPin className={cn("w-4 h-4 shrink-0", getLocationIcon(trip.startLocation.type))} />
          <span className="font-medium truncate">{trip.startLocation.name}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <MapPin className={cn("w-4 h-4 shrink-0", getLocationIcon(trip.endLocation.type))} />
          <span className="font-medium truncate">{trip.endLocation.name}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{trip.purpose}</p>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <span className="counter-text text-lg font-semibold">{trip.distance.toFixed(1)} km</span>
        <span className="counter-text text-lg font-bold text-accent">
          +{trip.ikAmount.toFixed(2)} €
        </span>
      </div>
    </div>
  );
}
