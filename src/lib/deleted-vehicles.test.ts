import { beforeEach, describe, expect, it } from "vitest";
import { archiveLocalVehicle, readLocalDeletedVehicles, restoreLocalVehicle } from "./deleted-vehicles";
import type { Vehicle } from "@/types/trip";

const vehicle: Vehicle = { id: "tesla", name: "Tesla", make: "Tesla", model: "Model Y", licensePlate: "HM-147-ZG", fiscalPower: 9, isElectric: true, ownerFirstName: "", ownerLastName: "" };
beforeEach(() => localStorage.clear());
describe("Restauration des véhicules supprimés", () => {
  it("conserve toutes les données du véhicule avec la date de suppression", () => {
    archiveLocalVehicle(vehicle, "2026-10-19T09:38:00Z");
    expect(readLocalDeletedVehicles()).toEqual([{ vehicle, deletedAt: "2026-10-19T09:38:00Z" }]);
  });
  it("restaure le véhicule avec son identifiant sans changer les trajets ni leurs IK", () => {
    const trips = [{ id: "trip", vehicleId: null, distance: 100, ikAmount: 83.64 }];
    localStorage.setItem("ik-tracker-trips", JSON.stringify(trips));
    archiveLocalVehicle(vehicle);
    expect(restoreLocalVehicle("tesla")).toEqual(vehicle);
    expect(JSON.parse(localStorage.getItem("ik-tracker-vehicles") || "[]")).toEqual([vehicle]);
    expect(readLocalDeletedVehicles()).toEqual([]);
    expect(JSON.parse(localStorage.getItem("ik-tracker-trips") || "[]")).toEqual(trips);
  });
  it("refuse un véhicule absent et ne crée aucun véhicule", () => {
    expect(() => restoreLocalVehicle("absent")).toThrow("Véhicule introuvable");
    expect(localStorage.getItem("ik-tracker-vehicles")).toBeNull();
  });
  it("ne duplique pas un véhicule déjà actif", () => {
    archiveLocalVehicle(vehicle);
    localStorage.setItem("ik-tracker-vehicles", JSON.stringify([vehicle]));
    restoreLocalVehicle(vehicle.id);
    expect(JSON.parse(localStorage.getItem("ik-tracker-vehicles") || "[]")).toHaveLength(1);
  });
});