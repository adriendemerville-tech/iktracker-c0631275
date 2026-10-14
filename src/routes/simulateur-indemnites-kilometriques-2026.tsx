import { createFileRoute } from "@tanstack/react-router";
import SimulateurIndemnitesKilometriques2026 from "@/pages/SimulateurIndemnitesKilometriques2026";

export const Route = createFileRoute("/simulateur-indemnites-kilometriques-2026")({
  head: () => ({
    meta: [
      {
        title:
          "Simulateur indemnités kilométriques 2026 : calculez vos IK au barème officiel",
      },
      {
        name: "description",
        content:
          "Simulateur d'indemnités kilométriques 2026 gratuit et sans inscription : barème officiel DGFiP, trois tranches kilométriques, majoration de 20 % pour les véhicules 100 % électriques. Résultat immédiat.",
      },
      {
        name: "keywords",
        content:
          "simulateur indemnités kilométriques, simulateur IK 2026, calcul indemnités kilométriques, simulateur barème kilométrique, calcul IK en ligne gratuit, simulateur frais kilométriques",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      {
        property: "og:title",
        content: "Simulateur indemnités kilométriques 2026 : calculez vos IK au barème officiel",
      },
      {
        property: "og:description",
        content:
          "Puissance fiscale et kilomètres annuels : le simulateur applique le barème DGFiP 2026 et la majoration de 20 % pour les véhicules électriques. Gratuit, sans inscription.",
      },
      {
        property: "og:url",
        content: "https://iktracker.fr/simulateur-indemnites-kilometriques-2026",
      },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Simulateur indemnités kilométriques 2026 : calculez vos IK au barème officiel",
      },
      {
        name: "twitter:description",
        content:
          "Calcul gratuit de vos indemnités kilométriques 2026 selon le barème officiel, avec majoration électrique de 20 %.",
      },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://iktracker.fr/simulateur-indemnites-kilometriques-2026",
      },
    ],
  }),
  component: SimulateurIndemnitesKilometriques2026,
});
