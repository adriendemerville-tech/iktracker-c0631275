import { createFileRoute } from "@tanstack/react-router";
import { SmartLanding } from "@/components/auth/SmartLanding";
import { getRegisteredUserCount } from "@/lib/user-count.functions";
import { HOME_JSON_LD_SCRIPTS } from "@/lib/home-schemas";

const TITLE = "Indemnités kilométriques 2026 : barème officiel, calcul et relevés";
const DESCRIPTION =
  "Calcul des indemnités kilométriques au barème officiel 2026 : suivi GPS des tournées, trajets créés depuis l'agenda, +20 % électrique, relevés PDF comptables. Gratuit à vie.";

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
  loader: async () => {
    try {
      const result = await getRegisteredUserCount();
      return { count: result.count, offset: result.offset };
    } catch (err) {
      console.error("Failed to load user count:", err);
      return { count: 1000, offset: 1000 };
    }
  },
  component: () => {
    const data = Route.useLoaderData();
    return <SmartLanding initialUserCount={data?.count ?? 1000} />;
  },
});
