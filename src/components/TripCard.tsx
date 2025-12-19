import { useState, memo } from 'react';
import { Trip, Vehicle } from '@/types/trip';
import { MapPin, ArrowRight, X, Pencil, Truck, ChevronRight, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { extractCityFromAddress } from '@/lib/geocoding';
import { usePreferences } from '@/hooks/usePreferences';
import { TourDetailSheet } from './TourDetailSheet';

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

export const TripCard = memo(function TripCard({ trip, vehicle, onDelete, onEdit, showDelete = false }: TripCardProps) {
  const { preferences } = usePreferences();
  const [showTourDetail, setShowTourDetail] = useState(false);
  
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
  // Une tournée doit avoir minimum 3 stops (villes), sinon c'est un trajet simple
  const isTour = trip.purpose === 'Tournée' && trip.tourStops && trip.tourStops.length >= 3;

  const handleCardClick = () => {
    if (isTour) {
      setShowTourDetail(true);
    }
  };

  return (
    <>
      <div 
        className={cn(
          "bg-card rounded-md p-3 shadow-sm border border-border/50 animate-fade-in relative",
          isTour && "cursor-pointer hover:bg-muted/50 transition-colors"
        )}
        onClick={handleCardClick}
      >
        {/* Tour icon badge */}
        {isTour && (
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full shadow-sm border border-border/50 flex items-center justify-center">
            <Truck className="w-3.5 h-3.5 text-primary" />
          </div>
        )}

        {/* Ligne 1: Date | Tournée ou Départ → Arrivée | Bouton edit */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <span>{formatDate(trip.startTime)}</span>
            {preferences.showTripTime && (
              <span className="text-muted-foreground/70">
                {formatTime(trip.startTime)}
              </span>
            )}
          </div>
          
          
          {isTour ? (
            // Tour display: "Tournée (X étapes)"
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Truck className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium text-sm">Tournée</span>
              <span className="text-xs text-muted-foreground">
                ({trip.tourStops!.length} étapes)
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
            </div>
          ) : (
            // Regular trip display: Départ → Arrivée
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
              <MapPin className={cn("w-3.5 h-3.5 shrink-0", getLocationIcon(trip.startLocation.type))} />
              <span className="font-medium text-sm truncate">{startCityName}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <MapPin className={cn("w-3.5 h-3.5 shrink-0", getLocationIcon(trip.endLocation.type))} />
              <span className="font-medium text-sm truncate">{endCityName}</span>
            </div>
          )}
          
          {/* Calendar icon if trip is from calendar event */}
          {trip.calendarEventId && (
            <Calendar className="w-4 h-4 text-primary shrink-0" />
          )}
          {onEdit && !isTour && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-transparent shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(trip);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Motif masqué dans l'aperçu - visible uniquement en mode édition */}

        {/* Ligne 3: Distance + IK + Badge véhicule manquant + Bouton supprimer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <span className="counter-text text-sm font-semibold">{trip.distance.toFixed(1)} km</span>
            <span className="counter-text text-sm font-bold text-accent">
              +{trip.ikAmount.toFixed(2)} €
            </span>
            {!vehicle && !trip.vehicleId && (
              <span className="inline-flex items-center gap-1 text-xs text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3" />
                <span>Sans véhicule</span>
              </span>
            )}
          </div>
          {showDelete && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(trip.id);
              }}
            >
              <X className="w-1 h-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Tour detail sheet */}
      {isTour && (
        <TourDetailSheet
          open={showTourDetail}
          onOpenChange={setShowTourDetail}
          stops={trip.tourStops!}
          totalDistance={trip.distance}
          date={trip.startTime}
        />
      )}
    </>
  );
});
