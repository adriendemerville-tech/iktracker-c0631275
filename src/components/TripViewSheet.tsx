import { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Trip, Vehicle } from '@/types/trip';
import { MapPin, ArrowRight, Calendar, Clock, Truck, Car, Plus, X, Loader2 } from 'lucide-react';
import { extractCityFromAddress, geocodeAddress } from '@/lib/geocoding';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { AddressSuggestion } from '@/hooks/useAddressAutocomplete';
import { Button } from './ui/button';
import { useTrips } from '@/hooks/useTrips';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { calculateDrivingMatrix, optimizeStopOrder } from '@/lib/distance';
import { useToast } from '@/hooks/use-toast';
import type { TourStopData } from '@/types/trip';

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

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatTime = (date: Date) =>
  new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

interface ViaStop {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export function TripViewSheet({ open, onOpenChange, trip, vehicle }: TripViewSheetProps) {
  const { updateTrip } = useTrips();
  useGoogleMaps();
  const { toast } = useToast();
  const [viaStops, setViaStops] = useState<ViaStop[]>([]);
  const [showAdder, setShowAdder] = useState(false);
  const [adderValue, setAdderValue] = useState('');
  const [isRecalc, setIsRecalc] = useState(false);
  const [localDistance, setLocalDistance] = useState<number | null>(null);
  const [localIk, setLocalIk] = useState<number | null>(null);

  const displayTrip = trip;
  const displayDistance = localDistance ?? displayTrip?.distance ?? 0;
  const displayIk = localIk ?? displayTrip?.ikAmount ?? 0;

  const startCityName = useMemo(() => (displayTrip ? getDisplayName(displayTrip.startLocation) : ''), [displayTrip]);
  const endCityName = useMemo(() => (displayTrip ? getDisplayName(displayTrip.endLocation) : ''), [displayTrip]);

  // Hydrate viaStops from persisted tourStops (intermediates only) when opening
  useEffect(() => {
    if (!open || !displayTrip) return;
    const stops = displayTrip.tourStops;
    if (stops && stops.length >= 3) {
      const intermediates = stops.slice(1, -1).map((s: any) => ({
        id: s.id || crypto.randomUUID(),
        label: s.address || s.city || 'Étape',
        lat: s.lat,
        lng: s.lng,
      }));
      setViaStops(intermediates);
    } else {
      setViaStops([]);
    }
    setLocalDistance(null);
    setLocalIk(null);
  }, [open, displayTrip?.id]);

  if (!displayTrip) return null;

  const isTour = (displayTrip.tourStops && displayTrip.tourStops.length >= 3) || viaStops.length > 0;

  const handleReset = () => {
    setViaStops([]);
    setShowAdder(false);
    setAdderValue('');
    setLocalDistance(null);
    setLocalIk(null);
  };

  const handleClose = (o: boolean) => {
    if (!o) handleReset();
    onOpenChange(o);
  };

