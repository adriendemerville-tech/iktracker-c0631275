// A/B testing léger, sans dépendance externe.
// La variante est tirée une seule fois par navigateur et persistée, puis
// envoyée avec chaque évènement marketing (colonne `variant`) pour être
// agrégée dans /admin > Stats (RPC get_ab_test_results).
//
// SSR : le serveur rend TOUJOURS la variante de contrôle (A) — Googlebot voit
// le H1 canonique. Le swap éventuel n'a lieu qu'après hydratation.

import { isBrowser } from "@/lib/ssr-utils";

export const AB_TEST_ID = "hero_h1_v1";
const STORAGE_KEY = `ab_${AB_TEST_ID}`;

export type HeroVariant = "A" | "B";

export const HERO_VARIANTS: Record<
  HeroVariant,
  { label: string; title: string; highlight: string; subtitle: string }
> = {
  A: {
    label: "A — Gestion de trajets (contrôle)",
    title: "Indemnités kilométriques & barème kilométrique 2026",
    highlight: "100% gratuit",
    subtitle:
      "Calculez, enregistrez et exportez vos frais kilométriques selon le barème URSSAF officiel 2026. Mode Tournée GPS, sync calendrier, export expert-comptable. Outil communautaire gratuit à vie.",
  },
  B: {
    label: "B — Bénéfice fiscal / remboursement",
    title: "Récupérez chaque euro d'indemnités kilométriques",
    highlight: "sans erreur fiscale",
    subtitle:
      "IKtracker calcule vos frais kilométriques au barème URSSAF 2026 et génère le relevé prêt pour votre expert-comptable. Justificatifs conformes, contrôle fiscal serein, gratuit à vie.",
  },
};

/** Variante affichée côté serveur / avant hydratation. */
export const DEFAULT_VARIANT: HeroVariant = "A";

/** Lit la variante déjà assignée à ce navigateur, sans en attribuer une. */
function readVariant(): HeroVariant | null {
  if (!isBrowser()) return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "A" || stored === "B" ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Retourne la variante assignée à ce navigateur (tirage 50/50 persistant).
 * L'assignation n'a lieu QUE sur la page d'accueil (seul endroit où le hero
 * testé est affiché) : sans cela, un visiteur arrivé sur une page blog serait
 * compté dans le dénominateur du test sans jamais avoir vu la variante.
 * Renvoie la variante de contrôle côté serveur.
 */
export function getHeroVariant(): HeroVariant {
  if (!isBrowser()) return DEFAULT_VARIANT;
  const stored = readVariant();
  if (stored) return stored;
  const assigned: HeroVariant = Math.random() < 0.5 ? "A" : "B";
  try {
    window.localStorage.setItem(STORAGE_KEY, assigned);
  } catch {
    /* stockage indisponible : variante non persistée, non trackée */
  }
  return assigned;
}

/**
 * Valeur envoyée au tracking (ex. "hero_h1_v1:B").
 * `null` tant que le visiteur n'a pas vu la home : les évènements des autres
 * pages ne sont pas rattachés au test.
 */
export function getVariantTag(): string | null {
  const stored = readVariant();
  return stored ? `${AB_TEST_ID}:${stored}` : null;
}

