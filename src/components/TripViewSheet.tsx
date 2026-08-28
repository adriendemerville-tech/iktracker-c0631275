import { useState, useMemo, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Trip, Vehicle } from "@/types/trip";
import {
  MapPin,
  ArrowRight,
  Calendar,
  Clock,
  Truck,
  Car,
  Plus,
  X,
  Loader2,
  Pencil,
  ArrowUp,
  ArrowDown,
  Check,
} from "lucide-react";
import { extractCityFromAddress, geocodeAddress } from "@/lib/geocoding";
import { AddressAutocompleteInput } from "./AddressAutocompleteInput";
import { AddressSuggestion } from "@/hooks/useAddressAutocomplete";

import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { calculateDrivingMatrix, optimizeStopOrder } from "@/lib/distance";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { TourStopData } from "@/types/trip";

interface TripViewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
  vehicle?: Vehicle;
  // Fourni par la page parente (qui monte déjà useTrips) : évite un useTrips()
  // par TripCard, soit 2 requêtes trips par carte affichée.
  updateTrip: (id: string, updates: Partial<Omit<Trip, "id">>) => Promise<Trip | null>;
}

const getDisplayName = (location: { name: string; address?: string }): string => {
  if (location.address) {
    const city = extractCityFromAddress(location.address);
    if (city && city !== location.address) return city;
  }
  return location.name;
};

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const formatTime = (date: Date) =>
  new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

