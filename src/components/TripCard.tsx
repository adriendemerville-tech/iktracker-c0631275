import { Trip, Vehicle } from '@/types/trip';
import { MapPin, Clock, ArrowRight, Trash2, Car, Pencil } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { extractCityFromAddress } from '@/lib/geocoding';

interface TripCardProps {
  trip: Trip;
  vehicle?: Vehicle;
  onDelete?: (id: string) => void;
  onEdit?: (trip: Trip) => void;
  showDelete?: boolean;
}

// Extract city name from location
const getDisplayName = (location: { name: string; address?: string }): string => {
  // If address exists and contains city info, extract it
  if (location.address) {
    const city = extractCityFromAddress(location.address);
    if (city && city !== location.address) {
      return city;
    }
  }
  // Fallback to location name
  return location.name;
};

export function TripCard({ trip, vehicle, onDelete, onEdit, showDelete = false }: TripCardProps) {
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

  const startCityName = getDisplayName(trip.startLocation);
  const endCityName = getDisplayName(trip.endLocation);

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{formatDate(trip.startTime)}</span>
          <span>•</span>
          <span>{formatTime(trip.startTime)}</span>
        </div>
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => onEdit(trip)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </div>

      {vehicle && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Car className="w-4 h-4 text-primary" />
          <span className="font-medium">{vehicle.make} {vehicle.model}</span>
          <span className="text-muted-foreground">• {vehicle.licensePlate}</span>
          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">
            {vehicle.fiscalPower} CV
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <MapPin className={cn("w-4 h-4 shrink-0", getLocationIcon(trip.startLocation.type))} />
          <span className="font-medium truncate">{startCityName}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <MapPin className={cn("w-4 h-4 shrink-0", getLocationIcon(trip.endLocation.type))} />
          <span className="font-medium truncate">{endCityName}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{trip.purpose}</p>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-4">
          <span className="counter-text text-lg font-semibold">{trip.distance.toFixed(1)} km</span>
          <span className="counter-text text-lg font-bold text-accent">
            +{trip.ikAmount.toFixed(2)} €
          </span>
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
    </div>
  );
}
