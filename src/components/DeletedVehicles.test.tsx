import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeletedVehicles } from "./DeletedVehicles";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), preference: vi.fn(), archive: vi.fn(), active: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/hooks/usePreferences", () => ({ usePreferences: () => ({ preferences: { defaultVehicleId: "another" }, updatePreference: mocks.preference }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc: mocks.rpc,
  from: (table: string) => ({ select: () => ({ eq: (_field: string, user: string) => {
    expect(user).toBe("owner");
    return table === "deleted_vehicles" ? { order: mocks.archive } : mocks.active();
  } }) }),
} }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.active.mockResolvedValue({ data: [{ id: "restored" }, { id: "another" }], error: null });
  mocks.archive.mockResolvedValue({ data: [{ deleted_at: "2026-10-19T09:38:00Z", vehicle_data: { id: "restored", name: "Tesla", make: "Tesla", model: "Model Y", fiscal_power: 9, is_electric: true, license_plate: "HM-147-ZG" } }], error: null });
});
function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><DeletedVehicles /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Véhicules supprimés" }));
}
it("restaure le véhicule sélectionné et conserve le principal existant", async () => {
  mocks.rpc.mockResolvedValue({ error: null });
  open();
  fireEvent.click(await screen.findByRole("button", { name: "Restaurer" }));
  await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("restore_deleted_vehicle", { p_vehicle_id: "restored" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Restaurer" })).not.toBeDisabled());
  expect(mocks.preference).not.toHaveBeenCalled();
});
it("conserve la possibilité de réessayer quand la restauration échoue", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "denied" } });
  open();
  fireEvent.click(await screen.findByRole("button", { name: "Restaurer" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Restaurer" })).not.toBeDisabled());
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  expect(mocks.preference).not.toHaveBeenCalled();
});
it("définit le véhicule restauré comme principal s'il est le seul actif", async () => {
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.active.mockResolvedValue({ data: [{ id: "restored" }], error: null });
  open();
  fireEvent.click(await screen.findByRole("button", { name: "Restaurer" }));
  await waitFor(() => expect(mocks.preference).toHaveBeenCalledWith("defaultVehicleId", "restored"));
});