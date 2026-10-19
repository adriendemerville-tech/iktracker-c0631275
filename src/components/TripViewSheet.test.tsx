import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TripViewSheet } from "./TripViewSheet";
import { calculateTotalAnnualIK, type Trip, type Vehicle } from "@/types/trip";

vi.mock("@/hooks/useGoogleMaps", () => ({ useGoogleMaps: () => ({}) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/geocoding", () => ({ extractCityFromAddress: (s: string) => s, geocodeAddress: vi.fn() }));
vi.mock("@/lib/distance", () => ({ calculateDrivingMatrix: vi.fn(), optimizeStopOrder: vi.fn() }));
vi.mock("./AddressAutocompleteInput", () => ({ AddressAutocompleteInput: () => null }));

const vehicles: Vehicle[] = [
  { id: "kia", name: "KIA EV2", make: "KIA", model: "EV2", fiscalPower: 4, isElectric: true, licensePlate: "HK-678-ZE", ownerFirstName: "", ownerLastName: "" },
  { id: "tesla", name: "TESLA MODEL Y", make: "TESLA", model: "MODEL Y", fiscalPower: 9, isElectric: true, licensePlate: "HM-147-ZG", ownerFirstName: "", ownerLastName: "" },
];
const trip: Trip = {
  id: "trip-1", vehicleId: "kia", distance: 100, baseDistance: 50, roundTrip: true,
  startTime: new Date("2026-10-19T10:00:00"), endTime: new Date("2026-10-19T11:00:00"),
  ikAmount: 72.72, purpose: "Rendez-vous", status: "validated",
  startLocation: { id: "start", name: "Maison", address: "Maison", type: "home" },
  endLocation: { id: "end", name: "Client", address: "Client", type: "client" },
};
async function selectTesla() {
  fireEvent.keyDown(screen.getByRole("button", { name: "Changer le véhicule du trajet" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: /TESLA MODEL Y/ }));
}

describe("Changement du véhicule dans les détails du trajet", () => {
  it("enregistre seulement le véhicule et affiche les IK recalculées renvoyées par updateTrip", async () => {
    const ikAmount = calculateTotalAnnualIK(100, 9) * 1.2;
    expect(ikAmount).toBeCloseTo(83.64, 2);
    const updateTrip = vi.fn().mockResolvedValue({ ...trip, vehicleId: "tesla", ikAmount });
    render(<TripViewSheet open onOpenChange={vi.fn()} trip={trip} vehicle={vehicles[0]} vehicles={vehicles} updateTrip={updateTrip} />);
    await selectTesla();
    await waitFor(() => expect(updateTrip).toHaveBeenCalledWith("trip-1", { vehicleId: "tesla" }));
    expect(await screen.findByText("+83.64 €")).toBeInTheDocument();
    expect(screen.getByText("100.0 km")).toBeInTheDocument();
    expect(screen.getByText("HM-147-ZG")).toBeInTheDocument();
  });

  it("conserve le véhicule et les IK si la sauvegarde échoue", async () => {
    const updateTrip = vi.fn().mockResolvedValue(null);
    render(<TripViewSheet open onOpenChange={vi.fn()} trip={trip} vehicle={vehicles[0]} vehicles={vehicles} updateTrip={updateTrip} />);
    await selectTesla();
    await waitFor(() => expect(screen.getByRole("button", { name: "Changer le véhicule du trajet" })).not.toBeDisabled());
    expect(updateTrip).toHaveBeenCalledTimes(1);
    expect(screen.getByText("HK-678-ZE")).toBeInTheDocument();
    expect(screen.getByText("+72.72 €")).toBeInTheDocument();
  });

  it("ne sauvegarde rien en sélectionnant le véhicule déjà affecté", async () => {
    const updateTrip = vi.fn();
    render(<TripViewSheet open onOpenChange={vi.fn()} trip={trip} vehicle={vehicles[0]} vehicles={vehicles} updateTrip={updateTrip} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Changer le véhicule du trajet" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: /KIA EV2/ }));
    expect(updateTrip).not.toHaveBeenCalled();
  });
});