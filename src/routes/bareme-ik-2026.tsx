import { createFileRoute } from "@tanstack/react-router";
import BaremeIK2026 from "@/pages/BaremeIK2026";

export const Route = createFileRoute("/bareme-ik-2026")({
  head: () => ({
    meta: [
      { title: "Barème kilométrique 2026 URSSAF : tableau + simulateur" },
      {
        name: "description",
        content:
          "Barème kilométrique 2026 officiel URSSAF : tableau IK par CV, simulateur gratuit en 10 secondes et majoration +20% véhicule électrique. Sans inscription.",
      },
      {
        name: "keywords",
        content:
          "barème kilométrique 2025, barème kilométrique 2026, simulateur frais kilométrique, indemnités kilométriques URSSAF, barème ik 2026, frais kilométrique impot, calcul IK, véhicule électrique IK, majoration 20% électrique",
      },
      {
        property: "og:title",
        content: "Barème Kilométrique 2026 Officiel - Simulateur IK Gratuit",
      },
      {
        property: "og:description",
        content:
          "Barème kilométrique 2026 officiel : tableau des indemnités kilométriques par CV, simulateur IK gratuit et calcul automatique.",
      },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:url", content: "https://iktracker.fr/bareme-ik-2026" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Barème Kilométrique 2026 Officiel | IKtracker" },
      {
        name: "twitter:description",
        content:
          "Barème kilométrique 2026 officiel : tableau des indemnités kilométriques par CV, simulateur IK gratuit et calcul automatique.",
      },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "geo.region", content: "FR" },
      { name: "geo.placename", content: "France" },
      { name: "language", content: "fr" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/bareme-ik-2026" }],
  }),
  component: BaremeIK2026,
});
