import { createFileRoute } from "@tanstack/react-router";
import MesTrajetsLanding from "@/pages/MesTrajetsLanding";

export const Route = createFileRoute("/mes-trajets")({
  head: () => ({
    meta: [
      { title: "Mes Trajets — Journal kilométrique pro gratuit | IKtracker" },
      {
        name: "description",
        content:
          "Centralisez tous vos trajets professionnels dans un journal kilométrique conforme URSSAF : saisie manuelle, trajets récurrents, import agenda, Mode Tournée GPS, export PDF & Excel. 100 % gratuit.",
      },
      {
        name: "keywords",
        content:
          "mes trajets, journal de bord kilométrique, suivi trajets professionnels, trajets récurrents, carnet de bord URSSAF, application trajets pro, registre kilométrique",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { property: "og:title", content: "Mes Trajets — Journal kilométrique pro gratuit" },
      {
        property: "og:description",
        content:
          "Saisie, trajets récurrents, import agenda, GPS, export PDF. Le journal de bord kilométrique conforme URSSAF, gratuit à vie.",
      },
      { property: "og:url", content: "https://iktracker.fr/mes-trajets" },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/mes-trajets" }],
  }),
  component: MesTrajetsLanding,
});
