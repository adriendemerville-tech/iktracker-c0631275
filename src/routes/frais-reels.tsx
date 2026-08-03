import { createFileRoute } from "@tanstack/react-router";
import FraisReels from "@/pages/FraisReels";

export const Route = createFileRoute("/frais-reels")({
  head: () => ({
    meta: [
      {"title":"Frais réels 2025-2026 vs Abattement 10% — Simulateur impôts gratuit"},
      {"name":"description","content":"Calcul frais réels 2025-2026 : comparez l'abattement forfaitaire de 10% et les frais kilométriques pour impôts. Simulateur gratuit, barème URSSAF officiel, justificatifs pour l'administration fiscale."},
      {"name":"keywords","content":"frais réels 2025, frais reel impot, calcul frais réel, frais kilometrique impot, abattement 10%, déclaration impôts 2026, optimisation fiscale, justifier frais kilométrique"},
      {"property":"og:title","content":"Frais Réels vs Abattement 10% : Calculateur Gratuit 2026"},
      {"property":"og:description","content":"Comparez l'abattement forfaitaire et les frais réels kilométriques. Outil gratuit pour optimiser votre déclaration d'impôts."},
      {"property":"og:url","content":"https://iktracker.fr/frais-reels"},
      {"property":"og:type","content":"website"},
    ],
    links: [
      {"rel":"canonical","href":"https://iktracker.fr/frais-reels"},
    ],
  }),
  component: FraisReels,
});
