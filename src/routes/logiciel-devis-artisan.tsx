import { createFileRoute } from "@tanstack/react-router";
import LogicielDevisArtisan from "@/pages/LogicielDevisArtisan";
import {
  DEVIS_ARTISAN_ARTICLE_SCHEMA,
  DEVIS_ARTISAN_FAQ_SCHEMA,
} from "@/lib/logiciel-devis-artisan-schema";


export const Route = createFileRoute("/logiciel-devis-artisan")({
  head: () => ({
    meta: [
      { title: "Logiciel de devis artisan : devis vocal, IK et visibilité" },
      {
        name: "description",
        content:
          "Outils pour artisan du bâtiment : devis dictés à la voix (DictaDevi), frais kilométriques au barème officiel (IKtracker), visibilité Google (Crawlers). Guide et tarifs.",
      },
      {
        name: "keywords",
        content:
          "logiciel devis artisan, devis vocal bâtiment, application devis chantier, indemnités kilométriques artisan, CRM artisan, dictadevi, crawlers.fr",
      },
      {
        property: "og:title",
        content: "Logiciel de devis artisan : la stack outils du bâtiment",
      },
      {
        property: "og:description",
        content:
          "Devis dicté depuis le chantier, indemnités kilométriques automatiques et visibilité en ligne : trois outils pour récupérer ses soirées.",
      },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:url", content: "https://iktracker.fr/logiciel-devis-artisan" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Logiciel de devis artisan : la stack outils du bâtiment" },
      {
        name: "twitter:description",
        content:
          "Devis vocal sur le chantier, kilomètres déduits au barème officiel et site enfin trouvé sur Google.",
      },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "geo.region", content: "FR" },
      { name: "language", content: "fr" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/logiciel-devis-artisan" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(DEVIS_ARTISAN_ARTICLE_SCHEMA),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(DEVIS_ARTISAN_FAQ_SCHEMA),
      },
    ],
  }),


  component: LogicielDevisArtisan,
});
