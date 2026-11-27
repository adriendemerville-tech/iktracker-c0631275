import { createFileRoute } from "@tanstack/react-router";
import { SmartLanding } from "@/components/auth/SmartLanding";
import { USER_COUNT_OFFSET } from "@/lib/user-count";
import { getRegisteredUserCount } from "@/lib/user-count.functions";
import { publicTripStatsSeed } from "@/lib/trip-stats";
import { getPublicTripStats } from "@/lib/trip-stats.functions";
import { getPublishedReviews } from "@/lib/reviews.functions";
import { HOME_JSON_LD_SCRIPTS } from "@/lib/home-schemas";

const TITLE = "Barème kilométrique 2026 : calcul indemnités km | IKtracker";
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
    links: [
      { rel: "canonical", href: "https://iktracker.fr/" },
      {
        rel: "preload",
        as: "image",
        href: "/logo-iktracker-250.webp",
        type: "image/webp",
        fetchPriority: "high",
        // React attend la casse camelCase, sinon les attributs sont ignorés.
        imageSrcSet: "/logo-iktracker-250.webp 1x, /logo-iktracker-250.webp 2x",
        imageSizes: "36px",
      },
    ],

    scripts: HOME_JSON_LD_SCRIPTS,
  }),
  loader: async () => {
    try {
      // Chaque appel a son propre repli : un échec isolé ne doit pas
      // mettre les autres compteurs à zéro.
      const [userResult, tripResult, reviews] = await Promise.all([
        getRegisteredUserCount().catch(() => undefined),
        getPublicTripStats().catch(() => undefined),
        getPublishedReviews().catch(() => undefined),
      ]);
      const trips = publicTripStatsSeed(tripResult?.tripCount, tripResult?.totalKm);
      return {
        count: typeof userResult?.count === "number" ? userResult.count : null,
        offset: userResult?.offset ?? USER_COUNT_OFFSET,
        tripCount: trips?.tripCount ?? null,
        totalKm: trips?.totalKm ?? null,
        reviews: reviews ?? [],
      };
    } catch (err) {
      console.error("Failed to load homepage stats:", err);
      return {
        count: null,
        offset: USER_COUNT_OFFSET,
        tripCount: null,
        totalKm: null,
        reviews: [],
      };
    }
  },
  component: HomePage,
});

function HomePage() {
  const data = Route.useLoaderData();
  return (
    <SmartLanding
      initialUserCount={typeof data?.count === "number" ? data.count : null}
      initialTripCount={typeof data?.tripCount === "number" ? data.tripCount : null}
      initialTotalKm={typeof data?.totalKm === "number" ? data.totalKm : null}
      reviews={data?.reviews ?? []}
    />
  );
}
