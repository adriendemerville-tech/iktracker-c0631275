import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompleteAddressSheet } from "./CompleteAddressSheet";
import type { Trip } from "@/types/trip";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  functions: { invoke: mocks.invoke }, from: () => ({ update: mocks.update }),
} }));
vi.mock("@/hooks/useGeolocation", () => ({ useGeolocation: () => ({ getCurrentPosition: vi.fn(), loading: false }) }));
vi.mock("@/lib/geocoding", () => ({ reverseGeocode: vi.fn() }));
vi.mock("@/components/AddressAutocompleteInput", () => ({ AddressAutocompleteInput: ({ value, onChange }: { value: string; onChange: (s: string) => void }) => <input value={value} onChange={e => onChange(e.target.value)} /> }));
const trip: Trip = {
  id: "trip-1", purpose: "Métrage Cavaillon", vehicleId: "kia", distance: 0, baseDistance: 0,
  roundTrip: false, startTime: new Date(), endTime: new Date(), ikAmount: 0, status: "pending_location",
  startLocation: { id: "start", name: "Maison", address: "255 Chemin des Masques", type: "home" },
  endLocation: { id: "end", name: "Cavaillon", address: "Cavaillon, 84300", type: "client" },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoke.mockResolvedValue({ data: { success: true, distance: 25 }, error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockResolvedValue({ error: null });
});
describe("Compléter le trajet — motif", () => {
  it("préremplit le motif et enregistre le motif modifié", async () => {
    const completed = vi.fn();
    render(<CompleteAddressSheet open onOpenChange={vi.fn()} trip={trip} savedLocations={[]} onCompleted={completed} />);
    const input = screen.getByRole("textbox", { name: "Motif" });
    expect(input).toHaveValue("Métrage Cavaillon");
    fireEvent.change(input, { target: { value: "  Rendez-vous client  " } });
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    await waitFor(() => expect(completed).toHaveBeenCalled());
    expect(mocks.update).toHaveBeenCalledWith({ purpose: "Rendez-vous client" });
    expect(mocks.eq).toHaveBeenCalledWith("id", "trip-1");
  });
});