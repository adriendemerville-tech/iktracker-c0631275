// Sitemap dédié au module forum : racine, catégories et discussions indexables.
// Référencé dans public/robots.txt, régénéré à chaque requête (cache 1 h).
//
// Pagination : au-delà de PAGE_SIZE URLs, /sitemap-forum.xml renvoie un
// <sitemapindex> pointant vers /sitemap-forum.xml?page=1..N, chaque page
// contenant au plus PAGE_SIZE URLs (limite protocole : 50 000).
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://iktracker.fr";
/** Nombre max de discussions récupérées en base pour le sitemap. */
const MAX_DISCUSSIONS = 5000;
/** Nombre max d'URLs par page de sitemap. */
const PAGE_SIZE = 500;

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
    .range(0, MAX_DISCUSSIONS - 1);
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

/** Découpe les entrées en pages de PAGE_SIZE URLs. */
export function paginateEntries(entries: SitemapEntry[], pageSize = PAGE_SIZE): SitemapEntry[][] {
  const pages: SitemapEntry[][] = [];
  for (let i = 0; i < entries.length; i += pageSize) {
    pages.push(entries.slice(i, i + pageSize));
  }
  return pages.length > 0 ? pages : [[]];
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

function renderUrlset(entries: SitemapEntry[]) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map(renderUrl),
    `</urlset>`,
  ].join("\n");
}

/** Index de sitemaps ; lastmod par page = plus récent lastmod de ses URLs. */
export function renderSitemapIndex(pages: SitemapEntry[][]) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...pages.map((page, i) => {
      const lastmod = page
        .map((e) => e.lastmod)
        .filter((v): v is string => Boolean(v))
        .sort()
        .pop();
      return [
        `  <sitemap>`,
        `    <loc>${BASE_URL}/sitemap-forum.xml?page=${i + 1}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        `  </sitemap>`,
      ]
        .filter(Boolean)
        .join("\n");
    }),
    `</sitemapindex>`,
  ].join("\n");
}

export const Route = createFileRoute("/sitemap-forum.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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

        const pages = paginateEntries(entries);
        const pageParam = new URL(request.url).searchParams.get("page");
        const headers = {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        };

        if (pageParam) {
          const index = Number.parseInt(pageParam, 10);
          const page = Number.isFinite(index) ? pages[index - 1] : undefined;
          if (!page) {
            return new Response("Sitemap page not found", {
              status: 404,
              headers: { "Content-Type": "text/plain" },
            });
          }
          return new Response(renderUrlset(page), { headers });
        }

        // Une seule page : on sert directement le urlset (pas d'indirection inutile).
        if (pages.length === 1) {
          return new Response(renderUrlset(pages[0]!), { headers });
        }

        return new Response(renderSitemapIndex(pages), { headers });
      },
    },
  },
});
