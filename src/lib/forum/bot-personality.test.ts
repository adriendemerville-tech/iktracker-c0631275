import { describe, expect, it } from "vitest";
import {
  applyTypos,
  isDuplicateTitle,
  isoWeekKey,
  personaAffinity,
  pickStance,
  titleSimilarity,
  violatesAdviceGuard,
  violatesSeoGuard,
  weeklyDiscussionSlots,
  weightedPick,
} from "./bot-personality";

describe("garde anti-cannibalisation SEO", () => {
  it("rejette les sujets sur les indemnités kilométriques", () => {
    expect(violatesSeoGuard("Comment calculer mes indemnités kilométriques ?")).toBeTruthy();
    expect(violatesSeoGuard("Le barème 2026 change-t-il ?")).toBeTruthy();
    expect(violatesSeoGuard("Mes IK sont fausses")).toBeTruthy();
    expect(violatesSeoGuard("0,63 € par km c'est peu")).toBeTruthy();
  });

  it("laisse passer un sujet métier neutre", () => {
    expect(
      violatesSeoGuard("Comment vous organisez vos rendez-vous du vendredi après-midi ?"),
    ).toBeNull();
  });

  it("rejette le conseil fiscal normatif", () => {
    expect(violatesAdviceGuard("Tu dois déclarer ça aux impôts sans faute")).toBeTruthy();
    expect(violatesAdviceGuard("J'utilise un carnet papier depuis dix ans")).toBeNull();
  });
});

describe("détection de doublons de sujets", () => {
  it("mesure la similarité", () => {
    expect(titleSimilarity("Organiser ses tournées le matin", "Organiser ses tournées le matin")).toBe(1);
    expect(titleSimilarity("Choisir un véhicule utilitaire", "Gérer les impayés clients")).toBeLessThan(0.2);
  });

  it("bloque un titre trop proche", () => {
    expect(
      isDuplicateTitle("Organiser ses tournées matinales", ["Organiser ses tournées le matin"]),
    ).toBe(true);
    expect(isDuplicateTitle("Assurance flotte pour artisan", ["Organiser ses tournées"])).toBe(false);
  });
});

describe("planning hebdomadaire", () => {
  it("produit deux créneaux stables et distincts", () => {
    const key = isoWeekKey(new Date("2026-03-11T10:00:00Z"));
    const a = weeklyDiscussionSlots(key);
    const b = weeklyDiscussionSlots(key);
    expect(a).toEqual(b);
    expect(a).toHaveLength(2);
    expect(a[0]!.day).not.toBe(a[1]!.day);
    for (const slot of a) {
      expect(slot.day).toBeGreaterThanOrEqual(1);
      expect(slot.day).toBeLessThanOrEqual(6);
      expect(slot.hour).toBeGreaterThanOrEqual(0);
      expect(slot.hour).toBeLessThan(24);
    }
  });

  it("change de créneaux d'une semaine à l'autre", () => {
    const w1 = JSON.stringify(weeklyDiscussionSlots("2026-W10"));
    const w2 = JSON.stringify(weeklyDiscussionSlots("2026-W11"));
    expect(w1).not.toBe(w2);
  });
});

describe("sélection pondérée", () => {
  it("respecte les poids", () => {
    const items = ["a", "b"];
    expect(weightedPick(items, (i) => (i === "a" ? 9 : 1), 0.1)).toBe("a");
    expect(weightedPick(items, (i) => (i === "a" ? 9 : 1), 0.99)).toBe("b");
    expect(weightedPick([], () => 1, 0.5)).toBeNull();
  });

  it("favorise les métiers proches", () => {
    expect(personaAffinity("artisan_btp", "artisan_btp")).toBeGreaterThan(
      personaAffinity("artisan_btp", "sante_liberal"),
    );
  });
});

describe("style et posture", () => {
  it("répartit 75/25 entre réponses constructives et bruit", () => {
    expect(pickStance(0.1)).toBe("constructive");
    expect(pickStance(0.8)).toBe("sceptique");
    expect(pickStance(0.9)).toBe("desaccord");
    expect(pickStance(0.99)).toBe("breve");
  });

  it("n'altère pas le texte quand le taux de fautes est nul", () => {
    const text = "Ça fait déjà trois ans que je fais comme ça.";
    expect(applyTypos(text, 0)).toBe(text);
  });

  it("introduit des imperfections quand le taux est élevé", () => {
    const text = "Ça fait déjà trois ans que je fais comme ça. Même chose pour mon associé.";
    expect(applyTypos(text, 0.2, () => 0.01)).not.toBe(text);
  });
});
