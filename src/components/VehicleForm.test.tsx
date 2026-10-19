import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VehicleForm } from "./VehicleForm";
import type { Vehicle } from "@/types/trip";
import { TooltipProvider } from "./ui/tooltip";

const state = vi.hoisted(() => ({ defaultVehicleId: "kia" as string | null }));
vi.mock("@/hooks/usePreferences", () => ({ usePreferences: () => ({ preferences: state }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => vi.fn() }));
vi.mock("@/lib/registration-scan.functions", () => ({ scanRegistration: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const kia: Vehicle = { id: "kia", make: "Kia", model: "EV2", licensePlate: "HK-678-ZE", fiscalPower: 4, ownerFirstName: "", ownerLastName: "" };
const tesla: Vehicle = { ...kia, id: "tesla", make: "Tesla", model: "Y" };
function form(vehicle: Vehicle, count: number) {
  const onSave = vi.fn();
  const props = { open: true, onOpenChange: vi.fn(), onSave, editVehicle: vehicle, vehicleCount: count };
  const rendered = render(<TooltipProvider><VehicleForm {...props} /></TooltipProvider>);
  return { ...rendered, onSave, props };
}
beforeEach(() => { state.defaultVehicleId = "kia"; });

describe("Véhicule principal", () => {
  it("est activé et impossible à désactiver pour le véhicule unique", () => {
    state.defaultVehicleId = null;
    const { onSave } = form(kia, 1);
    const toggle = screen.getByRole("switch", { name: "Véhicule principal" });
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(onSave.mock.calls[0][1].setAsDefault).toBe(true);
  });
  it("sélectionne le nouveau principal sans demander de changer les trajets passés", () => {
    const { onSave } = form(tesla, 3);
    const toggle = screen.getByRole("switch", { name: "Véhicule principal" });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(onSave.mock.calls[0][1]).toMatchObject({ setAsDefault: true, updatePastTrips: false });
    expect(onSave.mock.calls[0][1].period).toBeUndefined();
  });
  it("désactive l'ancien principal quand un autre devient le défaut", () => {
    const { rerender, props } = form(kia, 3);
    expect(screen.getByRole("switch", { name: "Véhicule principal" })).toBeChecked();
    state.defaultVehicleId = "tesla";
    rerender(<TooltipProvider><VehicleForm {...props} /></TooltipProvider>);
    expect(screen.getByRole("switch", { name: "Véhicule principal" })).not.toBeChecked();
  });
  it("permet de désactiver le principal quand plusieurs véhicules existent", () => {
    const { onSave } = form(kia, 2);
    fireEvent.click(screen.getByRole("switch", { name: "Véhicule principal" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(onSave.mock.calls[0][1].setAsDefault).toBe(false);
  });
});