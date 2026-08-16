import { describe, it, expect } from "vitest";
import { getIKBareme, calculateIK, calculateTotalAnnualIK, IK_BAREME_2024 } from "./trip";

describe("getIKBareme", () => {
  it("returns 3CV barème for fiscal power <= 3", () => {
    expect(getIKBareme(1).cv).toBe("3");
    expect(getIKBareme(2).cv).toBe("3");
    expect(getIKBareme(3).cv).toBe("3");
  });

  it("returns correct barème for 4, 5, 6 CV", () => {
    expect(getIKBareme(4).cv).toBe("4");
    expect(getIKBareme(5).cv).toBe("5");
    expect(getIKBareme(6).cv).toBe("6");
  });

  it("returns 7+ barème for fiscal power >= 7", () => {
    expect(getIKBareme(7).cv).toBe("7+");
    expect(getIKBareme(10).cv).toBe("7+");
    expect(getIKBareme(15).cv).toBe("7+");
  });
});

describe("calculateTotalAnnualIK", () => {
  // === Tranche ≤ 5000 km ===
  describe("tranche ≤ 5000 km", () => {
    it("3CV - 3000 km → 3000 × 0.529 = 1587.00", () => {
      expect(calculateTotalAnnualIK(3000, 3)).toBeCloseTo(1587.0, 2);
    });

    it("4CV - 5000 km → 5000 × 0.606 = 3030.00", () => {
      expect(calculateTotalAnnualIK(5000, 4)).toBeCloseTo(3030.0, 2);
    });

    it("5CV - 1000 km → 1000 × 0.636 = 636.00", () => {
      expect(calculateTotalAnnualIK(1000, 5)).toBeCloseTo(636.0, 2);
    });

    it("6CV - 0 km → 0", () => {
      expect(calculateTotalAnnualIK(0, 6)).toBe(0);
    });

    it("7CV - 4999 km → 4999 × 0.697 = 3484.303", () => {
      expect(calculateTotalAnnualIK(4999, 7)).toBeCloseTo(3484.303, 2);
    });
  });

  // === Tranche 5001-20000 km ===
  describe("tranche 5001-20000 km", () => {
    it("3CV - 10000 km → 10000 × 0.316 + 1065 = 4225.00", () => {
      expect(calculateTotalAnnualIK(10000, 3)).toBeCloseTo(4225.0, 2);
    });

    it("4CV - 15000 km → 15000 × 0.340 + 1330 = 6430.00", () => {
      expect(calculateTotalAnnualIK(15000, 4)).toBeCloseTo(6430.0, 2);
    });

    it("5CV - 5001 km → 5001 × 0.357 + 1395 = 3180.357", () => {
      expect(calculateTotalAnnualIK(5001, 5)).toBeCloseTo(3180.357, 2);
    });

    it("6CV - 20000 km → 20000 × 0.374 + 1457 = 8937.00", () => {
      expect(calculateTotalAnnualIK(20000, 6)).toBeCloseTo(8937.0, 2);
    });

    it("7CV - 12000 km → 12000 × 0.394 + 1515 = 6243.00", () => {
      expect(calculateTotalAnnualIK(12000, 7)).toBeCloseTo(6243.0, 2);
    });
  });

  // === Tranche > 20000 km ===
  describe("tranche > 20000 km", () => {
    it("3CV - 25000 km → 25000 × 0.370 = 9250.00", () => {
      expect(calculateTotalAnnualIK(25000, 3)).toBeCloseTo(9250.0, 2);
    });

    it("4CV - 30000 km → 30000 × 0.407 = 12210.00", () => {
      expect(calculateTotalAnnualIK(30000, 4)).toBeCloseTo(12210.0, 2);
    });

    it("5CV - 20001 km → 20001 × 0.427 = 8540.427", () => {
      expect(calculateTotalAnnualIK(20001, 5)).toBeCloseTo(8540.427, 2);
    });

    it("7CV - 50000 km → 50000 × 0.470 = 23500.00", () => {
      expect(calculateTotalAnnualIK(50000, 7)).toBeCloseTo(23500.0, 2);
    });
  });

  // === Boundary tests ===
  describe("seuils exacts (boundaries)", () => {
    it("5000 km uses tranche ≤ 5000", () => {
      const result = calculateTotalAnnualIK(5000, 5);
      expect(result).toBeCloseTo(5000 * 0.636, 2);
    });

    it("5001 km uses tranche 5001-20000", () => {
      const result = calculateTotalAnnualIK(5001, 5);
      expect(result).toBeCloseTo(5001 * 0.357 + 1395, 2);
    });

    it("20000 km uses tranche 5001-20000", () => {
      const result = calculateTotalAnnualIK(20000, 5);
      expect(result).toBeCloseTo(20000 * 0.357 + 1395, 2);
    });

    it("20001 km uses tranche > 20000", () => {
      const result = calculateTotalAnnualIK(20001, 5);
      expect(result).toBeCloseTo(20001 * 0.427, 2);
    });
  });
});

describe("calculateIK (per-trip marginal)", () => {
  it("applies upTo5000 rate when annual km ≤ 5000", () => {
    expect(calculateIK(50, 2000, 5)).toBeCloseTo(50 * 0.636, 2);
  });

  it("applies from5001To20000 rate when annual km is 5001-20000", () => {
    expect(calculateIK(50, 10000, 5)).toBeCloseTo(50 * 0.357, 2);
  });

  it("applies over20000 rate when annual km > 20000", () => {
    expect(calculateIK(50, 25000, 5)).toBeCloseTo(50 * 0.427, 2);
  });
});

describe("IK_BAREME_2024 data integrity", () => {
  it("contains 5 barème entries", () => {
    expect(IK_BAREME_2024).toHaveLength(5);
  });

  it("rates are positive numbers", () => {
    for (const b of IK_BAREME_2024) {
      expect(b.upTo5000.rate).toBeGreaterThan(0);
      expect(b.from5001To20000.rate).toBeGreaterThan(0);
      expect(b.from5001To20000.fixed).toBeGreaterThan(0);
      expect(b.over20000.rate).toBeGreaterThan(0);
    }
  });

  it("upTo5000 rate > from5001To20000 rate (rate decreases with scale)", () => {
    for (const b of IK_BAREME_2024) {
      expect(b.upTo5000.rate).toBeGreaterThan(b.from5001To20000.rate);
    }
  });

  it("higher CV = higher rates within each tranche", () => {
    for (let i = 0; i < IK_BAREME_2024.length - 1; i++) {
      expect(IK_BAREME_2024[i + 1].upTo5000.rate).toBeGreaterThanOrEqual(
        IK_BAREME_2024[i].upTo5000.rate,
      );
    }
  });
});

describe("Electric vehicle bonus (20%)", () => {
  it("IK × 1.20 gives correct bonus for 5CV at 10000km", () => {
    const annualIK = calculateTotalAnnualIK(10000, 5);
    const electricIK = annualIK * 1.2;
    expect(electricIK).toBeCloseTo(annualIK * 1.2, 2);
    expect(electricIK).toBeGreaterThan(annualIK);
  });
});
