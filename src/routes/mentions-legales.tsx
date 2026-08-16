import { createFileRoute } from "@tanstack/react-router";
import MentionsLegales from "@/pages/MentionsLegales";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions Légales | IKtracker - Éditeur et Hébergeur" },
      {
        name: "description",
        content:
          "Mentions légales d'IKtracker : informations sur l'éditeur, l'hébergeur, la propriété intellectuelle et les conditions d'utilisation du site iktracker.fr.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Mentions Légales | IKtracker" },
      {
        property: "og:description",
        content: "Mentions légales d'IKtracker : éditeur, hébergeur et informations juridiques.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iktracker.fr/mentions-legales" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Mentions Légales | IKtracker" },
      {
        name: "twitter:description",
        content: "Mentions légales d'IKtracker : éditeur, hébergeur et informations juridiques.",
      },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/mentions-legales" }],
  }),
  component: MentionsLegales,
});
