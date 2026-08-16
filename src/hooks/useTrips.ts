import { useState, useEffect, useCallback, useMemo } from "react";
import { Trip, Location, Vehicle, calculateTotalAnnualIK, TourStopData } from "@/types/trip";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "./useAuth";
import { usePreferences, getFiscalYearStart } from "./usePreferences";
import { useEmailGate, UNVERIFIED_TRIP_LIMIT, UNVERIFIED_TOUR_LIMIT } from "./useEmailGate";
import { toast } from "sonner";

// Archived trips are kept for 30 days
const ARCHIVE_RETENTION_DAYS = 30;

const TRIPS_KEY = "ik-tracker-trips";
const LOCATIONS_KEY = "ik-tracker-locations";
const VEHICLES_KEY = "ik-tracker-vehicles";

const defaultLocations: Location[] = [
  { id: "1", name: "Maison", address: "", type: "home" },
  { id: "2", name: "Bureau", address: "", type: "office" },
];

// Rebuild a Location from the DB row, preserving the full address and the
// geocoded coordinates so distance recalculations don't restart from scratch.
function dbLocation(name: string, address: unknown, lat: unknown, lng: unknown): Location {
  const numLat = typeof lat === "number" && Number.isFinite(lat) ? lat : undefined;
  const numLng = typeof lng === "number" && Number.isFinite(lng) ? lng : undefined;
  const hasCoords = numLat !== undefined && numLng !== undefined && !(numLat === 0 && numLng === 0);
  return {
    id: "",
    name,
    address: typeof address === "string" ? address : "",
    type: "other" as const,
    lat: hasCoords ? numLat : undefined,
    lng: hasCoords ? numLng : undefined,
  };
}

// Coordinate payload for trips insert/update. Undefined values are omitted so
// a partial update never wipes previously stored coordinates.
type TripRow = Tables<"trips">;
type TripInsert = TablesInsert<"trips">;
type VehicleRow = Tables<"vehicles">;

// Forme historique d'un trajet stocké en localStorage (utilisateurs non connectés).
// Les dates y sont sérialisées en chaînes, d'où la réhydratation ci-dessous.
type StoredTrip = Omit<Trip, "startTime" | "endTime"> & {
  startTime: string | Date;
  endTime: string | Date;
  baseDistance?: number;
  roundTrip?: boolean;
};

// Les colonnes jsonb attendent le type Json généré : les interfaces applicatives
// n'ont pas d'index signature, on convertit explicitement au lieu de caster en any.
function toJson(value: unknown): Json | null {
  return value === undefined || value === null ? null : (value as Json);
}

type TripLocationColumns = Pick<
  TripInsert,
  "start_address" | "start_lat" | "start_lng" | "end_address" | "end_lat" | "end_lng"
>;

function locationColumns(prefix: "start" | "end", loc?: Location): Partial<TripLocationColumns> {
  if (!loc) return {};
  const valid =
    typeof loc.lat === "number" &&
    typeof loc.lng === "number" &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng) &&
    !(loc.lat === 0 && loc.lng === 0);
  return {
    [`${prefix}_address`]: loc.address || null,
    [`${prefix}_lat`]: valid ? loc.lat : null,
    [`${prefix}_lng`]: valid ? loc.lng : null,
  };
}

// Single source of truth for DB row -> Trip mapping (active and archived trips).
function mapTripRow(t: TripRow): Trip {
  return {
    id: t.id,
    vehicleId: t.vehicle_id,
    startLocation: dbLocation(t.start_location, t.start_address, t.start_lat, t.start_lng),
    endLocation: dbLocation(t.end_location, t.end_address, t.end_lat, t.end_lng),
    distance: t.distance,
    baseDistance: t.round_trip ? t.distance / 2 : t.distance,
    roundTrip: t.round_trip,
    purpose: t.purpose || "",
    startTime: new Date(t.date),
    endTime: new Date(t.date),
    ikAmount: t.ik_amount,
    tourStops: (t.tour_stops as TourStopData[] | null) ?? undefined,
    calendarEventId: t.calendar_event_id || undefined,
    status: (t.status as Trip["status"]) || "validated",
  };
}

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

