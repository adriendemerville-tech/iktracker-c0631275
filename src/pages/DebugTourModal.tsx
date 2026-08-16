import { useState } from "react";
import { TourRecoveryModal } from "@/components/TourRecoveryModal";
import type { TourStop } from "@/hooks/useTourTracker";

const now = Date.now();
const mk = (id: string, mins: number, city: string, address?: string): TourStop => ({
  id,
  timestamp: new Date(now - mins * 60_000) as any,
  lat: 48.85 + Math.random() * 0.1,
  lng: 2.35 + Math.random() * 0.1,
  city,
  address: address || city,
  duration: 0,
});

const STOPS_SHORT: TourStop[] = [
  mk("1", 240, "Paris 11e", "15 rue Oberkampf, Paris"),
  mk("2", 195, "Vincennes", "Av. de Paris, Vincennes"),
  mk("3", 140, "Montreuil", "Rue de Paris, Montreuil"),
];

const STOPS_LONG: TourStop[] = [
  mk("1", 320, "Paris 11e", "15 rue Oberkampf, Paris"),
  mk("2", 285, "Vincennes"),
  mk("3", 240, "Montreuil"),
  mk("4", 200, "Bagnolet"),
  mk("5", 165, "Romainville"),
  mk("6", 130, "Pantin"),
  mk("7", 95, "Aubervilliers"),
  mk("8", 50, "Saint-Denis", "Place Jean-Jaurès, Saint-Denis"),
];

export default function DebugTourModal() {
  const initial =
    new URLSearchParams(window.location.search).get("stops") === "8" ? "long" : "short";
  const [scenario, setScenario] = useState<"short" | "long">(initial as any);
  const [loading, setLoading] = useState(false);

  const stops = scenario === "short" ? STOPS_SHORT : STOPS_LONG;
  const distance = scenario === "short" ? 18.4 : 72.3;
  const inactivity = scenario === "short" ? "2h 15min" : "5h 20min";

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col gap-3">
      <h1 className="text-lg font-bold">Debug · Tour Recovery Modal</h1>
      <div className="flex gap-2">
        <button
          onClick={() => setScenario("short")}
          className={`px-3 py-1.5 rounded text-sm ${scenario === "short" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          3 étapes
        </button>
        <button
          onClick={() => setScenario("long")}
          className={`px-3 py-1.5 rounded text-sm ${scenario === "long" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          8 étapes (tronquées)
        </button>
        <button
          onClick={() => setLoading((l) => !l)}
          className={`px-3 py-1.5 rounded text-sm ${loading ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          {loading ? "Loading ON" : "Loading OFF"}
        </button>
      </div>
      <TourRecoveryModal
        open
        inactivityDuration={inactivity}
        stopsCount={stops.length}
        distanceKm={distance}
        stops={stops}
        startedAt={new Date(now - 6 * 60 * 60_000).toISOString()}
        onResume={() => console.log("resume")}
        onFinalize={() => console.log("finalize")}
        onAddCurrentLocation={() => {
          setLoading(true);
          setTimeout(() => setLoading(false), 1500);
        }}
        isAddingLocation={loading}
      />
    </div>
  );
}
