import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { reverseGeocode } from "@/lib/geocoding";
import { calculateDrivingDistance, getDistanceInKm } from "@/lib/distance";
import type { Trip, Vehicle, Location as TripLocation } from "@/types/trip";

const STORAGE_KEY = "iktracker_quick_trip";
/** Arrêt long : immobile (<100 m) pendant 7 minutes → le trajet se termine et s'enregistre seul. */
const STOP_RADIUS_M = 100;
const STOP_DURATION_MS = 7 * 60 * 1000;

interface QuickPoint {
  lat: number;
  lng: number;
  address: string;
  at: string; // horodatage ISO enregistré automatiquement
}

interface QuickTripTrackerProps {
  vehicles: Vehicle[];
  onSave: (trip: Omit<Trip, "id" | "ikAmount">) => Promise<unknown>;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error("La géolocalisation n'est pas disponible sur cet appareil"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

async function capturePoint(): Promise<QuickPoint> {
  const pos = await getPosition();
  const { latitude: lat, longitude: lng } = pos.coords;
  const geo = await reverseGeocode(lat, lng).catch(() => null);
  return {
    lat,
    lng,
    address: geo?.fullAddress || geo?.city || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    at: new Date().toISOString(),
  };
}

const toLocation = (point: QuickPoint, name: string): TripLocation => ({
  id: crypto.randomUUID(),
  name: point.address,
  address: point.address,
  lat: point.lat,
  lng: point.lng,
  type: name,
});

export const QuickTripTracker = ({ vehicles, onSave }: QuickTripTrackerProps) => {
  const [start, setStart] = useState<QuickPoint | null>(null);
  const [end, setEnd] = useState<QuickPoint | null>(null);
  const [distance, setDistance] = useState(0);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);

  // Reprise après fermeture de l'app / rechargement
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { start: QuickPoint; vehicleId: string | null };
      setStart(saved.start);
      setVehicleId(saved.vehicleId ?? null);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    setVehicleId((cur) => cur ?? vehicles[0]?.id ?? null);
  }, [vehicles]);

  const handleStart = async () => {
    setBusy(true);
    try {
      const point = await capturePoint();
      setStart(point);
      setEnd(null);
      setDistance(0);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ start: point, vehicleId }));
      toast.success("Trajet démarré", { description: `Départ à ${formatTime(point.at)}` });
    } catch (e) {
      toast.error("Position indisponible", {
        description: e instanceof Error ? e.message : "Autorisez la localisation pour démarrer.",
      });
    } finally {
      setBusy(false);
    }
  };

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStart(null);
    setEnd(null);
    setDistance(0);
    setPurpose("");
  }, []);

  const persistTrip = useCallback(
    async (startPoint: QuickPoint, endPoint: QuickPoint, km: number) => {
      const vid = vehicleRef.current;
      if (!vid) {
        toast.error("Aucun véhicule", { description: "Ajoutez un véhicule avant d’enregistrer." });
        return false;
      }
      if (km <= 0) {
        toast.error("Distance nulle", {
          description: "Le départ et l’arrivée sont au même endroit.",
        });
        return false;
      }
      const saved = await onSave({
        vehicleId: vid,
        startLocation: toLocation(startPoint, "other"),
        endLocation: toLocation(endPoint, "other"),
        distance: km,
        baseDistance: km,
        roundTrip: false,
        purpose: purposeRef.current.trim() || "Déplacement professionnel",
        startTime: new Date(startPoint.at),
        endTime: new Date(endPoint.at),
        status: "validated",
      });
      if (saved) {
        toast.success("Trajet enregistré", { description: `${km.toFixed(1)} km` });
        reset();
        return true;
      }
      return false;
    },
    [onSave, reset],
  );

  const handleFinish = async () => {
    if (!start) return;
    setBusy(true);
    try {
      const point = await capturePoint();
      const km =
        Math.round((await calculateDrivingDistance(start.lat, start.lng, point.lat, point.lng)) * 100) /
        100;
      setEnd(point);
      setDistance(km);
      await persistTrip(start, point, km);
    } catch (e) {
      toast.error("Position indisponible", {
        description: e instanceof Error ? e.message : "Impossible de terminer le trajet.",
      });
    } finally {
      setBusy(false);
    }
  };

  // Arrêt long détecté → le trajet se termine et s'enregistre automatiquement.
  useEffect(() => {
    if (!start || end || !navigator?.geolocation) return;
    let anchor: { lat: number; lng: number; at: number } | null = null;
    let done = false;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (done) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        const now = Date.now();
        if (!anchor) {
          anchor = { lat, lng, at: now };
          return;
        }
        const movedM = getDistanceInKm(anchor.lat, anchor.lng, lat, lng) * 1000;
        if (movedM > STOP_RADIUS_M) {
          anchor = { lat, lng, at: now };
          return;
        }
        if (now - anchor.at < STOP_DURATION_MS) return;
        done = true;
        void (async () => {
          try {
            const point = await capturePoint();
            const km =
              Math.round(
                (await calculateDrivingDistance(start.lat, start.lng, point.lat, point.lng)) * 100,
              ) / 100;
            setEnd(point);
            setDistance(km);
            await persistTrip(start, point, km);
          } catch {
            done = false;
          }
        })();
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [start, end, persistTrip]);


  return (
    <section className="bg-card rounded-xl border border-border p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Trajet en direct
        </h2>
        {start && !end && (
          <span className="text-xs font-medium text-success">
            En cours depuis {formatTime(start.at)}
          </span>
        )}
      </div>

      {start && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <span className="font-medium text-foreground">Départ</span> · {formatTime(start.at)} —{" "}
            {start.address}
          </p>
          {end && (
            <p>
              <span className="font-medium text-foreground">Arrivée</span> · {formatTime(end.at)} —{" "}
              {end.address}
            </p>
          )}
        </div>
      )}

      {start && (
        <>
          {end && <p className="text-2xl font-bold text-foreground">{distance.toFixed(1)} km</p>}
          {vehicles.length > 1 && (
            <select
              value={vehicleId ?? ""}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Véhicule"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} · {v.fiscalPower} CV
                </option>
              ))}
            </select>
          )}
          <Input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Motif du déplacement"
            aria-label="Motif du déplacement"
          />
        </>
      )}

      <div className="flex gap-2">
        {!start && (
          <Button onClick={handleStart} disabled={busy} className="flex-1" variant="gradient">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span className="ml-2">Démarrer un trajet</span>
          </Button>
        )}
        {start && !end && (
          <Button onClick={handleFinish} disabled={busy} className="flex-1" variant="destructive">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
            <span className="ml-2">Terminer le trajet</span>
          </Button>
        )}
        {end && (
          <Button onClick={handleSave} disabled={busy} className="flex-1" variant="gradient">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span className={busy ? "ml-2" : ""}>Enregistrer</span>
          </Button>
        )}
        {start && (
          <Button onClick={reset} variant="ghost" disabled={busy}>
            Annuler
          </Button>
        )}
      </div>
    </section>
  );
};
