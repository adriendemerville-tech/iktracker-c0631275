import { createFileRoute } from "@tanstack/react-router";
import { SmartLanding } from "@/components/auth/SmartLanding";
import { HOME_JSON_LD_SCRIPTS } from "@/lib/home-schemas";

const TITLE = "Indemnités kilométriques 2026 : l'application gratuite";
const DESCRIPTION =
  "Calcul automatique des indemnités kilométriques au barème officiel 2026 : suivi GPS des tournées, trajets créés depuis l'agenda, majoration +20 % électrique, relevés PDF comptables. Gratuit à vie.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://iktracker.fr/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:url", content: "https://iktracker.fr/" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/" }],
    scripts: HOME_JSON_LD_SCRIPTS,
  }),
  component: () => <SmartLanding />,
});