export function useTrips() {
  const { user, loading: authLoading } = useAuth();
  const { preferences } = usePreferences();
  const { emailVerified, blockFeature } = useEmailGate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [archivedTrips, setArchivedTrips] = useState<Trip[]>([]);
  // Start with empty array - don't show defaults until we know if user is logged in
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from database for logged-in users
  const loadFromDatabase = useCallback(async () => {
    if (!user) return;

    try {
      // Load vehicles
      const { data: dbVehicles } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbVehicles) {
        setVehicles(dbVehicles.map(mapVehicleRow));
      }

      // Load locations
      const { data: dbLocations } = await supabase
        .from("locations")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbLocations && dbLocations.length > 0) {
        setSavedLocations(
          dbLocations.map((l) => ({
            id: l.id,
            name: l.name,
            address: l.address || "",
            type: l.type as Location["type"],
            lat: l.latitude || undefined,
            lng: l.longitude || undefined,
          })),
        );
      }

      // Load active trips (not deleted) - only past or today's trips (no future calendar imports)
      const today = new Date().toISOString().split("T")[0];
      const { data: dbTrips } = await supabase
        .from("trips")
        .select("*")
        .is("deleted_at", null)
        .lte("date", today)
        .order("date", { ascending: false });

      if (dbTrips) {
        setTrips(dbTrips.map(mapTripRow));
      }

      // Load archived trips (deleted within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - ARCHIVE_RETENTION_DAYS);

      const { data: dbArchivedTrips } = await supabase
        .from("trips")
        .select("*")
        .not("deleted_at", "is", null)
        .gte("deleted_at", thirtyDaysAgo.toISOString())
        .order("deleted_at", { ascending: false });

      if (dbArchivedTrips) {
        setArchivedTrips(dbArchivedTrips.map(mapTripRow));
      }
    } catch (error) {
      console.error("Error loading from database:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load from localStorage for non-logged users
  const loadFromLocalStorage = useCallback(() => {
    const stored = localStorage.getItem(TRIPS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setTrips(
        parsed.map((t: StoredTrip) => ({
          ...t,
          baseDistance: t.baseDistance || t.distance,
          roundTrip: t.roundTrip || false,
          startTime: new Date(t.startTime),
          endTime: new Date(t.endTime),
          tourStops: t.tourStops || undefined,
        })),
      );
    }

    const storedLocations = localStorage.getItem(LOCATIONS_KEY);
    if (storedLocations) {
      setSavedLocations(JSON.parse(storedLocations));
    } else {
      // Only show defaults for non-logged users with no saved locations
      setSavedLocations(defaultLocations);
    }

    const storedVehicles = localStorage.getItem(VEHICLES_KEY);
    if (storedVehicles) {
      setVehicles(JSON.parse(storedVehicles));
    }
    setLoading(false);
  }, []);

  // Migrate localStorage data to database when user logs in
  const migrateToDatabase = useCallback(async () => {
    if (!user) return;

    const localVehicles = localStorage.getItem(VEHICLES_KEY);
    const localLocations = localStorage.getItem(LOCATIONS_KEY);
    const localTrips = localStorage.getItem(TRIPS_KEY);

    // Check if there's local data to migrate
    if (!localVehicles && !localLocations && !localTrips) return;

    // Each step tracks its own success. localStorage is only cleared for the
    // parts that fully migrated, so a partial failure never loses local data.
    let vehiclesMigrated = false;
    let locationsMigrated = false;
    let tripsMigrated = false;

    try {
      // Migrate vehicles
      if (localVehicles) {
        const vehiclesToMigrate: Vehicle[] = JSON.parse(localVehicles);
        const vehicleIdMap = new Map<string, string>();
        let vehicleFailure = false;

        for (const v of vehiclesToMigrate) {
          const { data, error } = await supabase
            .from("vehicles")
            .insert({
              user_id: user.id,
              name: `${v.make} ${v.model}`.trim() || "Véhicule",
              fiscal_power: v.fiscalPower,
              owner_first_name: v.ownerFirstName,
              owner_last_name: v.ownerLastName,
              license_plate: v.licensePlate,
              make: v.make,
              model: v.model,
              year: v.year || null,
            })
            .select()
            .single();

          if (error || !data) {
            vehicleFailure = true;
            console.error("Migration: vehicle insert failed", error);
            continue;
          }
          vehicleIdMap.set(v.id, data.id);
        }
        vehiclesMigrated = !vehicleFailure;

        // Migrate locations
        if (localLocations) {
          let locationFailure = false;
          const locationsToMigrate: Location[] = JSON.parse(localLocations);
          for (const l of locationsToMigrate) {
            if (l.id === "1" || l.id === "2") continue; // Skip defaults
            const { error } = await supabase.from("locations").insert({
              user_id: user.id,
              name: l.name,
              address: l.address || null,
              type: l.type,
              latitude: l.lat || null,
              longitude: l.lng || null,
            });
            if (error) {
              locationFailure = true;
              console.error("Migration: location insert failed", error);
            }
          }
          locationsMigrated = !locationFailure;
        } else {
          locationsMigrated = true;
        }

        // Migrate trips
        if (localTrips) {
          let tripFailure = false;
          const tripsToMigrate: Trip[] = JSON.parse(localTrips);
          for (const t of tripsToMigrate) {
            const newVehicleId = vehicleIdMap.get(t.vehicleId ?? "");
            if (!newVehicleId) {
              tripFailure = true;
              continue;
            }
            const { error } = await supabase.from("trips").insert({
              user_id: user.id,
              vehicle_id: newVehicleId,
              date: new Date(t.startTime).toISOString().split("T")[0],
              start_location: t.startLocation.name,
              end_location: t.endLocation.name,
              ...locationColumns("start", t.startLocation),
              ...locationColumns("end", t.endLocation),
              distance: t.distance,
              purpose: t.purpose || null,
              round_trip: false,
              ik_amount: t.ikAmount,
            });
            if (error) {
              tripFailure = true;
              console.error("Migration: trip insert failed", error);
            }
          }
          tripsMigrated = !tripFailure;
        } else {
          tripsMigrated = true;
        }
      }
    } catch (error) {
      console.error("Migration error:", error);
    }

    // Clear only what migrated cleanly.
    if (vehiclesMigrated && locationsMigrated && tripsMigrated) {
      localStorage.removeItem(VEHICLES_KEY);
      localStorage.removeItem(LOCATIONS_KEY);
      localStorage.removeItem(TRIPS_KEY);
    } else {
      console.warn("Migration incomplete — local data kept as a safety net", {
        vehiclesMigrated,
        locationsMigrated,
        tripsMigrated,
      });
    }
  }, [user]);

  useEffect(() => {
    // Wait for auth to finish loading before deciding which data source to use
    if (authLoading) return;

    if (user) {
      migrateToDatabase().then(() => loadFromDatabase());
    } else {
      loadFromLocalStorage();
    }
  }, [user, authLoading, loadFromDatabase, loadFromLocalStorage, migrateToDatabase]);

  // Save functions
  const saveTripsLocal = (newTrips: Trip[]) => {
    setTrips(newTrips);
    localStorage.setItem(TRIPS_KEY, JSON.stringify(newTrips));
  };

  const saveLocationsLocal = (newLocations: Location[]) => {
    setSavedLocations(newLocations);
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(newLocations));
  };

  const saveVehiclesLocal = (newVehicles: Vehicle[]) => {
    setVehicles(newVehicles);
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(newVehicles));
  };

  // Calculate total km for the current year for a specific vehicle
  const getTotalAnnualKm = (vehicleId: string) => {
    const currentYear = new Date().getFullYear();
    return trips
      .filter(
        (t) => t.vehicleId === vehicleId && new Date(t.startTime).getFullYear() === currentYear,
      )
      .reduce((sum, t) => sum + t.distance, 0);
  };

  // CRUD Operations
  const addTrip = async (
    trip: Omit<Trip, "id" | "ikAmount">,
    options?: { ikAmountOverride?: number },
  ) => {
    // Unverified accounts: 3 trips + 1 tour max
    if (!emailVerified) {
      const isTour = !!trip.tourStops?.length;
      const tourCount = trips.filter((t) => t.tourStops?.length).length;
      const simpleCount = trips.length - tourCount;
      if (isTour && tourCount >= UNVERIFIED_TOUR_LIMIT) {
        blockFeature("tour");
        return null;
      }
      if (!isTour && simpleCount >= UNVERIFIED_TRIP_LIMIT) {
        blockFeature("trip");
        return null;
      }
    }

    const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
    if (!vehicle) return null;

    let ikAmount: number;
    if (typeof options?.ikAmountOverride === "number") {
      // Explicit IK provided (e.g. regrouping existing trips into a tour) — trust it verbatim.
      ikAmount = options.ikAmountOverride;
    } else {
      const totalAnnualKm = getTotalAnnualKm(trip.vehicleId ?? "") + trip.distance;
      const rateOverride = preferences.ikRateOverride;
      ikAmount =
        calculateTotalAnnualIK(totalAnnualKm, vehicle.fiscalPower, rateOverride) -
        calculateTotalAnnualIK(totalAnnualKm - trip.distance, vehicle.fiscalPower, rateOverride);

      // Apply 20% bonus for electric vehicles
      if (vehicle.isElectric) {
        ikAmount = ikAmount * 1.2;
      }
    }

    if (user) {
      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          vehicle_id: trip.vehicleId,
          date: new Date(trip.startTime).toISOString().split("T")[0],
          start_location: trip.startLocation.name,
          end_location: trip.endLocation.name,
          ...locationColumns("start", trip.startLocation),
          ...locationColumns("end", trip.endLocation),

          distance: trip.distance,
          purpose: trip.purpose || null,
          round_trip: trip.roundTrip,
          ik_amount: ikAmount,
          tour_stops: toJson(trip.tourStops),
        })
        .select()
        .single();

      if (data) {
        const newTrip: Trip = {
          id: data.id,
          vehicleId: data.vehicle_id,
          startLocation: trip.startLocation,
          endLocation: trip.endLocation,
          distance: data.distance,
          baseDistance: trip.baseDistance,
          roundTrip: trip.roundTrip,
          purpose: data.purpose || "",
          startTime: new Date(data.date),
          endTime: new Date(data.date),
          ikAmount: data.ik_amount,
          tourStops: (data.tour_stops as TourStopData[] | null) ?? undefined,
          status: "validated",
        };
        setTrips((prev) => [newTrip, ...prev]);
        return newTrip;
      }
      return null;
    } else {
      const newTrip: Trip = {
        ...trip,
        id: crypto.randomUUID(),
        ikAmount,
        tourStops: trip.tourStops,
      };
      saveTripsLocal([newTrip, ...trips]);
      return newTrip;
    }
  };

  const deleteTrip = async (id: string) => {
    const tripToDelete = trips.find((t) => t.id === id);
    if (!tripToDelete) return;

    if (user) {
      // Soft delete: set deleted_at timestamp
      const deletedAt = new Date().toISOString();
      await supabase.from("trips").update({ deleted_at: deletedAt }).eq("id", id);

      // Move to archived trips
      setTrips((prev) => prev.filter((t) => t.id !== id));
      setArchivedTrips((prev) => [{ ...tripToDelete }, ...prev]);
    } else {
      // For local storage, also implement soft delete
      const deletedAt = new Date().toISOString();
      const archivedTrip = { ...tripToDelete, deletedAt };

      // Save to archived storage
      const storedArchived = localStorage.getItem("ik-tracker-archived-trips");
      const archived = storedArchived ? JSON.parse(storedArchived) : [];
      localStorage.setItem(
        "ik-tracker-archived-trips",
        JSON.stringify([archivedTrip, ...archived]),
      );

      // Remove from active trips
      saveTripsLocal(trips.filter((t) => t.id !== id));
      setArchivedTrips((prev) => [tripToDelete, ...prev]);
    }
  };

  // Restore a trip from archive
  const restoreTrip = async (id: string) => {
    const tripToRestore = archivedTrips.find((t) => t.id === id);
    if (!tripToRestore) return;

    if (user) {
      // Clear deleted_at to restore
      await supabase.from("trips").update({ deleted_at: null }).eq("id", id);

      // Move back to active trips
      setArchivedTrips((prev) => prev.filter((t) => t.id !== id));
      setTrips((prev) =>
        [tripToRestore, ...prev].sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
        ),
      );
      toast.success("Trajet restauré");
    } else {
      // For local storage
      const storedArchived = localStorage.getItem("ik-tracker-archived-trips");
      const archived = storedArchived ? JSON.parse(storedArchived) : [];
      localStorage.setItem(
        "ik-tracker-archived-trips",
        JSON.stringify(archived.filter((t: Trip) => t.id !== id)),
      );

      // Add back to active trips
      saveTripsLocal([tripToRestore, ...trips]);
      setArchivedTrips((prev) => prev.filter((t) => t.id !== id));
      toast.success("Trajet restauré");
    }
  };

  // Permanently delete a trip from archive
  const permanentlyDeleteTrip = async (id: string) => {
    if (user) {
      await supabase.from("trips").delete().eq("id", id);
      setArchivedTrips((prev) => prev.filter((t) => t.id !== id));
    } else {
      const storedArchived = localStorage.getItem("ik-tracker-archived-trips");
      const archived = storedArchived ? JSON.parse(storedArchived) : [];
      localStorage.setItem(
        "ik-tracker-archived-trips",
        JSON.stringify(archived.filter((t: Trip) => t.id !== id)),
      );
      setArchivedTrips((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const updateTrip = async (id: string, updates: Partial<Omit<Trip, "id">>) => {
    const existingTrip = trips.find((t) => t.id === id);
    if (!existingTrip) return null;

    // Determine the vehicle to use for calculations
    const newVehicleId =
      updates.vehicleId !== undefined ? updates.vehicleId : existingTrip.vehicleId;
    const vehicle = newVehicleId ? vehicles.find((v) => v.id === newVehicleId) : null;

    // Recalculate IK if distance or vehicle changed
    let ikAmount = existingTrip.ikAmount;
    const distanceChanged =
      updates.distance !== undefined && updates.distance !== existingTrip.distance;
    const vehicleChanged =
      updates.vehicleId !== undefined && updates.vehicleId !== existingTrip.vehicleId;

    if (vehicle && (distanceChanged || vehicleChanged)) {
      const newDistance = updates.distance !== undefined ? updates.distance : existingTrip.distance;
      // Subtract existing trip's distance if it was already on this vehicle to avoid double-counting
      const existingKmOnThisVehicle =
        existingTrip.vehicleId === vehicle.id ? existingTrip.distance : 0;
      const otherTripsKm = getTotalAnnualKm(vehicle.id) - existingKmOnThisVehicle;
      const totalAnnualKm = otherTripsKm + newDistance;
      ikAmount =
        calculateTotalAnnualIK(totalAnnualKm, vehicle.fiscalPower, preferences.ikRateOverride) -
        calculateTotalAnnualIK(otherTripsKm, vehicle.fiscalPower, preferences.ikRateOverride);

      // Apply 20% bonus for electric vehicles
      if (vehicle.isElectric) {
        ikAmount = ikAmount * 1.2;
      }
    } else if (!vehicle && vehicleChanged) {
      // Vehicle removed, keep existing IK amount (already set above)
    }

    if (user) {
      const { error } = await supabase
        .from("trips")
        .update({
          vehicle_id: updates.vehicleId !== undefined ? updates.vehicleId : undefined,
          date: updates.startTime
            ? new Date(updates.startTime).toISOString().split("T")[0]
            : undefined,
          start_location: updates.startLocation?.name,
          end_location: updates.endLocation?.name,
          ...locationColumns("start", updates.startLocation),
          ...locationColumns("end", updates.endLocation),

          distance: updates.distance,
          round_trip: updates.roundTrip,
          purpose: updates.purpose !== undefined ? updates.purpose || null : undefined,
          ik_amount: ikAmount,
          ...(updates.tourStops !== undefined ? { tour_stops: toJson(updates.tourStops) } : {}),
        })
        .eq("id", id);

      if (!error) {
        const updatedTrip: Trip = {
          ...existingTrip,
          ...updates,
          ikAmount,
        };
        setTrips((prev) => prev.map((t) => (t.id === id ? updatedTrip : t)));
        return updatedTrip;
      }
      return null;
    } else {
      const updatedTrip: Trip = {
        ...existingTrip,
        ...updates,
        ikAmount,
      };
      saveTripsLocal(trips.map((t) => (t.id === id ? updatedTrip : t)));
      return updatedTrip;
    }
  };

  const addLocation = async (location: Omit<Location, "id">) => {
    if (user) {
      const { data } = await supabase
        .from("locations")
        .insert({
          user_id: user.id,
          name: location.name,
          address: location.address || null,
          type: location.type,
          latitude: location.lat || null,
          longitude: location.lng || null,
        })
        .select()
        .single();

      if (data) {
        const newLocation: Location = {
          id: data.id,
          name: data.name,
          address: data.address || "",
          type: data.type as Location["type"],
          lat: data.latitude || undefined,
          lng: data.longitude || undefined,
        };
        setSavedLocations((prev) => [...prev, newLocation]);
        return newLocation;
      }
      return null;
    } else {
      const newLocation: Location = {
        ...location,
        id: crypto.randomUUID(),
      };
      saveLocationsLocal([...savedLocations, newLocation]);
      return newLocation;
    }
  };

  const updateLocation = async (id: string, updates: Partial<Location>) => {
    if (user) {
      // Check if this is a default location (not in database)
      const isDefaultLocation = id === "1" || id === "2";

      if (isDefaultLocation) {
        // Create new location in database instead of updating
        const existingLocation = savedLocations.find((l) => l.id === id);
        const { data } = await supabase
          .from("locations")
          .insert({
            user_id: user.id,
            name: updates.name || existingLocation?.name || "",
            address: updates.address || existingLocation?.address || null,
            type: updates.type || existingLocation?.type || "other",
            latitude: updates.lat || existingLocation?.lat || null,
            longitude: updates.lng || existingLocation?.lng || null,
          })
          .select()
          .single();

        if (data) {
          // Replace the default location with the new DB location
          setSavedLocations((prev) =>
            prev.map((l) =>
              l.id === id
                ? {
                    id: data.id,
                    name: data.name,
                    address: data.address || "",
                    type: data.type as Location["type"],
                    lat: data.latitude || undefined,
                    lng: data.longitude || undefined,
                  }
                : l,
            ),
          );
        }
      } else {
        // Normal update for DB locations
        await supabase
          .from("locations")
          .update({
            name: updates.name,
            address: updates.address || null,
            type: updates.type,
            latitude: updates.lat || null,
            longitude: updates.lng || null,
          })
          .eq("id", id);
        setSavedLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
      }
    } else {
      saveLocationsLocal(savedLocations.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    }
  };

  const deleteLocation = async (id: string) => {
    if (user) {
      await supabase.from("locations").delete().eq("id", id);
      setSavedLocations((prev) => prev.filter((l) => l.id !== id));
    } else {
      saveLocationsLocal(savedLocations.filter((l) => l.id !== id));
    }
  };

  const addVehicle = async (vehicle: Omit<Vehicle, "id">) => {
    if (user) {
      const { data } = await supabase
        .from("vehicles")
        .insert({
          user_id: user.id,
          name: `${vehicle.make} ${vehicle.model}`.trim() || "Véhicule",
          fiscal_power: vehicle.fiscalPower,
          owner_first_name: vehicle.ownerFirstName,
          owner_last_name: vehicle.ownerLastName,
          license_plate: vehicle.licensePlate,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year || null,
          is_electric: vehicle.isElectric || false,
        })
        .select()
        .single();

      if (data) {
        const newVehicle: Vehicle = {
          ...vehicle,
          id: data.id,
        };
        setVehicles((prev) => [...prev, newVehicle]);

        // Query database directly for trips without a vehicle (more reliable than local state)
        const { data: tripsWithoutVehicle } = await supabase
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .is("vehicle_id", null);

        if (tripsWithoutVehicle && tripsWithoutVehicle.length > 0) {
          console.log(
            `Assigning new vehicle ${data.id} to ${tripsWithoutVehicle.length} trips without vehicle`,
          );

          // Update all trips to use this vehicle
          const tripIds = tripsWithoutVehicle.map((t) => t.id);
          await supabase.from("trips").update({ vehicle_id: data.id }).in("id", tripIds);

          // Recalculate IK for each trip and update
          // Sort trips by date to calculate cumulative IK correctly
          const sortedTrips = [...tripsWithoutVehicle].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

          let cumulativeKm = 0;
          for (const trip of sortedTrips) {
            cumulativeKm += trip.distance;
            let ikAmount =
              calculateTotalAnnualIK(
                cumulativeKm,
                newVehicle.fiscalPower,
                preferences.ikRateOverride,
              ) -
              calculateTotalAnnualIK(
                cumulativeKm - trip.distance,
                newVehicle.fiscalPower,
                preferences.ikRateOverride,
              );

            if (newVehicle.isElectric) {
              ikAmount = ikAmount * 1.2;
            }

            await supabase.from("trips").update({ ik_amount: ikAmount }).eq("id", trip.id);
          }

          // Reload trips to get updated data
          loadFromDatabase();
          toast.success(
            `${tripsWithoutVehicle.length} trajet(s) mis à jour avec le nouveau véhicule`,
          );
        }

        return newVehicle;
      }
      return null;
    } else {
      const newVehicle: Vehicle = {
        ...vehicle,
        id: crypto.randomUUID(),
      };
      saveVehiclesLocal([...vehicles, newVehicle]);
      return newVehicle;
    }
  };

  const updateVehicle = async (
    id: string,
    updates: Partial<Vehicle>,
    options?: { updatePastTrips?: boolean },
  ) => {
    const existingVehicle = vehicles.find((v) => v.id === id);
    if (!existingVehicle) return;

    // Check if fiscal power or electric status changed - may need to recalculate IK
    const fiscalPowerChanged =
      updates.fiscalPower !== undefined && updates.fiscalPower !== existingVehicle.fiscalPower;
    const electricStatusChanged =
      updates.isElectric !== undefined && updates.isElectric !== existingVehicle.isElectric;
    // Only recalculate past trips when the user explicitly opts in.
    // Future trips will pick up the new vehicle params automatically at creation time.
    const needsIKRecalculation =
      (fiscalPowerChanged || electricStatusChanged) && !!options?.updatePastTrips;

    const newFiscalPower = updates.fiscalPower ?? existingVehicle.fiscalPower;
    const newIsElectric = updates.isElectric ?? existingVehicle.isElectric;

    if (user) {
      // Update the vehicle first
      await supabase
        .from("vehicles")
        .update({
          name:
            `${updates.make || existingVehicle.make || ""} ${updates.model || existingVehicle.model || ""}`.trim() ||
            undefined,
          fiscal_power: updates.fiscalPower,
          owner_first_name: updates.ownerFirstName,
          owner_last_name: updates.ownerLastName,
          license_plate: updates.licensePlate,
          make: updates.make,
          model: updates.model,
          year: updates.year || null,
          is_electric: updates.isElectric,
        })
        .eq("id", id);

      // If fiscal power or electric status changed, recalculate IK for all trips with this vehicle
      if (needsIKRecalculation) {
        const vehicleTrips = trips.filter((t) => t.vehicleId === id);

        // Sort trips by date to calculate cumulative IK correctly
        const sortedTrips = [...vehicleTrips].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );

        let cumulativeKm = 0;
        for (const trip of sortedTrips) {
          const previousCumulativeKm = cumulativeKm;
          cumulativeKm += trip.distance;

          // Calculate new IK based on cumulative distance
          let newIkAmount =
            calculateTotalAnnualIK(cumulativeKm, newFiscalPower, preferences.ikRateOverride) -
            calculateTotalAnnualIK(
              previousCumulativeKm,
              newFiscalPower,
              preferences.ikRateOverride,
            );

          // Apply 20% bonus for electric vehicles
          if (newIsElectric) {
            newIkAmount = newIkAmount * 1.2;
          }

          // Update trip in database
          await supabase.from("trips").update({ ik_amount: newIkAmount }).eq("id", trip.id);
        }

        // Reload trips from database to get updated IK amounts
        const { data: updatedTrips } = await supabase
          .from("trips")
          .select("*")
          .order("date", { ascending: false });

        if (updatedTrips) {
          setTrips(updatedTrips.map(mapTripRow));
        }

        // Notify user that IK amounts were recalculated
        const tripCount = sortedTrips.length;
        if (tripCount > 0) {
          toast.success("Indemnités recalculées", {
            description: `${tripCount} trajet${tripCount > 1 ? "s" : ""} mis à jour avec le nouveau barème.`,
          });
        }
      }

      setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    } else {
      // For local storage users
      if (needsIKRecalculation) {
        const vehicleTrips = trips.filter((t) => t.vehicleId === id);
        const sortedTrips = [...vehicleTrips].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );

        let cumulativeKm = 0;
        const updatedTripsMap = new Map<string, number>();

        for (const trip of sortedTrips) {
          const previousCumulativeKm = cumulativeKm;
          cumulativeKm += trip.distance;

          let newIkAmount =
            calculateTotalAnnualIK(cumulativeKm, newFiscalPower, preferences.ikRateOverride) -
            calculateTotalAnnualIK(
              previousCumulativeKm,
              newFiscalPower,
              preferences.ikRateOverride,
            );

          if (newIsElectric) {
            newIkAmount = newIkAmount * 1.2;
          }

          updatedTripsMap.set(trip.id, newIkAmount);
        }

        // Update all trips with new IK amounts
        const newTrips = trips.map((t) =>
          updatedTripsMap.has(t.id) ? { ...t, ikAmount: updatedTripsMap.get(t.id)! } : t,
        );
        saveTripsLocal(newTrips);

        // Notify user that IK amounts were recalculated
        const tripCount = sortedTrips.length;
        if (tripCount > 0) {
          toast.success("Indemnités recalculées", {
            description: `${tripCount} trajet${tripCount > 1 ? "s" : ""} mis à jour avec le nouveau barème.`,
          });
        }
      }

      saveVehiclesLocal(vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    }
  };

  const deleteVehicle = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (user) {
      // Delete vehicle - trips will have vehicle_id set to NULL (ON DELETE SET NULL)
      // Trips keep their existing IK amounts
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) {
        return { success: false, error: "Impossible de supprimer ce véhicule." };
      }
      // Update local state: set vehicleId to null for affected trips
      setTrips((prev) => prev.map((t) => (t.vehicleId === id ? { ...t, vehicleId: null } : t)));
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      return { success: true };
    } else {
      // For local storage, set vehicleId to null for affected trips
      const updatedTrips = trips.map((t) => (t.vehicleId === id ? { ...t, vehicleId: null } : t));
      saveTripsLocal(updatedTrips);
      saveVehiclesLocal(vehicles.filter((v) => v.id !== id));
      return { success: true };
    }
  };

  // Filter trips based on counter reset date
  const filteredTrips = useMemo(() => {
    if (!preferences.counterResetDate) return trips;
    const resetDate = new Date(preferences.counterResetDate);
    return trips.filter((t) => new Date(t.startTime) >= resetDate);
  }, [trips, preferences.counterResetDate]);

  const totalKm = filteredTrips.reduce((sum, t) => sum + t.distance, 0);

  const recalculatedTotalIK = useMemo(() => {
    const fiscalMonth = preferences.fiscalYearStartMonth || 1;
    const fiscalDay = preferences.fiscalYearStartDay || 1;

    const vehicleKms = new Map<string, { vehicleId: string; km: number }>();
    filteredTrips.forEach((t) => {
      if (!t.vehicleId) return;
      // Group by vehicle + fiscal year
      const tripDate = new Date(t.startTime);
      const fyStart = getFiscalYearStart(tripDate, fiscalMonth, fiscalDay);
      const fyKey = `${t.vehicleId}::${fyStart.getTime()}`;
      const existing = vehicleKms.get(fyKey);
      if (existing) {
        existing.km += t.distance;
      } else {
        vehicleKms.set(fyKey, { vehicleId: t.vehicleId, km: t.distance });
      }
    });

    let total = 0;
    vehicleKms.forEach(({ vehicleId, km }) => {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (vehicle) {
        let vehicleIK = calculateTotalAnnualIK(km, vehicle.fiscalPower, preferences.ikRateOverride);
        if (vehicle.isElectric) {
          vehicleIK = vehicleIK * 1.2;
        }
        total += vehicleIK;
      }
    });

    // Add preserved IK from trips without vehicles
    filteredTrips.forEach((t) => {
      if (!t.vehicleId) {
        total += t.ikAmount;
      }
    });

    return total;
  }, [filteredTrips, vehicles, preferences.fiscalYearStartMonth, preferences.fiscalYearStartDay]);

  // ----------------------------------------------------------------------
  // Danger zone: wipe & restore
  // ----------------------------------------------------------------------
  // We store a per-user marker in localStorage that identifies the last wipe
  // (the exact `deleted_at` value we stamped on every row of the batch).
  // This lets us later restore *only* that specific batch, without also
  // un-archiving trips the user had individually thrown in the trash.
  const wipeMarkerKey = user ? `ik-tracker-last-wipe:${user.id}` : null;

  const deleteAllTrips = async (): Promise<{ success: boolean; count: number }> => {
    if (!user) {
      // Local mode: clear localStorage journal (no restore in local mode)
      const count = trips.length + archivedTrips.length;
      saveTripsLocal([]);
      localStorage.removeItem("ik-tracker-archived-trips");
      setArchivedTrips([]);
      return { success: true, count };
    }

    // 31 days ago → out of the 30-day archive window, so archives UI is empty too
    const wipedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const { error, count } = await supabase
      .from("trips")
      .update({ deleted_at: wipedAt }, { count: "exact" })
      .eq("user_id", user.id)
      .or(
        `deleted_at.is.null,deleted_at.gte.${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`,
      );

    if (error) {
      console.error("deleteAllTrips failed:", error);
      return { success: false, count: 0 };
    }

    // Record the marker so we can restore later
    if (wipeMarkerKey) {
      try {
        localStorage.setItem(
          wipeMarkerKey,
          JSON.stringify({
            deletedAt: wipedAt,
            wipedAt: new Date().toISOString(),
          }),
        );
      } catch (e) {
        console.warn("Failed to store wipe marker:", e);
      }
    }

    setTrips([]);
    setArchivedTrips([]);
    return { success: true, count: count ?? 0 };
  };

  // Return info about the last wipe backup, if any is still restorable (< 120 days)
  const getWipeBackupInfo = useCallback(async (): Promise<
    { available: false } | { available: true; count: number; wipedAt: string; daysLeft: number }
  > => {
    if (!user || !wipeMarkerKey) return { available: false };
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(wipeMarkerKey);
    } catch {
      /* noop */
    }
    if (!raw) return { available: false };

    let marker: { deletedAt: string; wipedAt: string };
    try {
      marker = JSON.parse(raw);
    } catch {
      return { available: false };
    }

    const daysSinceWipe = (Date.now() - new Date(marker.wipedAt).getTime()) / 86400000;
    if (daysSinceWipe > 120) {
      localStorage.removeItem(wipeMarkerKey);
      return { available: false };
    }

    const { count, error } = await supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("deleted_at", marker.deletedAt);

    if (error || !count || count === 0) {
      if (!error) localStorage.removeItem(wipeMarkerKey);
      return { available: false };
    }

    return {
      available: true,
      count,
      wipedAt: marker.wipedAt,
      daysLeft: Math.max(0, Math.ceil(120 - daysSinceWipe)),
    };
  }, [user, wipeMarkerKey]);

  // Restore the last wipe backup.
  // mode='merge'   → un-delete the backup, keep current trips
  // mode='replace' → soft-delete current trips first (new wipe), then restore backup
  const restoreWipedTrips = async (
    mode: "merge" | "replace",
  ): Promise<{ success: boolean; restored: number }> => {
    if (!user || !wipeMarkerKey) return { success: false, restored: 0 };
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(wipeMarkerKey);
    } catch {
      /* noop */
    }
    if (!raw) return { success: false, restored: 0 };

    let marker: { deletedAt: string; wipedAt: string };
    try {
      marker = JSON.parse(raw);
    } catch {
      return { success: false, restored: 0 };
    }

    // If replace mode → first wipe currently-active trips with a fresh marker,
    // so those get their own restorable batch (edge case: user wants to undo).
    if (mode === "replace") {
      const newWipedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000 - 1000).toISOString();
      const { error: wipeErr } = await supabase
        .from("trips")
        .update({ deleted_at: newWipedAt })
        .eq("user_id", user.id)
        .is("deleted_at", null);
      if (wipeErr) {
        console.error("restoreWipedTrips: replace-wipe failed:", wipeErr);
        return { success: false, restored: 0 };
      }
      // Overwrite marker with the new batch (previous backup will be lost after restore)
      try {
        localStorage.setItem(
          wipeMarkerKey,
          JSON.stringify({
            deletedAt: newWipedAt,
            wipedAt: new Date().toISOString(),
          }),
        );
      } catch {
        /* noop */
      }
    }

    // Un-delete the target backup
    const { error, count } = await supabase
      .from("trips")
      .update({ deleted_at: null }, { count: "exact" })
      .eq("user_id", user.id)
      .eq("deleted_at", marker.deletedAt);

    if (error) {
      console.error("restoreWipedTrips failed:", error);
      return { success: false, restored: 0 };
    }

    if (mode === "merge") {
      // Consumed marker: it's no longer a "backup"
      try {
        localStorage.removeItem(wipeMarkerKey);
      } catch {
        /* noop */
      }
    }

    await loadFromDatabase();
    return { success: true, restored: count ?? 0 };
  };

  return {
    trips,
    archivedTrips,
    savedLocations,
    vehicles,
    totalKm,
    totalIK: recalculatedTotalIK,
    loading,
    getTotalAnnualKm,
    addTrip,
    updateTrip,
    deleteTrip,
    restoreTrip,
    permanentlyDeleteTrip,
    deleteAllTrips,
    getWipeBackupInfo,
    restoreWipedTrips,
    addLocation,
    updateLocation,
    deleteLocation,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  };
}
