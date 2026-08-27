import { createFileRoute } from "@tanstack/react-router";
import FraisReels from "@/pages/FraisReels";

export const Route = createFileRoute("/frais-reels")({
  head: () => ({
    meta: [
      { title: "Frais réels ou abattement 10 % : simulateur et comparatif impôts 2026" },
      {
        name: "description",
        content:
          "Frais réels 2026 : comparez en 1 minute l'abattement de 10% et vos frais kilométriques au barème URSSAF. Simulateur gratuit et justificatifs prêts pour le fisc.",
      },
      {
        name: "keywords",
        content:
          "frais réels 2025, frais reel impot, calcul frais réel, frais kilometrique impot, abattement 10%, déclaration impôts 2026, optimisation fiscale, justifier frais kilométrique",
      },
      { property: "og:title", content: "Frais réels ou abattement 10 % : simulateur et comparatif impôts 2026" },
      {
        property: "og:description",
        content:
          "Comparez l'abattement forfaitaire et les frais réels kilométriques. Outil gratuit pour optimiser votre déclaration d'impôts.",
      },
      { property: "og:url", content: "https://iktracker.fr/frais-reels" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/frais-reels" }],
  }),
  component: FraisReels,
});
