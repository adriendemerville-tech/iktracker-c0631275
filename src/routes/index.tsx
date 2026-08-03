import { createFileRoute } from "@tanstack/react-router";
import { SmartLanding } from "@/components/auth/SmartRoutes";

const TITLE = "IKtracker — Application gratuite de suivi des indemnités kilométriques";
const DESCRIPTION =
  "Application 100% gratuite pour suivre et automatiser vos indemnités kilométriques : mode tournée GPS, synchronisation calendrier, export PDF pour votre comptable.";

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
