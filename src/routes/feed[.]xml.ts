import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://iktracker.fr";
const FEED_URL = `${BASE_URL}/feed.xml`;
const MAX_ENTRIES = 50;

interface FeedPost {
  slug: string;
  title: string;
  subtitle: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  updated_at: string | null;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIso(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/** Date de dernière modification réelle : max(updated_at, published_at). */
function effectiveUpdated(post: FeedPost) {
  const candidates = [post.updated_at, post.published_at]
    .filter((v): v is string => Boolean(v))
    .map((v) => new Date(v).getTime())
    .filter((t) => !Number.isNaN(t));
  return candidates.length ? new Date(Math.max(...candidates)).toISOString() : toIso(null);
}

function renderEntry(post: FeedPost) {
  const url = `${BASE_URL}/blog/${post.slug}`;
  const updated = effectiveUpdated(post);
  const published = toIso(post.published_at || post.updated_at);
  const summary = stripHtml(post.meta_description || post.subtitle || post.title);

  return [
    `  <entry>`,
    `    <title>${escapeXml(post.title)}</title>`,
    `    <id>${escapeXml(url)}</id>`,
    `    <link rel="alternate" type="text/html" href="${escapeXml(url)}" />`,
    `    <published>${published}</published>`,
    `    <updated>${updated}</updated>`,
    `    <author><name>${escapeXml(post.author_name || "IKtracker")}</name></author>`,
    `    <summary type="text">${escapeXml(summary)}</summary>`,
    post.featured_image_url
      ? `    <link rel="enclosure" type="image/*" href="${escapeXml(post.featured_image_url)}" />`
      : null,
    `  </entry>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Tri sur la date de dernière modification pour refléter les mises à jour récentes
        const { data } = await supabase
          .from("blog_posts")
          .select(
            "slug, title, subtitle, meta_description, featured_image_url, author_name, published_at, updated_at",
          )
          .eq("status", "published")
          .eq("seo_indexable", true)
          .order("updated_at", { ascending: false, nullsFirst: false })
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(MAX_ENTRIES);

        const posts = ((data || []) as FeedPost[]).sort(
          (a, b) =>
            new Date(effectiveUpdated(b)).getTime() - new Date(effectiveUpdated(a)).getTime(),
        );

        const lastUpdated = posts.length ? effectiveUpdated(posts[0]) : new Date().toISOString();


        const xml = [
          `<?xml version="1.0" encoding="utf-8"?>`,
          `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="fr-FR">`,
          `  <title>Blog IKtracker — Indemnités kilométriques</title>`,
          `  <subtitle>Barème fiscal, frais réels et gestion des indemnités kilométriques pour indépendants et salariés.</subtitle>`,
          `  <id>${FEED_URL}</id>`,
          `  <link rel="self" type="application/atom+xml" href="${FEED_URL}" />`,
          `  <link rel="alternate" type="text/html" href="${BASE_URL}/blog" />`,
          `  <updated>${lastUpdated}</updated>`,
          `  <author><name>IKtracker</name></author>`,
          `  <icon>${BASE_URL}/logo-iktracker-250.webp</icon>`,
          ...posts.map(renderEntry),
          `</feed>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/atom+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, must-revalidate",
          },
        });
      },
    },
  },
});
