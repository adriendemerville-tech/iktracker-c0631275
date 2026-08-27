import { createFileRoute } from "@tanstack/react-router";
import Privacy from "@/pages/Privacy";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Confidentialité IKtracker : données collectées, GPS, hébergement et durées" },
      {
        name: "description",
        content:
          "Données collectées par IKtracker (trajets, GPS du mode Tournée, agenda), finalités, durées de conservation, hébergement en France et exercice des droits RGPD.",
      },
      {
        name: "keywords",
        content:
          "politique confidentialité, RGPD, protection données, vie privée, IKtracker, données personnelles",
      },
      { name: "robots", content: "index, follow" },
      {
        property: "og:title",
        content: "Confidentialité IKtracker : données, GPS, hébergement et durées",
      },
      {
        property: "og:description",
        content:
          "Quelles données IKtracker collecte (trajets, GPS, agenda), pourquoi, combien de temps, où elles sont hébergées et comment exercer vos droits RGPD.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iktracker.fr/privacy" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { name: "twitter:card", content: "summary" },
      {
        name: "twitter:title",
        content: "Confidentialité IKtracker : données, GPS, hébergement et durées",
      },
      {
        name: "twitter:description",
        content:
          "Données collectées, finalités, durées de conservation, hébergement en France et droits RGPD.",
      },

    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/privacy" }],
  }),
  component: Privacy,
});
