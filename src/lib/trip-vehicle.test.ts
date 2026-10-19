import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getTripVehicle, preserveTripVehicle } from "./trip-vehicle";
import { recalculateTrips } from "./print/report-shared";
import type { Trip, Vehicle } from "@/types/trip";

const vehicle: Vehicle = { id: "88d7cf8f-36cb-4641-8ca8-4db183e5d3b2", name: "Peugeot 308", licensePlate: "EY-548-KD", fiscalPower: 5, isElectric: false, make: "Peugeot", model: "308", ownerFirstName: "", ownerLastName: "" };
const trip: Trip = { id: "trip", vehicleId: vehicle.id, startLocation: { id: "a", name: "Maison", address: "", type: "home" }, endLocation: { id: "b", name: "Chantier", address: "", type: "other" }, distance: 100, baseDistance: 100, roundTrip: false, purpose: "Chantier", startTime: new Date("2026-10-01"), endTime: new Date("2026-10-01"), ikAmount: 42.7, status: "validated" };

describe("Conservation fiscale des anciens véhicules", () => {
  it("conserve identité, plaque, 5 CV et montant lors de la suppression", () => {
    const archived = preserveTripVehicle(trip, vehicle);
    expect(archived.vehicleId).toBeNull();
    expect(getTripVehicle(archived, [])).toEqual(vehicle);
    expect(archived.ikAmount).toBe(42.7);
    expect(archived.distance).toBe(100);
  });
  it("ne change pas les trajets d'un autre véhicule", () => {
    const other = { ...trip, vehicleId: "other" };
    expect(preserveTripVehicle(other, vehicle)).toBe(other);
  });
  it("préserve le montant historique même si les paramètres actifs changent", () => {
    const archived = preserveTripVehicle(trip, vehicle);
    const rows = recalculateTrips([archived], [{ ...vehicle, fiscalPower: 9, isElectric: true }], "tier3");
    expect(rows[0]?.recalculatedIK).toBe(42.7);
    expect(rows[0]?.appliedRate).toBeCloseTo(0.427);
    expect(rows[0]?.vehicleSnapshot?.fiscalPower).toBe(5);
  });
  it("garde les 9 CV et le statut électrique d'un ancien véhicule", () => {
    const electric = { ...vehicle, fiscalPower: 9, isElectric: true };
    expect(preserveTripVehicle(trip, electric).vehicleSnapshot).toMatchObject({ fiscalPower: 9, isElectric: true });
  });
  it("calcule les trajets actifs à partir de l'UUID complet", () => {
    expect(recalculateTrips([trip], [vehicle])[0]?.recalculatedIK).toBeCloseTo(63.6);
  });
  it("capture seulement les trajets du propriétaire avant le détachement", () => {
    const sql = readFileSync("drizzle/migrations/0006_preserve_trip_vehicle_snapshot.sql", "utf8");
    expect(sql).toContain("WHERE vehicle_id = OLD.id AND user_id = OLD.user_id");
    expect(sql).toContain("vehicle_snapshot = to_jsonb(OLD)");
    expect(sql).toContain("NEW.vehicle_id IS NOT NULL AND NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id");
    expect(sql).not.toMatch(/SET\s+ik_amount/i);
  });
});