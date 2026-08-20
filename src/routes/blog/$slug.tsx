import { createFileRoute, redirect } from "@tanstack/react-router";
import BlogPost from "@/pages/BlogPost";
import { supabase } from "@/integrations/supabase/client";
import { BLOG_SLUG_REDIRECTS } from "@/lib/blog-redirects";

export const Route = createFileRoute("/blog/$slug")({
  beforeLoad: ({ params }) => {
    const target = BLOG_SLUG_REDIRECTS[params.slug];
    if (target) {
      throw redirect({ href: target, statusCode: 301, throw: true });
    }
  },
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("blog_posts")
      .select(
        "title, meta_description, content, featured_image_url, slug, published_at, created_at, updated_at, seo_indexable",
      )
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!data) return null;
    const description =
      data.meta_description ||
      (data.content || "")
        .split("\n\n")
        .filter((p: string) => p.trim() && !p.startsWith("#"))[0]
        ?.replace(/[#*_[\]()]/g, "")
        .trim()
        .slice(0, 160) ||
      "";
    return {
      title: data.title as string,
      description,
      image:
        (data.featured_image_url as string | null) ||
        "https://iktracker.fr/logo-iktracker-250.webp",
      url: `https://iktracker.fr/blog/${data.slug}`,
      publishedAt: new Date((data.published_at || data.created_at) as string).toISOString(),
      modifiedAt: new Date(
        (data.updated_at || data.published_at || data.created_at) as string,
      ).toISOString(),
      indexable: data.seo_indexable !== false,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Article introuvable | Blog IKtracker" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { title, description, image, url, publishedAt, modifiedAt, indexable } = loaderData;
    return {
      meta: [
        { title: `${title} | Blog IKtracker` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:type", content: "article" },
        { property: "og:site_name", content: "IKtracker" },
        { property: "og:locale", content: "fr_FR" },
        { property: "article:published_time", content: publishedAt },
        { property: "article:modified_time", content: modifiedAt },
        { property: "article:section", content: "Indemnités kilométriques" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
        { name: "geo.region", content: "FR" },
        { name: "geo.placename", content: "France" },
        { name: "content-language", content: "fr" },
        {
          name: "robots",
          content: indexable
            ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
            : "noindex, follow",
        },
      ],
      links: [
        { rel: "canonical", href: url },
        { rel: "preconnect", href: "https://yarjaudctshlxkatqgeb.supabase.co" },
      ],
    };
  },
  component: BlogPost,
});
