import { useState, memo } from 'react';
import { Trip, Vehicle, Location } from '@/types/trip';
import { MapPin, ArrowRight, X, Pencil, Truck, ChevronRight, Calendar, AlertTriangle, MapPinOff } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { extractCityFromAddress } from '@/lib/geocoding';
import { TourDetailSheet } from './TourDetailSheet';
import { CompleteAddressSheet } from './CompleteAddressSheet';
import { TripViewSheet } from './TripViewSheet';

interface TripCardProps {
  trip: Trip;
  vehicle?: Vehicle;
  onDelete?: (id: string) => void;
  onEdit?: (trip: Trip) => void;
  showDelete?: boolean;
  savedLocations?: Location[];
  onTripUpdated?: () => void;
  showTripTime?: boolean;
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

export const TripCard = memo(function TripCard({ 
  trip, 
  vehicle, 
  onDelete, 
  onEdit, 
  showDelete = false,
  savedLocations = [],
  onTripUpdated,
  showTripTime = true,
}: TripCardProps) {
  const [showTourDetail, setShowTourDetail] = useState(false);
  const [showCompleteAddress, setShowCompleteAddress] = useState(false);
  const [showTripView, setShowTripView] = useState(false);
  
  const isPending = trip.status === 'pending_location';
  
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

  // Check if time is meaningful (not a timezone artifact or default value)
  const hasRealTime = (date: Date) => {
    const d = new Date(date);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    // Only show time if minutes are non-zero, or if it's a "real" hour (not midnight/1AM/2AM which are timezone artifacts)
    // A real time typically has non-zero minutes or is during normal business hours with intent
    if (minutes !== 0) return true;
    // Hours 0, 1, 2 at :00 are almost always timezone conversion artifacts from date-only storage
    if (hours <= 2) return false;
    // For other round hours, we can't be 100% sure, but they're more likely real if during work hours
    return true;
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
    if (isPending) return; // Pending trips have their own action
    if (isTour) {
      setShowTourDetail(true);
    } else {
      setShowTripView(true);
    }
  };

  return (
    <>
      <div 
        className={cn(
          "bg-card rounded-md p-3 shadow-sm border animate-fade-in relative cursor-pointer hover:bg-muted/50 transition-colors",
          isPending 
            ? "border-violet-500/50 bg-violet-600 text-white cursor-default hover:bg-violet-600" 
            : "border-border/50"
        )}
        onClick={handleCardClick}
      >
        {/* Pending location badge */}
        {isPending && (
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-violet-400 rounded-full shadow-sm flex items-center justify-center border-2 border-white">
            <MapPinOff className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        
        {/* Tour icon badge */}
        {isTour && !isPending && (
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full shadow-sm border border-border/50 flex items-center justify-center">
            <Truck className="w-3.5 h-3.5 text-primary" />
          </div>
        )}

        {/* Ligne 1: Date | Tournée ou Départ → Arrivée | Bouton edit */}
        <div className="flex items-center gap-3 mb-2">
          <div className={cn(
            "flex items-center gap-1.5 text-xs shrink-0",
            isPending ? "text-white/80" : "text-muted-foreground"
          )}>
            <span>{formatDate(trip.startTime)}</span>
            {showTripTime && hasRealTime(trip.startTime) && (
              <span className={isPending ? "text-white/60" : "text-muted-foreground/70"}>
                {formatTime(trip.startTime)}
              </span>
            )}
          </div>
          
          
          {isTour ? (
            // Tour display: "Tournée (X étapes)"
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Truck className={cn("w-4 h-4 shrink-0", isPending ? "text-white" : "text-primary")} />
              <span className="font-medium text-sm">Tournée</span>
              <span className={cn("text-xs", isPending ? "text-white/70" : "text-muted-foreground")}>
                ({trip.tourStops!.length} étapes)
              </span>
              <ChevronRight className={cn("w-4 h-4 ml-auto shrink-0", isPending ? "text-white/70" : "text-muted-foreground")} />
            </div>
          ) : (
            // Regular trip display: Départ → Arrivée
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
              <MapPin className={cn("w-3.5 h-3.5 shrink-0", isPending ? "text-white" : getLocationIcon(trip.startLocation.type))} />
              <span className="font-medium text-sm truncate">{startCityName}</span>
              <ArrowRight className={cn("w-3.5 h-3.5 shrink-0", isPending ? "text-white/70" : "text-muted-foreground")} />
              <MapPin className={cn("w-3.5 h-3.5 shrink-0", isPending ? "text-white" : getLocationIcon(trip.endLocation.type))} />
              <span className="font-medium text-sm truncate">{endCityName}</span>
            </div>
          )}
          
          {/* Calendar icon if trip is from calendar event */}
          {trip.calendarEventId && (
            <Calendar className={cn("w-4 h-4 shrink-0", isPending ? "text-white" : "text-primary")} />
          )}
          {onEdit && !isTour && !isPending && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-transparent shrink-0 text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(trip);
              }}
              aria-label="Modifier le trajet"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Motif masqué dans l'aperçu - visible uniquement en mode édition */}

        {/* Ligne 3: Distance + IK or Pending action */}
        <div className="flex items-center justify-between pt-2">
          {isPending ? (
            <Button
              size="sm"
              className="text-xs h-7 px-2.5 bg-violet-500 hover:bg-violet-600 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setShowCompleteAddress(true);
              }}
            >
              Compléter
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              {/* Use tabular-nums and min-width for stable layout during number changes */}
              <span className="counter-text text-sm font-semibold tabular-nums min-w-[55px]">{trip.distance.toFixed(1)} km</span>
              <span className="counter-text text-sm font-bold text-accent tabular-nums min-w-[65px]">
                +{trip.ikAmount.toFixed(2)} €
              </span>
              {!vehicle && !trip.vehicleId && (
                <span className="inline-flex items-center gap-1 text-xs text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Sans véhicule</span>
                </span>
              )}
            </div>
          )}
          {showDelete && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(trip.id);
              }}
              aria-label="Supprimer le trajet"
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

      {/* Complete address sheet */}
      {isPending && (
        <CompleteAddressSheet
          open={showCompleteAddress}
          onOpenChange={setShowCompleteAddress}
          trip={trip}
          savedLocations={savedLocations}
          onCompleted={() => onTripUpdated?.()}
        />
      )}

      {/* Trip view sheet for regular trips */}
      <TripViewSheet
        open={showTripView}
        onOpenChange={setShowTripView}
        trip={trip}
        vehicle={vehicle}
      />
    </>
  );
});
