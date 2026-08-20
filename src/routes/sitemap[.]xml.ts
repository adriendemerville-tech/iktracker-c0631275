import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://iktracker.fr";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: string;
}

const staticPages: SitemapEntry[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/signup", priority: "0.5", changefreq: "monthly" },
  { path: "/mode-tournee", priority: "0.8", changefreq: "monthly" },
  { path: "/calendrier", priority: "0.8", changefreq: "monthly" },
  { path: "/expert-comptable", priority: "0.7", changefreq: "monthly" },
  { path: "/installer", priority: "0.6", changefreq: "monthly" },
  { path: "/bareme-ik-2026", priority: "0.9", changefreq: "monthly" },
  { path: "/frais-reels", priority: "0.8", changefreq: "monthly" },
  { path: "/note-de-frais-kilometrique", priority: "0.8", changefreq: "monthly" },
  { path: "/indemnite-kilometrique-velo", priority: "0.8", changefreq: "monthly" },
  { path: "/indemnite-grand-deplacement-2026", priority: "0.8", changefreq: "monthly" },
  { path: "/mes-trajets", priority: "0.8", changefreq: "monthly" },
  {
    path: "/meilleure-application-indemnites-kilometriques",
    priority: "1.0",
    changefreq: "monthly",
  },
  { path: "/tarifs", priority: "0.7", changefreq: "monthly" },
  { path: "/lexique", priority: "0.8", changefreq: "monthly" },
  { path: "/comparatif-izika", priority: "0.8", changefreq: "monthly" },
  { path: "/comparatif-driversnote", priority: "0.8", changefreq: "monthly" },
  { path: "/api-docs", priority: "0.5", changefreq: "monthly" },
  { path: "/fonctionnalites", priority: "0.9", changefreq: "monthly" },
  { path: "/artisans", priority: "0.8", changefreq: "monthly" },
  { path: "/independants", priority: "0.8", changefreq: "monthly" },
  { path: "/blog", priority: "0.8", changefreq: "weekly" },
  { path: "/blog/auteur/adrien-de-volontat", priority: "0.6", changefreq: "monthly" },
  { path: "/mentions-legales", priority: "0.5", changefreq: "yearly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/privacy", priority: "0.5", changefreq: "yearly" },
  { path: "/rgpd", priority: "0.5", changefreq: "yearly" },
  { path: "/terms", priority: "0.5", changefreq: "yearly" },
];

const PAGE_SIZE = 1000;

async function fetchAllPublishedPosts() {
  const all: Array<{ slug: string; updated_at: string | null; published_at: string | null }> = [];
  let from = 0;
  // paginate to bypass the default row limit
  for (;;) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("seo_indexable", true)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as typeof all));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function renderUrl(e: SitemapEntry) {
  return [
    `  <url>`,
    `    <loc>${BASE_URL}${e.path}</loc>`,
    e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
    `    <changefreq>${e.changefreq}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    `  </url>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const posts = await fetchAllPublishedPosts();
        const blogEntries: SitemapEntry[] = posts.map((p) => {
          const stamp = p.updated_at || p.published_at;
          return {
            path: `/blog/${p.slug}`,
            lastmod: stamp ? new Date(stamp).toISOString().split("T")[0] : undefined,
            changefreq: "weekly",
            priority: "0.8",
          };
        });

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...[...staticPages, ...blogEntries].map(renderUrl),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
