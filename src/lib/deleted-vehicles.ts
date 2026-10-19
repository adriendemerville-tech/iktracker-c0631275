import type { Vehicle } from "@/types/trip";

export const DELETED_VEHICLES_KEY = "ik-tracker-deleted-vehicles";
export const VEHICLE_ARCHIVE_EVENT = "ik-vehicle-archive-changed";
export interface DeletedVehicle {
  vehicle: Vehicle;
  deletedAt: string;
}

export function archiveLocalVehicle(vehicle: Vehicle, deletedAt = new Date().toISOString()) {
  const saved = readLocalDeletedVehicles().filter((row) => row.vehicle.id !== vehicle.id);
  localStorage.setItem(DELETED_VEHICLES_KEY, JSON.stringify([{ vehicle, deletedAt }, ...saved]));
}

export function readLocalDeletedVehicles(): DeletedVehicle[] {
  return JSON.parse(localStorage.getItem(DELETED_VEHICLES_KEY) || "[]");
}

export function restoreLocalVehicle(id: string): Vehicle {
  const archived = readLocalDeletedVehicles();
  const row = archived.find((entry) => entry.vehicle.id === id);
  if (!row) throw new Error("Véhicule introuvable");
  const active: Vehicle[] = JSON.parse(localStorage.getItem("ik-tracker-vehicles") || "[]");
  if (!active.some((vehicle) => vehicle.id === id)) {
    localStorage.setItem("ik-tracker-vehicles", JSON.stringify([...active, row.vehicle]));
  }
  localStorage.setItem(DELETED_VEHICLES_KEY, JSON.stringify(archived.filter((entry) => entry.vehicle.id !== id)));
  return row.vehicle;
}