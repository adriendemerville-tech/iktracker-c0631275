import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Location, Vehicle } from "@/types/trip";
import type { Tables } from "@/integrations/supabase/types";

// Données de référence (véhicules, lieux) : changent rarement mais sont lues par
// de nombreux composants. Le cache React Query mutualisé (staleTime 10 min)
// garantit une seule lecture réseau quel que soit le nombre de consommateurs,
// au lieu d'un fetch par montage de composant.
export const REFERENCE_STALE_TIME = 10 * 60 * 1000; // 10 minutes
export const REFERENCE_GC_TIME = 30 * 60 * 1000; // 30 minutes

export const referenceKeys = {
  vehicles: (userId: string | undefined) => ["ref-vehicles", userId] as const,
  locations: (userId: string | undefined) => ["ref-locations", userId] as const,
};

// Tableaux vides stables : évitent de casser la mémoïsation des consommateurs
// (useMemo/useEffect) tant que la requête n'a pas encore de données.
export const EMPTY_VEHICLES: Vehicle[] = [];
export const EMPTY_LOCATIONS: Location[] = [];

type VehicleRow = Tables<"vehicles">;

function mapVehicleRow(v: VehicleRow): Vehicle {
  return {
    id: v.id,
    ownerFirstName: v.owner_first_name || "",
    ownerLastName: v.owner_last_name || "",
    licensePlate: v.license_plate || "",
    make: v.make || "",
    model: v.model || v.name,
    fiscalPower: v.fiscal_power,
    year: v.year || undefined,
    isElectric: v.is_electric || false,
  };
}

async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapVehicleRow);
}

async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address || "",
    type: l.type as Location["type"],
    lat: l.latitude || undefined,
    lng: l.longitude || undefined,
  }));
}

export function useVehiclesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: referenceKeys.vehicles(userId),
    queryFn: fetchVehicles,
    enabled: !!userId,
    staleTime: REFERENCE_STALE_TIME,
    gcTime: REFERENCE_GC_TIME,
  });
}

export function useLocationsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: referenceKeys.locations(userId),
    queryFn: fetchLocations,
    enabled: !!userId,
    staleTime: REFERENCE_STALE_TIME,
    gcTime: REFERENCE_GC_TIME,
  });
}
