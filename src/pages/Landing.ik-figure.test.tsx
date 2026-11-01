import { beforeAll, describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Landing from "./Landing";
import { calculateTotalAnnualIK } from "@/types/trip";
import { TestRouter } from "@/test/router";

const homeExampleIkLabel =
  calculateTotalAnnualIK(15_000, 6).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";

describe("Landing IK example", () => {
  beforeAll(() => {
    class FakeIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    Object.defineProperty(HTMLMediaElement.prototype, "load", {
      configurable: true,
      value: () => undefined,
    });
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: () => Promise.resolve(),
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value: () => undefined,
    });
  });

  it("shows the 6 CV / 15 000 km amount from the official scale", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TestRouter>
          <Landing />
        </TestRouter>
      </QueryClientProvider>,
    );
    const text = document.body.textContent ?? "";
    expect(text).toContain(homeExampleIkLabel);
    expect(text).toMatch(/pour 15\s000 km \(6 CV\)/);
    expect(text).not.toMatch(/6\s400 €/);
  });
});
