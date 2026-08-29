import { createFileRoute } from "@tanstack/react-router";
import { SmartLanding } from "@/components/auth/SmartLanding";
import { getRegisteredUserCount } from "@/lib/user-count.functions";
import { getPublicTripStats } from "@/lib/trip-stats.functions";
import { HOME_JSON_LD_SCRIPTS } from "@/lib/home-schemas";

const TITLE = "IKtracker — Calcul indemnités kilométriques 2026 | Barème officiel";
const DESCRIPTION =
  "Calculez vos indemnités kilométriques 2026 avec le barème officiel URSSAF. Suivi GPS, agenda, électrique +20%, relevés PDF. Gratuit à vie.";

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
      const [userResult, tripResult] = await Promise.all([
        getRegisteredUserCount(),
        getPublicTripStats(),
      ]);
      return {
        count: userResult.count,
        offset: userResult.offset,
        tripCount: tripResult.tripCount,
        totalKm: tripResult.totalKm,
      };
    } catch (err) {
      console.error("Failed to load homepage stats:", err);
      return { count: 1000, offset: 1000, tripCount: 0, totalKm: 0 };
    }
  },
  component: () => {
    const data = Route.useLoaderData();
    return (
      <SmartLanding
        initialUserCount={data?.count ?? 1000}
        initialTripCount={data?.tripCount ?? 0}
        initialTotalKm={data?.totalKm ?? 0}
      />
    );
  },
});
