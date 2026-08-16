import { createFileRoute } from "@tanstack/react-router";
import NoteDeFraisKilometrique from "@/pages/NoteDeFraisKilometrique";

export const Route = createFileRoute("/note-de-frais-kilometrique")({
  head: () => ({
    meta: [
      { title: "Note de frais kilométrique 2025-2026 | Modèle & calcul gratuit" },
      {
        name: "description",
        content:
          "Comment faire une note de frais kilométrique conforme URSSAF en 2025-2026 : modèle, calcul automatique selon barème officiel, export PDF & Excel. Gratuit pour salariés, libéraux et auto-entrepreneurs.",
      },
      {
        name: "keywords",
        content:
          "note de frais kilométrique, modèle note de frais kilométrique, comment faire une note de frais kilométrique, calcul note de frais, justifier frais kilométrique impôt, remboursement kilométrique",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { property: "og:title", content: "Note de frais kilométrique 2025-2026 | Modèle gratuit" },
      {
        property: "og:description",
        content:
          "Modèle de note de frais kilométrique conforme URSSAF + calcul automatique selon barème 2025-2026. Export PDF & Excel gratuit.",
      },
      { property: "og:url", content: "https://iktracker.fr/note-de-frais-kilometrique" },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/note-de-frais-kilometrique" }],
  }),
  component: NoteDeFraisKilometrique,
});
