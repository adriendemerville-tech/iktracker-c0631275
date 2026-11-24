import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Counter } from "./Counter";
import { displayedRegisteredUserCount } from "@/lib/user-count";

describe("compteur inscrits", () => {
  it("affiche le nombre réel plus le décalage", () => {
    const shown = displayedRegisteredUserCount(627);
    render(<Counter value={shown} initialValue={shown} label="inscrits" unit="" />);
    expect(screen.getByText("inscrits")).toBeInTheDocument();
    const digits = (document.body.textContent ?? "").replace(/\D/g, "");
    expect(digits).toContain("2059");
    expect(digits).not.toContain("1000");
  });

  it("masque le chiffre quand le comptage est indisponible", () => {
    render(<Counter value={null} initialValue={null} label="inscrits" unit="" />);
    expect(screen.getByText("inscrits")).toBeInTheDocument();
    expect(screen.getByText("indisponible")).toBeInTheDocument();
    expect((document.body.textContent ?? "").replace(/\D/g, "")).toBe("");
  });
});
