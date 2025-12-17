import { Trip, Vehicle } from '@/types/trip';
import { MapPin, ArrowRight, Trash2, Car, Pencil, Calendar, Truck } from 'lucide-react';
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

const getDisplayName = (location: { name: string; address?: string }): string => {
  if (location.address) {
    const city = extractCityFromAddress(location.address);
    if (city && city !== location.address) {
      return city;
    }
  }
  return location.name;
};

export function TripCard({ trip, vehicle, onDelete, onEdit, showDelete = false }: TripCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
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
  const isTour = trip.purpose === 'Tournée';

  return (
    <div className="bg-card rounded-xl p-3 shadow-sm border border-border/50 animate-fade-in relative">
      {/* Tour icon badge */}
      {isTour && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full shadow-sm border border-border/50 flex items-center justify-center">
          <Truck className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}

      {/* Ligne 1: Date | Départ → Arrivée | Bouton edit */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(trip.startTime)}</span>
        </div>
        <span className="text-border ml-1 mr-3">|</span>
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <MapPin className={cn("w-3.5 h-3.5 shrink-0", getLocationIcon(trip.startLocation.type))} />
          <span className="font-medium text-sm truncate">{startCityName}</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <MapPin className={cn("w-3.5 h-3.5 shrink-0", getLocationIcon(trip.endLocation.type))} />
          <span className="font-medium text-sm truncate">{endCityName}</span>
        </div>
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0"
            onClick={() => onEdit(trip)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Ligne 2: Véhicule + CV | Motif */}
      {vehicle && (
        <div className="flex items-center gap-2 mb-2 text-xs">
          <Car className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-medium">{vehicle.make} {vehicle.model}</span>
          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
            {vehicle.fiscalPower} CV
          </span>
          {trip.purpose && (
            <>
              <span className="text-border ml-2 mr-6">|</span>
              <span className="text-muted-foreground truncate flex-1">{trip.purpose}</span>
            </>
          )}
        </div>
      )}

      {/* Ligne 3: Distance + IK + Bouton supprimer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-3">
          <span className="counter-text text-sm font-semibold">{trip.distance.toFixed(1)} km</span>
          <span className="counter-text text-sm font-bold text-accent">
            +{trip.ikAmount.toFixed(2)} €
          </span>
        </div>
        {showDelete && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(trip.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
