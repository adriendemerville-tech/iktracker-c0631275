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

/** Une discussion est traitée comme Q/R si elle pose explicitement une question. */
export function isQuestionDiscussion(title: string, body: string): boolean {
  const t = title.toLowerCase();
  const b = body.slice(0, 600).toLowerCase();
  if (title.includes("?") || body.slice(0, 600).includes("?")) return true;
  return /\b(comment|pourquoi|quel|quelle|quels|quelles|est-ce que|faut-il|qui a|besoin d'aide|conseil)\b/.test(
    `${t} ${b}`,
  );
}

/** QAPage : hiérarchie question / réponse acceptée / réponses suggérées. */
export function buildQAPageSchema(input: {
  slug: string;
  title: string;
  body: string;
  description: string;
  createdAt: string;
  updatedAt: string;
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
  const answerNode = (reply: (typeof input.replies)[number]) => ({
    "@type": "Answer",
    "@id": `${url}#reponse-${reply.id}`,
    url: `${url}#reponse-${reply.id}`,
    text: reply.body.slice(0, 3000),
    datePublished: reply.created_at,
    upvoteCount: Math.max(0, reply.vote_score),
    author: personNode(reply.author),
  });

  const sorted = [...input.replies].sort((a, b) => b.vote_score - a.vote_score);
  const [best, ...rest] = sorted;

  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "@id": `${url}#qapage`,
    url,
    inLanguage: "fr-FR",
    isPartOf: { "@id": "https://iktracker.fr/#website" },
    publisher: { "@id": ORG_ID },
    mainEntity: {
      "@type": "Question",
      "@id": `${url}#question`,
      name: input.title,
      text: input.body.slice(0, 5000) || input.description,
      answerCount: input.replies.length,
      upvoteCount: Math.max(0, input.voteScore),
      datePublished: input.createdAt,
      dateModified: input.updatedAt,
      author: personNode(input.author),
      ...(best && best.vote_score > 0 ? { acceptedAnswer: answerNode(best) } : {}),
      ...(sorted.length
        ? {
            suggestedAnswer: (best && best.vote_score > 0 ? rest : sorted)
              .slice(0, 20)
              .map(answerNode),
          }
        : {}),
    },
  };
}
