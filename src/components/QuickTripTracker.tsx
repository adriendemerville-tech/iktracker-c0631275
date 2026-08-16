import { useEffect, useState } from "react";
import { MapPin, Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { reverseGeocode } from "@/lib/geocoding";
import { calculateDrivingDistance } from "@/lib/distance";
import type { Trip, Vehicle, Location as TripLocation } from "@/types/trip";

const STORAGE_KEY = "iktracker_quick_trip";

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

  const handleFinish = async () => {
    if (!start) return;
    setBusy(true);
    try {
      const point = await capturePoint();
      const km = await calculateDrivingDistance(start.lat, start.lng, point.lat, point.lng);
      setEnd(point);
      setDistance(Math.round(km * 100) / 100);
    } catch (e) {
      toast.error("Position indisponible", {
        description: e instanceof Error ? e.message : "Impossible de terminer le trajet.",
      });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStart(null);
    setEnd(null);
    setDistance(0);
    setPurpose("");
  };

  const handleSave = async () => {
    if (!start || !end) return;
    if (!vehicleId) {
      toast.error("Aucun véhicule", { description: "Ajoutez un véhicule avant d’enregistrer." });
      return;
    }
    if (distance <= 0) {
      toast.error("Distance nulle", {
        description: "Le départ et l’arrivée sont au même endroit.",
      });
      return;
    }
    setBusy(true);
    try {
      const saved = await onSave({
        vehicleId,
        startLocation: toLocation(start, "other"),
        endLocation: toLocation(end, "other"),
        distance,
        baseDistance: distance,
        roundTrip: false,
        purpose: purpose.trim() || "Déplacement professionnel",
        startTime: new Date(start.at),
        endTime: new Date(end.at),
        status: "validated",
      });
      if (saved) {
        toast.success("Trajet enregistré", { description: `${distance.toFixed(1)} km` });
        reset();
      }
    } catch (e) {
      toast.error("Enregistrement impossible", {
        description: e instanceof Error ? e.message : "Réessayez dans un instant.",
      });
    } finally {
      setBusy(false);
    }
  };

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

      {end && (
        <>
          <p className="text-2xl font-bold text-foreground">{distance.toFixed(1)} km</p>
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
