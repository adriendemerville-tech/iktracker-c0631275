import { createFileRoute } from "@tanstack/react-router";
import Privacy from "@/pages/Privacy";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité | IKtracker" },
      {
        name: "description",
        content:
          "Découvrez comment IKtracker protège vos données personnelles. Conformité RGPD, droits d'accès, rectification et suppression. Sécurité de vos informations garantie.",
      },
      {
        name: "keywords",
        content:
          "politique confidentialité, RGPD, protection données, vie privée, IKtracker, données personnelles",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Politique de confidentialité | IKtracker" },
      {
        property: "og:description",
        content:
          "Découvrez comment IKtracker protège vos données personnelles. Conformité RGPD et sécurité garantie.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iktracker.fr/privacy" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Politique de confidentialité | IKtracker" },
      {
        name: "twitter:description",
        content: "Découvrez comment IKtracker protège vos données personnelles. Conformité RGPD.",
      },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/privacy" }],
  }),
  component: Privacy,
});
