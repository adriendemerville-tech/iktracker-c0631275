import { createFileRoute } from "@tanstack/react-router";
import AuthorPage from "@/pages/AuthorPage";

export const Route = createFileRoute("/blog/auteur/$slug")({
  head: () => ({
    meta: [
      { title: "Adrien de Volontat - Fondateur IKtracker | Blog" },
      {
        name: "description",
        content:
          "Découvrez Adrien de Volontat, fondateur d'IKtracker et dirigeant d'Avenir Rénovations à Saint-Rémy-de-Provence. Un outil créé par un professionnel pour les professionnels.",
      },
      { property: "og:title", content: "Adrien de Volontat - Fondateur IKtracker" },
      {
        property: "og:description",
        content: "Découvrez le créateur d'IKtracker, outil de suivi des indemnités kilométriques.",
      },
      { property: "og:type", content: "profile" },
      { property: "profile:first_name", content: "Adrien" },
      { property: "profile:last_name", content: "de Volontat" },
    ],
  }),
  component: AuthorPage,
});
