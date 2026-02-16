import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Trip, Vehicle } from '@/types/trip';
import { MapPin, ArrowRight, Calendar, Clock, Truck, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractCityFromAddress } from '@/lib/geocoding';

interface TripViewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
  vehicle?: Vehicle;
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

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function TripViewSheet({ open, onOpenChange, trip, vehicle }: TripViewSheetProps) {
  if (!trip) return null;

  const startCityName = getDisplayName(trip.startLocation);
  const endCityName = getDisplayName(trip.endLocation);
  const isTour = trip.purpose === 'Tournée' && trip.tourStops && trip.tourStops.length >= 3;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="!inset-auto !fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 h-auto max-h-[85vh] rounded-2xl border w-[calc(100%-2rem)] max-w-lg overflow-y-auto z-50">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            {isTour ? (
              <>
                <Truck className="w-5 h-5 text-primary" />
                Tournée
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5 text-primary" />
                Détails du trajet
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Départ et Arrivée côte à côte */}
          <div className="grid grid-cols-2 gap-3">
            {/* Départ */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Départ
              </div>
              <p className="font-semibold text-foreground">{startCityName}</p>
              {trip.startLocation.address && trip.startLocation.address !== startCityName && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {trip.startLocation.address}
                </p>
              )}
            </div>

            {/* Arrivée */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                Arrivée
              </div>
              <p className="font-semibold text-foreground">{endCityName}</p>
              {trip.endLocation.address && trip.endLocation.address !== endCityName && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {trip.endLocation.address}
                </p>
              )}
            </div>
          </div>

          {/* Date et heure */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{formatDate(trip.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatTime(trip.startTime)}</span>
            </div>
          </div>

          {/* Distance et IK */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{trip.distance.toFixed(1)} km</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Indemnité</p>
                <p className="text-2xl font-bold text-accent tabular-nums">+{trip.ikAmount.toFixed(2)} €</p>
              </div>
            </div>
            {trip.roundTrip && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <ArrowRight className="w-3 h-3" />
                <ArrowRight className="w-3 h-3 rotate-180" />
                Aller-retour inclus
              </p>
            )}
          </div>

          {/* Motif si présent */}
          {trip.purpose && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Motif</p>
              <p className="text-sm text-foreground">{trip.purpose}</p>
            </div>
          )}

          {/* Étapes de tournée */}
          {isTour && trip.tourStops && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {trip.tourStops.length} étapes
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {trip.tourStops.map((stop, index) => (
                  <div key={stop.id || index} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{stop.city || stop.address || 'Étape'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Véhicule avec immatriculation - tout en bas */}
          {vehicle && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Car className="w-5 h-5 text-muted-foreground" />
                  </div>
                <div>
                    <p className="font-medium text-foreground">
                      {vehicle.make && vehicle.model 
                        ? `${vehicle.make} ${vehicle.model}` 
                        : `${vehicle.fiscalPower} CV`}
                    </p>
                    <p className="text-xs text-muted-foreground">{vehicle.fiscalPower} CV</p>
                  </div>
                </div>
                {vehicle.licensePlate && (
                  <div className="bg-foreground text-background px-3 py-1.5 rounded-md font-mono text-sm font-bold tracking-wider">
                    {vehicle.licensePlate}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
