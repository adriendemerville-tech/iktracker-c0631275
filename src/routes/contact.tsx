import { createFileRoute } from "@tanstack/react-router";
import Contact from "@/pages/Contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact IKtracker : support, bug, suggestion et demande partenaire" },
      {
        name: "description",
        content:
          "Formulaire de contact IKtracker : support technique, signalement de bug, suggestion de fonctionnalité, demande partenaire ou presse. Éditeur Voluntas Novare, France.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Contact IKtracker : support, bug, suggestion et partenariats" },
      {
        property: "og:description",
        content:
          "Support technique, bug, suggestion de fonctionnalité ou demande partenaire : écrivez à l'équipe IKtracker (éditeur Voluntas Novare).",
      },

      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iktracker.fr/contact" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Contact IKtracker : support, bug, suggestion et partenariats" },
      {
        name: "twitter:description",
        content:
          "Support technique, bug, suggestion ou demande partenaire : écrivez à l'équipe IKtracker.",
      },

    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/contact" }],
  }),
  component: Contact,
});
