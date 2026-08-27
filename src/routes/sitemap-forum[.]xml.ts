// Sitemap dédié au module forum : racine, catégories et discussions indexables.
// Référencé dans public/robots.txt, régénéré à chaque requête (cache 1 h).
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://iktracker.fr";
const PAGE_SIZE = 1000;

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: string;
}

function day(stamp: string | null | undefined): string | undefined {
  if (!stamp) return undefined;
  const d = new Date(stamp);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().split("T")[0];
}

export async function buildForumSitemapEntries(): Promise<SitemapEntry[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: discussions, error: discussionsError } = await supabaseAdmin
    .from("forum_discussions")
    .select("slug, category_slug, last_activity_at, updated_at")
    .eq("status", "published")
    .eq("seo_indexable", true)
    .order("last_activity_at", { ascending: false })
    .range(0, PAGE_SIZE * 5 - 1);
  if (discussionsError) {
    throw new Error(`forum_discussions fetch failed: ${discussionsError.message}`);
  }

  const rows = discussions ?? [];
  // lastmod du forum = dernière activité réelle, jamais la date de génération.
  const latestOverall = day(rows[0]?.last_activity_at ?? rows[0]?.updated_at ?? null);

  const entries: SitemapEntry[] = [
    { path: "/forum", lastmod: latestOverall, priority: "0.8", changefreq: "daily" },
  ];

  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from("forum_categories")
    .select("slug")
    .order("sort_order");
  if (categoriesError) {
    throw new Error(`forum_categories fetch failed: ${categoriesError.message}`);
  }

  const latestByCategory = new Map<string, string | undefined>();
  for (const d of rows) {
    const stamp = day(d.last_activity_at ?? d.updated_at);
    if (!d.category_slug) continue;
    if (!latestByCategory.has(d.category_slug)) latestByCategory.set(d.category_slug, stamp);
  }

  for (const c of categories ?? []) {
    entries.push({
      path: `/forum/categorie/${c.slug}`,
      lastmod: latestByCategory.get(c.slug),
      priority: "0.6",
      changefreq: "daily",
    });
  }

  for (const d of rows) {
    entries.push({
      path: `/forum/${d.slug}`,
      lastmod: day(d.last_activity_at ?? d.updated_at),
      changefreq: "weekly",
      priority: "0.7",
    });
  }

  return entries;
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

export const Route = createFileRoute("/sitemap-forum.xml")({
  server: {
    handlers: {
      GET: async () => {
        let entries: SitemapEntry[];
        try {
          entries = await buildForumSitemapEntries();
        } catch (e) {
          console.error("[sitemap-forum]", e);
          return new Response("Forum sitemap temporarily unavailable", {
            status: 503,
            headers: { "Content-Type": "text/plain", "Retry-After": "300" },
          });
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries.map(renderUrl),
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
