import type { Trip, Vehicle } from "@/types/trip";

// Archived rate inputs are authoritative until an explicit vehicle reassignment.
export function getTripVehicle(trip: Trip, vehicles: Vehicle[]): Vehicle | undefined {
  return trip.vehicleSnapshot ?? vehicles.find((vehicle) => vehicle.id === trip.vehicleId);
}

export function preserveTripVehicle(trip: Trip, vehicle: Vehicle): Trip {
  return trip.vehicleId === vehicle.id
    ? { ...trip, vehicleId: null, vehicleSnapshot: { ...vehicle } }
    : trip;
}