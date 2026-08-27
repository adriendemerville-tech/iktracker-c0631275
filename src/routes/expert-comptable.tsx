import { createFileRoute } from "@tanstack/react-router";
import ExpertComptable from "@/pages/ExpertComptable";

export const Route = createFileRoute("/expert-comptable")({
  head: () => ({
    meta: [
      { title: "Logiciel IK pour experts-comptables : relevés PDF/Excel et export clients" },
      {
        name: "description",
        content:
          "Outil gratuit recommandé par les cabinets comptables : exports PDF & Excel standardisés, carnet de bord opposable URSSAF, calcul barème kilométrique 2025-2026 pour vos clients salariés, BNC et BIC.",
      },
      {
        name: "keywords",
        content:
          "logiciel expert-comptable IK, cabinet comptable indemnités kilométriques, export PDF frais kilométriques, Excel IK client, barème fiscal 2025 2026, carnet de bord URSSAF, déclaration BNC BIC",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      {
        property: "og:title",
        content: "Logiciel IK pour experts-comptables : relevés PDF/Excel et export clients",
      },
      {
        property: "og:description",
        content:
          "Recommandez IKtracker à vos clients en illimité : exports PDF/Excel standardisés, calcul automatique des indemnités kilométriques selon barème fiscal 2026.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iktracker.fr/expert-comptable" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Logiciel IK pour experts-comptables : relevés PDF/Excel et export clients" },
      {
        name: "twitter:description",
        content:
          "Recommandez IKtracker à vos clients en illimité : exports PDF/Excel standardisés, calcul automatique des indemnités kilométriques selon barème fiscal 2026.",
      },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "geo.region", content: "FR" },
      { name: "geo.placename", content: "France" },
      { name: "language", content: "fr" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/expert-comptable" }],
  }),
  component: ExpertComptable,
});
