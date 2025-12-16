import { Trip, Vehicle } from '@/types/trip';
import { MapPin, Clock, ArrowRight, Trash2, Car } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface TripCardProps {
  trip: Trip;
  vehicle?: Vehicle;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}

// Extract city name from address or location name
const extractCityName = (location: { name: string; address?: string }): string => {
  // If address exists, try to extract city from it
  if (location.address) {
    // French address format: "street, postal_code city, country"
    // Try to match postal code (5 digits) followed by city name
    const postalCityMatch = location.address.match(/\b(\d{5})\s+([^,]+)/);
    if (postalCityMatch && postalCityMatch[2]) {
      return postalCityMatch[2].trim();
    }
    
    // If no postal code found, try to get the second part after comma
    const parts = location.address.split(',');
    if (parts.length >= 2) {
      const cityPart = parts[1].trim();
      // Remove postal code if present at the start
      const cityWithoutPostal = cityPart.replace(/^\d{5}\s*/, '');
      if (cityWithoutPostal) {
        return cityWithoutPostal;
      }
    }
  }
  
  // Fallback to location name
  return location.name;
};

export function TripCard({ trip, vehicle, onDelete, showDelete = false }: TripCardProps) {
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

  const startCityName = extractCityName(trip.startLocation);
  const endCityName = extractCityName(trip.endLocation);

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
        <span className="counter-text text-lg font-semibold">{trip.distance.toFixed(1)} km</span>
        <span className="counter-text text-lg font-bold text-accent">
          +{trip.ikAmount.toFixed(2)} €
        </span>
      </div>
    </div>
  );
}