  const recomputeAndSave = async (nextStops: ViaStop[]) => {
    if (!displayTrip) return;
    setIsRecalc(true);
    try {
      // Resolve start / end coordinates
      let startLat = displayTrip.startLocation.lat;
      let startLng = displayTrip.startLocation.lng;
      let endLat = displayTrip.endLocation.lat;
      let endLng = displayTrip.endLocation.lng;

      if (startLat == null || startLng == null) {
        const g = await geocodeAddress(displayTrip.startLocation.address || displayTrip.startLocation.name);
        if (g) { startLat = g.lat; startLng = g.lng; }
      }
      if (endLat == null || endLng == null) {
        const g = await geocodeAddress(displayTrip.endLocation.address || displayTrip.endLocation.name);
        if (g) { endLat = g.lat; endLng = g.lng; }
      }
      if (startLat == null || endLat == null) {
        toast({ title: 'Adresses non géocodables', description: "Impossible de recalculer la distance.", variant: 'destructive' });
        setIsRecalc(false);
        return;
      }

      const points = [
        { lat: startLat!, lng: startLng! },
        ...nextStops.map(s => ({ lat: s.lat, lng: s.lng })),
        { lat: endLat!, lng: endLng! },
      ];

      const matrix = await calculateDrivingMatrix(points);
      const order = optimizeStopOrder(matrix); // intermediate indices in optimized order
      const sequence = [0, ...order, points.length - 1];
      let totalKm = 0;
      for (let i = 0; i < sequence.length - 1; i++) {
        totalKm += matrix[sequence[i]][sequence[i + 1]].distanceKm;
      }
      if (displayTrip.roundTrip) totalKm *= 2;
      totalKm = Math.round(totalKm * 10) / 10;

      const optimizedIntermediates = order.map(i => nextStops[i - 1]);

      // Clean any previous "Tournée · Via: …" or trailing "Via: …" segments
      const cleanedBase = (displayTrip.purpose || '')
        .replace(/\s*·?\s*Via:.*$/i, '')
        .replace(/^\s*Tournée\s*·?\s*/i, '')
        .trim();

      let newPurpose: string | null;
      let tourStops: TourStopData[] | [];

      if (optimizedIntermediates.length === 0) {
        // Devient un simple trajet
        tourStops = [];
        newPurpose = cleanedBase || null;
      } else {
        const viaText = optimizedIntermediates.map(s => s.label.split(',')[0]).join(' → ');
        newPurpose = `${cleanedBase ? cleanedBase + ' · ' : 'Tournée · '}Via: ${viaText}`;
        tourStops = [
          {
            id: 'start',
            timestamp: new Date(displayTrip.startTime).toISOString(),
            lat: startLat!,
            lng: startLng!,
            address: displayTrip.startLocation.address || displayTrip.startLocation.name,
            city: startCityName,
          },
          ...optimizedIntermediates.map(s => ({
            id: s.id,
            timestamp: new Date(displayTrip.startTime).toISOString(),
            lat: s.lat,
            lng: s.lng,
            address: s.label,
            city: s.label,
          })),
          {
            id: 'end',
            timestamp: new Date(displayTrip.startTime).toISOString(),
            lat: endLat!,
            lng: endLng!,
            address: displayTrip.endLocation.address || displayTrip.endLocation.name,
            city: endCityName,
          },
        ];
      }

      const updated = await updateTrip(displayTrip.id, {
        distance: totalKm,
        purpose: newPurpose ?? '',
        tourStops: tourStops as TourStopData[],
      });

      if (updated) {
        setLocalDistance(updated.distance);
        setLocalIk(updated.ikAmount);
        if (nextStops.length === 0) {
          toast({ title: 'Étape supprimée', description: `Trajet simple · ${totalKm.toFixed(1)} km` });
        } else {
          toast({ title: 'Tournée mise à jour', description: `${nextStops.length} étape${nextStops.length > 1 ? 's' : ''} · ${totalKm.toFixed(1)} km` });
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', description: 'Recalcul impossible.', variant: 'destructive' });
    } finally {
      setIsRecalc(false);
    }
  };

  const handleAddStop = async (s: AddressSuggestion) => {
    if (!s.lat || !s.lng) {
      // Try to geocode from fulltext
      const g = await geocodeAddress(s.fulltext);
      if (!g) {
        toast({ title: 'Adresse invalide', description: 'Impossible de géocoder cette étape.', variant: 'destructive' });
        return;
      }
      s = { ...s, lat: g.lat, lng: g.lng };
    }
    const next = [...viaStops, { id: crypto.randomUUID(), label: s.fulltext, lat: s.lat, lng: s.lng }];
    setViaStops(next);
    setAdderValue('');
    setShowAdder(false);
    await recomputeAndSave(next);
  };

  const handleRemoveStop = async (id: string) => {
    const next = viaStops.filter(v => v.id !== id);
    setViaStops(next);
    await recomputeAndSave(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="!inset-auto !fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 h-auto max-h-[90vh] rounded-2xl border w-[calc(100%-2rem)] max-w-lg sm:max-w-[38rem] overflow-y-auto z-50"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            {isTour || viaStops.length > 0 ? (
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
          {/* Départ / + / Arrivée */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Départ
              </div>
              <p className="font-semibold text-foreground">{startCityName}</p>
              {displayTrip.startLocation.address && displayTrip.startLocation.address !== startCityName && (
                <p className="text-xs text-muted-foreground line-clamp-2">{displayTrip.startLocation.address}</p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowAdder(v => !v)}
                disabled={isRecalc}
                title="Ajouter une étape intermédiaire"
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {isRecalc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                Arrivée
              </div>
              <p className="font-semibold text-foreground">{endCityName}</p>
              {displayTrip.endLocation.address && displayTrip.endLocation.address !== endCityName && (
                <p className="text-xs text-muted-foreground line-clamp-2">{displayTrip.endLocation.address}</p>
              )}
            </div>
          </div>

          {/* Add stop input */}
          {showAdder && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Nouvelle étape intermédiaire
              </p>
              <AddressAutocompleteInput
                value={adderValue}
                onChange={setAdderValue}
                onSelect={handleAddStop}
                placeholder="Rechercher une adresse..."
                disabled={isRecalc}
              />
            </div>
          )}

          {/* Existing intermediate stops */}
          {viaStops.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Étapes intermédiaires ({viaStops.length})
              </p>
              <div className="space-y-1.5">
                {viaStops.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground flex-1 truncate">{s.label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(s.id)}
                      disabled={isRecalc}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      title="Retirer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date et heure */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{formatDate(displayTrip.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatTime(displayTrip.startTime)}</span>
            </div>
          </div>

          {/* Distance et IK */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{displayDistance.toFixed(1)} km</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Indemnité</p>
                <p className="text-2xl font-bold text-accent tabular-nums">+{displayIk.toFixed(2)} €</p>
              </div>
            </div>
            {displayTrip.roundTrip && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <ArrowRight className="w-3 h-3" />
                <ArrowRight className="w-3 h-3 rotate-180" />
                Aller-retour inclus
              </p>
            )}
          </div>

          {displayTrip.purpose && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Motif</p>
              <p className="text-sm text-foreground">{displayTrip.purpose}</p>
            </div>
          )}

          {isTour && displayTrip.tourStops && viaStops.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {displayTrip.tourStops.length} étapes
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {displayTrip.tourStops.map((stop, index) => (
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

          {vehicle && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Car className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : `${vehicle.fiscalPower} CV`}
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
