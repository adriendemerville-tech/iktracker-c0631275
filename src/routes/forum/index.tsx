import { createFileRoute } from "@tanstack/react-router";
import ForumHome from "@/pages/forum/ForumHome";
import {
  fetchCategories,
  fetchDiscussions,
  fetchForumStats,
  fetchTopContributors,
} from "@/lib/forum/queries";
import { buildForumBreadcrumb, buildForumCollectionSchema } from "@/lib/forum/schemas";

const TITLE = "Forum indemnités kilométriques : entraide des indépendants | IKtracker";
const DESCRIPTION =
  "Forum IKtracker : questions et réponses entre indépendants sur le barème kilométrique, l'URSSAF, les frais réels, le mode tournée GPS et les relevés IK.";
const URL = "https://iktracker.fr/forum";

export const Route = createFileRoute("/forum/")({
  loader: async () => {
    const [categories, recent, popular, stats] = await Promise.all([
      fetchCategories(),
      fetchDiscussions({ sort: "recent", limit: 20 }),
      fetchDiscussions({ sort: "popular", limit: 20 }),
      fetchForumStats(),
    ]);
    return { categories, recent, popular, stats };
  },
  head: ({ loaderData }) => {
    const items = (loaderData?.recent ?? []).map((d) => ({ slug: d.slug, title: d.title }));
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large" },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:url", content: URL },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "IKtracker" },
        { property: "og:locale", content: "fr_FR" },
        { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESCRIPTION },
        { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      ],
      links: [{ rel: "canonical", href: URL }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildForumCollectionSchema({
              url: URL,
              name: "Forum IKtracker",
              description: DESCRIPTION,
              items,
            }),
          ),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildForumBreadcrumb([
              { name: "Accueil", url: "https://iktracker.fr/" },
              { name: "Forum", url: URL },
            ]),
          ),
        },
      ],
    };
  },
  component: ForumIndexRoute,
});

function ForumIndexRoute() {
  const data = Route.useLoaderData();
  return <ForumHome data={{ ...data, activeCategory: null }} />;
}
