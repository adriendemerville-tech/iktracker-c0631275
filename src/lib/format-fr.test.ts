import { describe, expect, it } from "vitest";
import { calculateTotalAnnualIK, IK_BAREME_2026 } from "@/types/trip";
import {
  formatBaremeFormula,
  formatBaremePerKm,
  formatFrEuros,
  formatFrNumber,
  formatFrRate,
  FR_NBSP,
} from "./format-fr";

describe("format français des montants", () => {
  it("groupe les milliers comme le simulateur, sans espace sécable", () => {
    expect(formatFrEuros(calculateTotalAnnualIK(15_000, 6))).toBe(`7${FR_NBSP}067${FR_NBSP}€`);
    expect(formatFrEuros(calculateTotalAnnualIK(10_000, 5))).toBe(`4${FR_NBSP}965${FR_NBSP}€`);
    expect(formatFrEuros(7067).includes(" ")).toBe(false);
    expect(formatFrNumber(15_000)).toBe(`15${FR_NBSP}000`);
  });

  it("écrit les taux du barème avec une virgule, sans changer les chiffres", () => {
    const six = IK_BAREME_2026.find((row) => row.cv === "6");
    expect(six).toBeDefined();
    expect(formatFrRate(six!.from5001To20000.rate)).toBe("0,374");
    expect(formatBaremeFormula(six!.from5001To20000)).toBe(
      `(d × 0,374) + 1${FR_NBSP}457${FR_NBSP}€`,
    );
    expect(formatBaremeFormula(six!.upTo5000)).toBe(`d × 0,665${FR_NBSP}€`);
    expect(formatBaremePerKm(six!.from5001To20000)).toBe(
      `0,374${FR_NBSP}€/km + 1${FR_NBSP}457${FR_NBSP}€`,
    );
    expect(formatFrRate(0.37)).toBe("0,370");
  });
});
