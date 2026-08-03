import { createFileRoute } from "@tanstack/react-router";
import { SmartLanding } from "@/components/auth/SmartRoutes";

const TITLE = "Indemnités kilométriques 2026 : l'application gratuite";
const DESCRIPTION =
  "Calculez vos indemnités kilométriques au barème URSSAF 2026 : suivi GPS des tournées, sync agenda, export PDF comptable. 100% gratuit, sans carte bancaire.";

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
  }),
  component: () => <SmartLanding />,
});
