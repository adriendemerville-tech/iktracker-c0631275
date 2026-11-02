import { beforeAll, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Landing from "./Landing";
import { calculateTotalAnnualIK } from "@/types/trip";
import { formatFrEuros } from "@/lib/format-fr";
import { TestRouter } from "@/test/router";

const homeExampleIkLabel = formatFrEuros(calculateTotalAnnualIK(15_000, 6));

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
    expect(homeExampleIkLabel).toBe("7\u00a0067\u00a0€");
    expect(text).toMatch(/pour 15\s000 km \(6 CV\)/);
    expect(text).not.toMatch(/6\s400 €/);
    expect(text).toContain("0,374");
    expect(text).not.toContain("0.374");
    expect(text).toContain("De 5 001 à 20 000 km");
    expect(text).toContain("Voir le barème complet");
    expect(text).toContain("Voir le barème complet (voitures, motos, cyclomoteurs)");
    const baremeLink = screen.getByRole("link", { name: /Voir le barème complet/ });
    expect(baremeLink.className).toContain("whitespace-normal");
    expect(baremeLink.className).toContain("max-w-full");

    const excelSentence =
      "Formules cassées, oublis de trajets, calculs d'IK approximatifs... IKtracker automatise tout selon le barème officiel URSSAF et vous fait gagner des heures chaque mois.";
    expect(text).toContain(excelSentence);
    expect(text.match(/IKtracker automatise tout selon le/g)).toHaveLength(1);
    const urssafLink = screen.getByRole("link", { name: "barème officiel URSSAF" });
    expect(urssafLink).toHaveAttribute(
      "href",
      "https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/indemnites-kilometriques.html",
    );
  });
});
