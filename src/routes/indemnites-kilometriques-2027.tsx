import { createFileRoute } from "@tanstack/react-router";
import IndemnitesKilometriques2027 from "@/pages/IndemnitesKilometriques2027";

export const Route = createFileRoute("/indemnites-kilometriques-2027")({
  head: () => ({
    meta: [
      { title: "Indemnités kilométriques 2027 : barème attendu, calendrier et alerte" },
      {
        name: "description",
        content:
          "Barème kilométrique 2027 : publication DGFiP attendue au printemps. En attendant, barème 2026 en vigueur, majoration +20 % électrique, bascule automatique avec IKtracker.",
      },
      {
        name: "keywords",
        content:
          "indemnités kilométriques 2027, barème kilométrique 2027, IK 2027, barème IK 2027, indemnité kilométrique 2027 DGFiP",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { property: "og:title", content: "Indemnités kilométriques 2027 : barème attendu, calendrier et alerte" },
      {
        property: "og:description",
        content:
          "Suivi de la publication du barème kilométrique 2027 : calendrier prévisionnel, barème 2026 en vigueur et bascule automatique au 1er janvier.",
      },
      { property: "og:url", content: "https://iktracker.fr/indemnites-kilometriques-2027" },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Indemnités kilométriques 2027 : barème attendu et alerte" },
      {
        name: "twitter:description",
        content:
          "Barème kilométrique 2027 : calendrier de publication, barème 2026 en vigueur et alerte automatique.",
      },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/indemnites-kilometriques-2027" }],
  }),
  component: IndemnitesKilometriques2027,
});
