import { createFileRoute, notFound } from "@tanstack/react-router";
import ForumDiscussionPage from "@/pages/forum/ForumDiscussionPage";
import { fetchDiscussionBySlug } from "@/lib/forum/queries";
import { buildDiscussionSchema, buildForumBreadcrumb, buildQAPageSchema, isQuestionDiscussion } from "@/lib/forum/schemas";
import { buildMetaDescription } from "@/lib/forum/constants";

export const Route = createFileRoute("/forum/$slug")({
  loader: async ({ params }) => {
    const result = await fetchDiscussionBySlug(params.slug);
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Discussion introuvable | Forum IKtracker" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { discussion, replies, category } = loaderData;
    const url = `https://iktracker.fr/forum/${discussion.slug}`;
    const description =
      discussion.meta_description || buildMetaDescription(discussion.body);
    const title = `${discussion.title} | Forum IKtracker`;
    const indexable = discussion.seo_indexable !== false;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "robots",
          content: indexable
            ? "index, follow, max-snippet:-1, max-image-preview:large"
            : "noindex, follow",
        },
        { property: "og:title", content: discussion.title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:site_name", content: "IKtracker" },
        { property: "og:locale", content: "fr_FR" },
        { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
        { property: "article:published_time", content: new Date(discussion.created_at).toISOString() },
        { property: "article:modified_time", content: new Date(discussion.updated_at).toISOString() },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: discussion.title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            isQuestionDiscussion(discussion.title, discussion.body)
              ? buildQAPageSchema({
                  slug: discussion.slug,
                  title: discussion.title,
                  body: discussion.body,
                  description,
                  createdAt: new Date(discussion.created_at).toISOString(),
                  updatedAt: new Date(discussion.updated_at).toISOString(),
                  voteScore: discussion.vote_score,
                  author: discussion.author,
                  replies,
                })
              : buildDiscussionSchema({
                  slug: discussion.slug,
                  title: discussion.title,
                  body: discussion.body,
                  description,
                  createdAt: new Date(discussion.created_at).toISOString(),
                  updatedAt: new Date(discussion.updated_at).toISOString(),
                  categoryLabel: category?.label ?? "Forum",
                  voteScore: discussion.vote_score,
                  author: discussion.author,
                  replies,
                }),
          ),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildForumBreadcrumb([
              { name: "Accueil", url: "https://iktracker.fr/" },
              { name: "Forum", url: "https://iktracker.fr/forum" },
              ...(category
                ? [
                    {
                      name: category.label,
                      url: `https://iktracker.fr/forum/categorie/${category.slug}`,
                    },
                  ]
                : []),
              { name: discussion.title, url },
            ]),
          ),
        },
      ],
    };
  },
  component: ForumDiscussionRoute,
});

function ForumDiscussionRoute() {
  const data = Route.useLoaderData();
  return <ForumDiscussionPage data={data as never} />;
}
