import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveTripStats } from "./useLiveTripStats";

const fetchStats = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-start", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-start")>("@tanstack/react-start");
  return { ...actual, useServerFn: () => fetchStats };
});

function renderStats(props: Parameters<typeof useLiveTripStats>[0] = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(() => useLiveTripStats(props), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

describe("useLiveTripStats", () => {
  beforeEach(() => {
    fetchStats.mockReset();
  });

  it("affiche tout de suite la mesure déjà rendue", () => {
    fetchStats.mockReturnValue(new Promise(() => {}));
    const { result } = renderStats({ initialTripCount: 9778, initialTotalKm: 1_280_700 });
    expect(result.current.tripCount).toBe(9778);
    expect(result.current.totalKm).toBe(1_280_700);
    expect(fetchStats).not.toHaveBeenCalled();
  });

  it("ne garde pas un couple nul comme donnée fraîche", async () => {
    fetchStats.mockResolvedValue({ tripCount: 0, totalKm: 0 });
    const { result } = renderStats({ initialTripCount: 0, initialTotalKm: 0 });
    expect(result.current.tripCount).toBeNull();
    expect(result.current.totalKm).toBeNull();
    await waitFor(() => expect(fetchStats).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tripCount).toBeNull();
    expect(result.current.totalKm).toBeNull();
  });

  it("remplace l'absence de mesure par la lecture, sans passer par zéro", async () => {
    fetchStats.mockResolvedValue({ tripCount: 9778, totalKm: 1_280_700 });
    const { result } = renderStats({});
    expect(result.current.tripCount).toBeNull();
    expect(result.current.totalKm).toBeNull();
    await waitFor(() => expect(result.current.tripCount).toBe(9778));
    expect(result.current.totalKm).toBe(1_280_700);
  });
});
