import { buildAuthorPerson, buildFAQSchema, buildHowToSchema } from "@/lib/blog-schema-extractors";

export interface BlogSchemaInput {
  slug: string;
  title: string;
  content: string;
  description: string;
  featured_image_url?: string | null;
  author_name?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Builds every JSON-LD graph for a blog post. Used from the route head() so the
 * structured data ships in the SSR HTML (crawlers and LLM agents without JS).
 */
export function buildBlogPostSchemas(post: BlogSchemaInput): Record<string, unknown>[] {
  const canonicalUrl = `https://iktracker.fr/blog/${post.slug}`;
  const publishDate = post.published_at || post.created_at || new Date().toISOString();
  const dateISO = new Date(publishDate).toISOString();
  const modifiedDateISO = new Date(post.updated_at || publishDate).toISOString();
  const wordCount = post.content.trim().split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const schemas: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      image: post.featured_image_url || "https://iktracker.fr/logo-iktracker-250.webp",
      author: buildAuthorPerson(post.author_name ?? null),
      publisher: {
        "@type": "Organization",
        name: "IKtracker",
        logo: {
          "@type": "ImageObject",
          url: "https://iktracker.fr/logo-iktracker-250.webp",
        },
      },
      datePublished: dateISO,
      dateModified: modifiedDateISO,
      mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
      wordCount,
      timeRequired: `PT${readingTime}M`,
      inLanguage: "fr-FR",
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["article header h1", "article header + .article-summary"],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://iktracker.fr/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://iktracker.fr/blog" },
        { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
      ],
    },
  ];

  const faq = buildFAQSchema(post.content);
  if (faq) schemas.push(faq as Record<string, unknown>);
  const howTo = buildHowToSchema(post.content, post.title);
  if (howTo) schemas.push(howTo as Record<string, unknown>);

  return schemas;
}
