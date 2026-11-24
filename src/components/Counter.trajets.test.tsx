import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Counter } from "./Counter";

function digits() {
  return (document.body.textContent ?? "").replace(/\D/g, "");
}

describe("compteurs trajets et kilomètres", () => {
  it("affiche le nombre de trajets", () => {
    render(<Counter value={9778} initialValue={9778} label="trajets enregistrés" unit="" />);
    expect(screen.getByText("trajets enregistrés")).toBeInTheDocument();
    expect(digits()).toContain("9778");
    expect(digits()).not.toBe("0");
  });

  it("affiche les kilomètres suivis", () => {
    render(
      <Counter value={1_280_700} initialValue={1_280_700} label="kilomètres suivis" unit="km" />,
    );
    expect(screen.getByText("kilomètres suivis")).toBeInTheDocument();
    expect(screen.getByText("km")).toBeInTheDocument();
    expect(digits()).toContain("1280700");
  });

  it("masque le chiffre quand la mesure est indisponible", () => {
    render(<Counter value={null} initialValue={null} label="trajets enregistrés" unit="" />);
    expect(screen.getByText("trajets enregistrés")).toBeInTheDocument();
    expect(screen.getByText("indisponible")).toBeInTheDocument();
    expect(digits()).toBe("");
    expect(document.body.textContent).toContain("—");
  });
});
