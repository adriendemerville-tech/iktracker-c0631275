import { createFileRoute } from "@tanstack/react-router";
import Contact from "@/pages/Contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | IKtracker - Nous contacter" },
      {
        name: "description",
        content:
          "Contactez l'équipe IKtracker pour toute question, suggestion ou demande d'assistance. Réponse rapide garantie.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Contactez IKtracker" },
      {
        property: "og:description",
        content: "Une question sur IKtracker ? Contactez-nous facilement.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iktracker.fr/contact" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Contactez IKtracker" },
      {
        name: "twitter:description",
        content: "Une question sur IKtracker ? Contactez-nous facilement.",
      },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/contact" }],
  }),
  component: Contact,
});
