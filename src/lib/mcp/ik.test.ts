import { describe, it, expect } from "vitest";
import { calculateTotalAnnualIK, marginalIK, getForcedRate } from "./ik";

// Le helper MCP doit reproduire exactement le barème de src/types/trip.ts.
describe("MCP IK helper — parité avec le barème de l'app", () => {
  it("tranches identiques au barème officiel", () => {
    expect(calculateTotalAnnualIK(3000, 3)).toBeCloseTo(1587.0, 2);
    expect(calculateTotalAnnualIK(10000, 5)).toBeCloseTo(4960.0, 2);
    expect(calculateTotalAnnualIK(20000, 6)).toBeCloseTo(8937.0, 2);
    expect(calculateTotalAnnualIK(25000, 7)).toBeCloseTo(11750.0, 2);
  });

  it("respecte les overrides tier2 / tier3", () => {
    expect(getForcedRate(5, "tier2")).toBeCloseTo(0.357, 4);
    expect(getForcedRate(5, "tier3")).toBeCloseTo(0.427, 4);
    expect(getForcedRate(5, "auto")).toBeNull();
    expect(calculateTotalAnnualIK(10000, 5, "tier3")).toBeCloseTo(4270.0, 2);
  });
});

describe("marginalIK — changement de véhicule 4 CV → 7+ CV électrique", () => {
  it("recalcule le trajet au barème 7+ CV × 1,2", () => {
    const kia = { fiscal_power: 4, is_electric: false };
    const tesla = { fiscal_power: 9, is_electric: true };
    const oldIk = marginalIK(0, 100, kia, "auto");
    const newIk = marginalIK(0, 100, tesla, "auto");
    expect(oldIk).toBeCloseTo(100 * 0.606, 2); // 60,60 €
    expect(newIk).toBeCloseTo(100 * 0.697 * 1.2, 2); // 83,64 €
    expect(newIk).toBeGreaterThan(oldIk);
  });
});

describe("marginalIK — cumul franchissant 5000 km", () => {
  it("le trajet qui franchit la tranche absorbe la correction du barème cumulatif", () => {
    // 5 CV : 4900 km déjà cumulés, trajet de 200 km → cumul 5100 km.
    const ik = marginalIK(4900, 200, { fiscal_power: 5, is_electric: false }, "auto");
    const attendu = calculateTotalAnnualIK(5100, 5) - calculateTotalAnnualIK(4900, 5);
    expect(ik).toBeCloseTo(attendu, 2);
    // Le barème cumulatif lisse le changement de tranche : le marginal diffère du taux plein.
    expect(ik).not.toBeCloseTo(200 * 0.636, 2);
    expect(ik).toBeGreaterThan(0);
  });
});

describe("marginalIK — suppression d'un trajet", () => {
  it("les trajets suivants réabsorbent le cumul retiré", () => {
    // 3 trajets de 2000 km (5 CV) ; suppression du 1er → les 2 restants repartent de 0.
    const v = { fiscal_power: 5, is_electric: false };
    const avant = [
      marginalIK(0, 2000, v, "auto"),
      marginalIK(2000, 2000, v, "auto"),
      marginalIK(4000, 2000, v, "auto"),
    ];
    const apres = [marginalIK(0, 2000, v, "auto"), marginalIK(2000, 2000, v, "auto")];
    expect(apres[0]).toBeCloseTo(avant[0], 2);
    expect(apres[1]).toBeCloseTo(avant[1], 2);
    const totalAvant = avant.reduce((a, b) => a + b, 0);
    const totalApres = apres.reduce((a, b) => a + b, 0);
    expect(totalApres).toBeCloseTo(calculateTotalAnnualIK(4000, 5), 2);
    expect(totalAvant).toBeCloseTo(calculateTotalAnnualIK(6000, 5), 2);
  });
});
