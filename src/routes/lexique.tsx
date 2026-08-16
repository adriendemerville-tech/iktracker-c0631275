import { createFileRoute } from "@tanstack/react-router";
import Lexique from "@/pages/Lexique";

export const Route = createFileRoute("/lexique")({
  head: () => ({
    meta: [
      { title: "Lexique des indemnités kilométriques 2026 | IKtracker" },
      {
        name: "description",
        content:
          "Dictionnaire des termes IK : barème 2026, frais réels, BNC, URSSAF, professions libérales. Définitions claires pour indépendants.",
      },
      {
        name: "keywords",
        content:
          "lexique indemnités kilométriques, barème kilométrique 2026, frais réels définition, BNC, URSSAF, profession libérale, indépendant France",
      },
      { property: "og:title", content: "Lexique des indemnités kilométriques France 2026" },
      {
        property: "og:description",
        content:
          "Tous les termes, acronymes et concepts des IK expliqués simplement pour les indépendants et professions libérales.",
      },
      { property: "og:url", content: "https://iktracker.fr/lexique" },
      { property: "og:type", content: "article" },
      { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/lexique" }],
  }),
  component: Lexique,
});