interface ViaStop {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

type EditTarget = null | "start" | "end" | { kind: "stop"; id: string };

export function TripViewSheet({ open, onOpenChange, trip, vehicle, updateTrip }: TripViewSheetProps) {
  useGoogleMaps();
  const { toast } = useToast();
  const [viaStops, setViaStops] = useState<ViaStop[]>([]);
  const [showAdder, setShowAdder] = useState(false);
  const [adderValue, setAdderValue] = useState("");
  const [isRecalc, setIsRecalc] = useState(false);
  const [localDistance, setLocalDistance] = useState<number | null>(null);
  const [localIk, setLocalIk] = useState<number | null>(null);
  const [editing, setEditing] = useState<EditTarget>(null);
  const [editValue, setEditValue] = useState("");

  // Local editable copies of start/end (persist immediately on save)
  const [startOverride, setStartOverride] = useState<{
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  } | null>(null);
  const [endOverride, setEndOverride] = useState<{
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  } | null>(null);

  const displayTrip = trip;
  const displayDistance = localDistance ?? displayTrip?.distance ?? 0;
  const displayIk = localIk ?? displayTrip?.ikAmount ?? 0;
  const startLoc = startOverride ?? displayTrip?.startLocation;
  const endLoc = endOverride ?? displayTrip?.endLocation;

  const startCityName = useMemo(() => (startLoc ? getDisplayName(startLoc) : ""), [startLoc]);
  const endCityName = useMemo(() => (endLoc ? getDisplayName(endLoc) : ""), [endLoc]);

  useEffect(() => {
    if (!open || !displayTrip) return;
    const stops = displayTrip.tourStops;
    if (stops && stops.length >= 3) {
      setViaStops(
        stops.slice(1, -1).map((s: any) => ({
          id: s.id || crypto.randomUUID(),
          label: s.address || s.city || "Étape",
          lat: s.lat,
          lng: s.lng,
        })),
      );
    } else {
      setViaStops([]);
    }
    setLocalDistance(null);
    setLocalIk(null);
    setStartOverride(null);
    setEndOverride(null);
    setEditing(null);
    setShowAdder(false);
    setAdderValue("");
  }, [open, displayTrip?.id]);

  if (!displayTrip) return null;

  const isTour =
    (displayTrip.tourStops && displayTrip.tourStops.length >= 3) || viaStops.length > 0;

  const handleClose = (o: boolean) => {
    if (!o) {
      setViaStops([]);
      setShowAdder(false);
      setAdderValue("");
      setLocalDistance(null);
      setLocalIk(null);
      setStartOverride(null);
      setEndOverride(null);
      setEditing(null);
    }
    onOpenChange(o);
  };

  const resolveCoords = async (loc: {
    address?: string;
    name: string;
    lat?: number;
    lng?: number;
  }) => {
    if (loc.lat != null && loc.lng != null) return { lat: loc.lat, lng: loc.lng };
    const g = await geocodeAddress(loc.address || loc.name);
    return g ? { lat: g.lat, lng: g.lng } : null;
  };

  const recomputeAndSave = async (
    nextStops: ViaStop[],
    opts?: {
      convertLoop?: boolean;
      startOverrideLoc?: typeof startOverride;
      endOverrideLoc?: typeof endOverride;
    },
  ) => {
    if (!displayTrip) return;
    setIsRecalc(true);
    try {
      const effStart = opts?.startOverrideLoc ?? startOverride ?? displayTrip.startLocation;
      const effEnd = opts?.endOverrideLoc ?? endOverride ?? displayTrip.endLocation;

      const sC = await resolveCoords(effStart);
      const eC = await resolveCoords(effEnd);
      if (!sC || !eC) {
        toast({
          title: "Adresses non géocodables",
          description: "Impossible de recalculer la distance.",
          variant: "destructive",
        });
        setIsRecalc(false);
        return;
      }

      const finalEndLat = opts?.convertLoop ? sC.lat : eC.lat;
      const finalEndLng = opts?.convertLoop ? sC.lng : eC.lng;
      const finalEndAddress = opts?.convertLoop
        ? effStart.address || effStart.name
        : effEnd.address || effEnd.name;
      const finalEndName = opts?.convertLoop ? effStart.name : effEnd.name;
      const finalEndCity = opts?.convertLoop ? getDisplayName(effStart) : getDisplayName(effEnd);
      const finalRoundTrip = opts?.convertLoop ? false : displayTrip.roundTrip;

      const points = [
        { lat: sC.lat, lng: sC.lng },
        ...nextStops.map((s) => ({ lat: s.lat, lng: s.lng })),
        { lat: finalEndLat, lng: finalEndLng },
      ];

      const matrix = await calculateDrivingMatrix(points);
      // Preserve user order — do NOT re-optimize; recompute total following the given sequence.
      let totalKm = 0;
      for (let i = 0; i < points.length - 1; i++) {
        totalKm += matrix[i][i + 1].distanceKm;
      }
      if (finalRoundTrip) totalKm *= 2;
      totalKm = Math.round(totalKm * 10) / 10;

      const cleanedBase = (displayTrip.purpose || "")
        .replace(/\s*·?\s*Via:.*$/i, "")
        .replace(/^\s*Tournée\s*·?\s*/i, "")
        .trim();

      let newPurpose: string | null;
      let tourStops: TourStopData[] | [];

      if (nextStops.length === 0) {
        tourStops = [];
        newPurpose = cleanedBase || null;
      } else {
        const viaText = nextStops.map((s) => s.label.split(",")[0]).join(" → ");
        newPurpose = `${cleanedBase ? cleanedBase + " · " : "Tournée · "}Via: ${viaText}`;
        tourStops = [
          {
            id: "start",
            timestamp: new Date(displayTrip.startTime).toISOString(),
            lat: sC.lat,
            lng: sC.lng,
            address: effStart.address || effStart.name,
            city: getDisplayName(effStart),
          },
          ...nextStops.map((s) => ({
            id: s.id,
            timestamp: new Date(displayTrip.startTime).toISOString(),
            lat: s.lat,
            lng: s.lng,
            address: s.label,
            city: s.label,
          })),
          {
            id: "end",
            timestamp: new Date(displayTrip.startTime).toISOString(),
            lat: finalEndLat,
            lng: finalEndLng,
            address: finalEndAddress,
            city: finalEndCity,
          },
        ];
      }

      const updates: any = {
        distance: totalKm,
        purpose: newPurpose ?? "",
        tourStops: tourStops as TourStopData[],
      };
      if (opts?.startOverrideLoc) {
        updates.startLocation = {
          name: effStart.name,
          address: effStart.address,
          lat: sC.lat,
          lng: sC.lng,
        };
      }
      if (opts?.convertLoop) {
        updates.endLocation = {
          name: finalEndName,
          address: finalEndAddress,
          lat: finalEndLat,
          lng: finalEndLng,
        };
        updates.roundTrip = false;
      } else if (opts?.endOverrideLoc) {
        updates.endLocation = {
          name: effEnd.name,
          address: effEnd.address,
          lat: eC.lat,
          lng: eC.lng,
        };
      }

      const updated = await updateTrip(displayTrip.id, updates);
      if (updated) {
        setLocalDistance(updated.distance);
        setLocalIk(updated.ikAmount);
        toast({ title: "Trajet mis à jour", description: `${totalKm.toFixed(1)} km` });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Recalcul impossible.", variant: "destructive" });
    } finally {
      setIsRecalc(false);
    }
  };

  const handleToggleRoundTrip = async () => {
    if (!displayTrip || isRecalc) return;
    const next = !displayTrip.roundTrip;
    setIsRecalc(true);
    try {
      const base = displayDistance;
      const newDistance = Math.round((next ? base * 2 : base / 2) * 10) / 10;
      const updated = await updateTrip(displayTrip.id, {
        roundTrip: next,
        distance: newDistance,
      } as Partial<Omit<Trip, "id">>);
      if (updated) {
        setLocalDistance(updated.distance);
        setLocalIk(updated.ikAmount);
        toast({
          title: next ? "Aller-retour activé" : "Aller simple",
          description: `${newDistance.toFixed(1)} km`,
        });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Mise à jour impossible.", variant: "destructive" });
    } finally {
      setIsRecalc(false);
    }
  };

  const handleAddStop = async (s: AddressSuggestion) => {
    if (!displayTrip) return;
    if (!s.lat || !s.lng) {
      const g = await geocodeAddress(s.fulltext);
      if (!g) {
        toast({
          title: "Adresse invalide",
          description: "Impossible de géocoder cette étape.",
          variant: "destructive",
        });
        return;
      }
      s = { ...s, lat: g.lat, lng: g.lng };
    }
    const newStop: ViaStop = {
      id: crypto.randomUUID(),
      label: s.fulltext,
      lat: s.lat!,
      lng: s.lng!,
    };
    const shouldConvertLoop = viaStops.length === 0 && !!displayTrip.roundTrip;

    let next: ViaStop[];
    if (shouldConvertLoop) {
      const g = await resolveCoords(displayTrip.endLocation);
      if (!g) {
        toast({
          title: "Conversion impossible",
          description: "Ancienne destination non géocodable.",
          variant: "destructive",
        });
        return;
      }
      const oldDest: ViaStop = {
        id: crypto.randomUUID(),
        label: displayTrip.endLocation.address || displayTrip.endLocation.name,
        lat: g.lat,
        lng: g.lng,
      };
      next = [oldDest, newStop];
    } else {
      next = [...viaStops, newStop];
    }

    setViaStops(next);
    setAdderValue("");
    setShowAdder(false);
    await recomputeAndSave(next, { convertLoop: shouldConvertLoop });
  };

  const handleRemoveStop = async (id: string) => {
    const next = viaStops.filter((v) => v.id !== id);
    setViaStops(next);
    await recomputeAndSave(next);
  };

  const handleMoveStop = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= viaStops.length) return;
    const next = [...viaStops];
    [next[index], next[j]] = [next[j], next[index]];
    setViaStops(next);
    await recomputeAndSave(next);
  };

  const handleReplaceEndpoint = async (target: "start" | "end", s: AddressSuggestion) => {
    if (!s.lat || !s.lng) {
      const g = await geocodeAddress(s.fulltext);
      if (!g) {
        toast({ title: "Adresse invalide", variant: "destructive" });
        return;
      }
      s = { ...s, lat: g.lat, lng: g.lng };
    }
    const newLoc = {
      name: s.fulltext,
      address: s.fulltext,
      lat: s.lat!,
      lng: s.lng!,
    };
    if (target === "start") {
      setStartOverride(newLoc);
      await recomputeAndSave(viaStops, { startOverrideLoc: newLoc });
    } else {
      setEndOverride(newLoc);
      await recomputeAndSave(viaStops, { endOverrideLoc: newLoc });
    }
    setEditing(null);
  };

  const handleReplaceStop = async (id: string, s: AddressSuggestion) => {
    if (!s.lat || !s.lng) {
      const g = await geocodeAddress(s.fulltext);
      if (!g) {
        toast({ title: "Adresse invalide", variant: "destructive" });
        return;
      }
      s = { ...s, lat: g.lat, lng: g.lng };
    }
    const next = viaStops.map((v) =>
      v.id === id ? { ...v, label: s.fulltext, lat: s.lat!, lng: s.lng! } : v,
    );
    setViaStops(next);
    setEditing(null);
    await recomputeAndSave(next);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        {/* Subtle floating overlay — click outside dismisses, but no heavy dark scrim */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/40 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-[calc(100%-2rem)] max-w-lg sm:max-w-[38rem] max-h-[85vh] overflow-y-auto",
            "rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl",
            "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]",
            "p-6 focus:outline-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4">
            <div className="flex items-center gap-2">
              {isTour ? (
                <>
                  <Truck className="w-5 h-5 text-primary" />
                  <DialogPrimitive.Title className="text-lg font-semibold">
                    Tournée
                  </DialogPrimitive.Title>
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5 text-primary" />
                  <DialogPrimitive.Title className="text-lg font-semibold">
                    Détails du trajet
                  </DialogPrimitive.Title>
                </>
              )}
            </div>
            <DialogPrimitive.Close className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="space-y-5">
            {/* Départ / + / Arrivée */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
              {/* Départ */}
              <div className="group relative bg-muted/50 rounded-xl p-4 space-y-2 hover:ring-1 hover:ring-ring/60 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Départ
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing("start");
                      setEditValue(startLoc?.address || startLoc?.name || "");
                    }}
                    disabled={isRecalc}
                    className="opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    title="Modifier"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                {editing === "start" ? (
                  <AddressAutocompleteInput
                    value={editValue}
                    onChange={setEditValue}
                    onSelect={(s) => handleReplaceEndpoint("start", s)}
                    placeholder="Nouvelle adresse de départ..."
                    disabled={isRecalc}
                  />
                ) : (
                  <>
                    <p className="font-semibold text-foreground">{startCityName}</p>
                    {startLoc?.address && startLoc.address !== startCityName && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {startLoc.address}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShowAdder((v) => !v)}
                  disabled={isRecalc}
                  title="Ajouter une étape intermédiaire"
                  aria-label="Ajouter une étape intermédiaire"
                  className="w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-md hover:shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 hover:ring-2 hover:ring-ring/50 disabled:opacity-50"
                >
                  {isRecalc ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Arrivée */}
              <div className="group relative bg-muted/50 rounded-xl p-4 space-y-2 hover:ring-1 hover:ring-ring/60 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    <MapPin className="w-3.5 h-3.5 text-accent" />
                    Arrivée
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing("end");
                      setEditValue(endLoc?.address || endLoc?.name || "");
                    }}
                    disabled={isRecalc}
                    className="opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    title="Modifier"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                {editing === "end" ? (
                  <AddressAutocompleteInput
                    value={editValue}
                    onChange={setEditValue}
                    onSelect={(s) => handleReplaceEndpoint("end", s)}
                    placeholder="Nouvelle adresse d'arrivée..."
                    disabled={isRecalc}
                  />
                ) : (
                  <>
                    <p className="font-semibold text-foreground">{endCityName}</p>
                    {endLoc?.address && endLoc.address !== endCityName && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{endLoc.address}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Add new stop */}
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

            {/* Intermediate stops with reorder */}
            {viaStops.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Étapes intermédiaires ({viaStops.length})
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    Utilisez les flèches pour réordonner
                  </p>
                </div>
                <div className="space-y-1.5">
                  {viaStops.map((s, i) => {
                    const isEditing =
                      typeof editing === "object" &&
                      editing?.kind === "stop" &&
                      editing.id === s.id;
                    return (
                      <div
                        key={s.id}
                        className="group flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 hover:ring-1 hover:ring-ring/30 transition-all"
                      >
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium shrink-0">
                          {i + 1}
                        </span>
                        {isEditing ? (
                          <div className="flex-1">
                            <AddressAutocompleteInput
                              value={editValue}
                              onChange={setEditValue}
                              onSelect={(sel) => handleReplaceStop(s.id, sel)}
                              placeholder="Nouvelle adresse..."
                              disabled={isRecalc}
                            />
                          </div>
                        ) : (
                          <span
                            className="text-sm text-foreground flex-1 truncate cursor-pointer"
                            onClick={() => {
                              setEditing({ kind: "stop", id: s.id });
                              setEditValue(s.label);
                            }}
                            title="Modifier"
                          >
                            {s.label}
                          </span>
                        )}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveStop(i, -1)}
                            disabled={isRecalc || i === 0}
                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Monter"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStop(i, 1)}
                            disabled={isRecalc || i === viaStops.length - 1}
                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Descendre"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStop(s.id)}
                            disabled={isRecalc}
                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                            title="Retirer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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

            {/* Distance / IK */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Distance</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {displayDistance.toFixed(1)} km
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Indemnité</p>
                  <p className="text-2xl font-bold text-accent tabular-nums">
                    +{displayIk.toFixed(2)} €
                  </p>
                </div>
              </div>
              {isTour ? (
                displayTrip.roundTrip && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    <ArrowRight className="w-3 h-3 rotate-180" />
                    Aller-retour inclus
                  </p>
                )
              ) : (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/50 pt-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    <ArrowRight className="w-3 h-3 rotate-180" />
                    Aller-retour
                  </span>
                  <Switch
                    checked={!!displayTrip.roundTrip}
                    disabled={isRecalc}
                    onCheckedChange={handleToggleRoundTrip}
                    aria-label="Aller-retour"
                  />
                </div>
              )}
            </div>

            {displayTrip.purpose && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Motif
                </p>
                <p className="text-sm text-foreground">{displayTrip.purpose}</p>
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
