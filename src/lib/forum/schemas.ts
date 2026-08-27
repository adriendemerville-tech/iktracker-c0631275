// JSON-LD du forum : DiscussionForumPosting, CollectionPage, Breadcrumb.
import { FORUM_BASE_URL } from "./constants";

const ORG_ID = "https://iktracker.fr/#organization";

type SchemaAuthor = { pseudo: string; user_id: string } | null | undefined;

function personNode(author: SchemaAuthor) {
  if (!author) return { "@type": "Person", name: "Membre IKtracker" };
  return {
    "@type": "Person",
    name: author.pseudo,
    url: `${FORUM_BASE_URL}/membre/${author.user_id}`,
  };
}

export function buildForumBreadcrumb(
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildDiscussionSchema(input: {
  slug: string;
  title: string;
  body: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  categoryLabel: string;
  voteScore: number;
  author: SchemaAuthor;
  replies: {
    id: string;
    body: string;
    created_at: string;
    vote_score: number;
    author?: SchemaAuthor;
  }[];
}): Record<string, unknown> {
  const url = `${FORUM_BASE_URL}/${input.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": `${url}#discussion`,
    headline: input.title,
    name: input.title,
    description: input.description,
    articleSection: input.categoryLabel,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: input.createdAt,
    dateModified: input.updatedAt,
    inLanguage: "fr-FR",
    text: input.body.slice(0, 5000),
    author: personNode(input.author),
    publisher: { "@id": ORG_ID },
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: Math.max(0, input.voteScore),
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: input.replies.length,
      },
    ],
    comment: input.replies.slice(0, 50).map((reply) => ({
      "@type": "Comment",
      "@id": `${url}#reponse-${reply.id}`,
      text: reply.body.slice(0, 3000),
      datePublished: reply.created_at,
      author: personNode(reply.author),
      upvoteCount: Math.max(0, reply.vote_score),
    })),
  };
}

export function buildForumCollectionSchema(input: {
  url: string;
  name: string;
  description: string;
  items: { slug: string; title: string }[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${input.url}#collection`,
    url: input.url,
    name: input.name,
    description: input.description,
    inLanguage: "fr-FR",
    isPartOf: { "@id": "https://iktracker.fr/#website" },
    publisher: { "@id": ORG_ID },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: input.items.slice(0, 30).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        url: `${FORUM_BASE_URL}/${item.slug}`,
      })),
    },
  };
}
