import { createFileRoute } from "@tanstack/react-router";
import IndemnitesKilometriques from "@/pages/IndemnitesKilometriques";

export const Route = createFileRoute("/indemnites-kilometriques")({
  head: () => ({
    meta: [
      { title: "Indemnités kilométriques 2026 : barème, calcul et simulateur" },
      {
        name: "description",
        content:
          "Indemnités kilométriques 2026 : barème officiel DGFiP par puissance fiscale, calcul au réel, majoration 20 % électrique, justificatifs URSSAF. Simulateur gratuit + méthode IKtracker (mode tournée GPS, sync agenda, relevés PDF).",
      },
      {
        name: "keywords",
        content:
          "indemnités kilométriques, indemnité kilométrique 2026, calcul indemnité kilométrique, barème indemnités kilométriques, IK 2026, remboursement kilométrique URSSAF",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { property: "og:title", content: "Indemnités kilométriques 2026 : barème et simulateur" },
      {
        property: "og:description",
        content:
          "Barème officiel, méthode de calcul, majoration électrique et justificatifs des indemnités kilométriques 2026. Simulateur gratuit sans inscription.",
      },
      { property: "og:url", content: "https://iktracker.fr/indemnites-kilometriques" },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Indemnités kilométriques 2026 : barème et simulateur" },
      {
        name: "twitter:description",
        content:
          "Barème officiel, calcul, majoration électrique et justificatifs des indemnités kilométriques 2026.",
      },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/indemnites-kilometriques" }],
  }),
  component: IndemnitesKilometriques,
});
