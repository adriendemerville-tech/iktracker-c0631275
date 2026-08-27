import { createFileRoute, notFound } from "@tanstack/react-router";
import ForumHome from "@/pages/forum/ForumHome";
import { fetchCategories, fetchDiscussions, fetchForumStats } from "@/lib/forum/queries";
import { buildForumBreadcrumb, buildForumCollectionSchema } from "@/lib/forum/schemas";

export const Route = createFileRoute("/forum/categorie/$category")({
  loader: async ({ params }) => {
    const categories = await fetchCategories();
    const category = categories.find((c) => c.slug === params.category);
    if (!category) throw notFound();
    const [recent, popular, stats] = await Promise.all([
      fetchDiscussions({ category: category.slug, sort: "recent", limit: 20 }),
      fetchDiscussions({ category: category.slug, sort: "popular", limit: 20 }),
      fetchForumStats(),
    ]);
    return { categories, category, recent, popular, stats };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Catégorie introuvable | Forum IKtracker" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { category, recent } = loaderData;
    const url = `https://iktracker.fr/forum/categorie/${category.slug}`;
    const title = `${category.label} : discussions et réponses | Forum IKtracker`;
    const description =
      category.description ??
      `Discussions ${category.label.toLowerCase()} entre indépendants : questions, réponses et retours d'expérience sur les indemnités kilométriques.`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-snippet:-1" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "IKtracker" },
        { property: "og:locale", content: "fr_FR" },
        { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildForumCollectionSchema({
              url,
              name: category.label,
              description,
              items: recent.map((d) => ({ slug: d.slug, title: d.title })),
            }),
          ),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildForumBreadcrumb([
              { name: "Accueil", url: "https://iktracker.fr/" },
              { name: "Forum", url: "https://iktracker.fr/forum" },
              { name: category.label, url },
            ]),
          ),
        },
      ],
    };
  },
  component: ForumCategoryRoute,
});

function ForumCategoryRoute() {
  const { categories, category, recent, popular, stats } = Route.useLoaderData();
  return (
    <ForumHome
      data={{ categories, recent, popular, stats, activeCategory: category.slug }}
    />
  );
}
