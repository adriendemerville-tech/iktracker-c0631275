// @vitest-environment node
/**
 * Garde-fou SSR/SEO du module forum : vérifie que les crawlers reçoivent bien
 * le contenu textuel, les métadonnées et le JSON-LD dans le HTML initial,
 * et que /sitemap-forum.xml expose des URLs valides.
 *
 * Le serveur de dev doit tourner ; sinon la suite est ignorée.
 */
import { describe, expect, it } from "vitest";

const BASE_URL = process.env["SSR_TEST_BASE_URL"] ?? "http://localhost:8080";

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

const serverUp = await isServerUp();

async function getHtml(path: string): Promise<string> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
    signal: AbortSignal.timeout(30000),
  });
  expect(res.status, `${path} doit répondre 200`).toBe(200);
  return res.text();
}

function extractJsonLd(html: string): Record<string, unknown>[] {
  const blocks = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  const nodes: Record<string, unknown>[] = [];
  const push = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(push);
    if (!value || typeof value !== "object") return;
    nodes.push(value as Record<string, unknown>);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      if (nested && typeof nested === "object") push(nested);
    }
  };
  for (const [, raw] of blocks) {
    const json = raw.replace(/\\u003c/g, "<").trim();
    expect(() => JSON.parse(json), `JSON-LD invalide : ${json.slice(0, 120)}`).not.toThrow();
    push(JSON.parse(json));
  }
  return nodes;
}

function types(nodes: Record<string, unknown>[]): string[] {
  return nodes.flatMap((n) => {
    const t = n["@type"];
    return Array.isArray(t) ? (t as string[]) : typeof t === "string" ? [t] : [];
  });
}

function metaContent(html: string, key: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`,
    "i",
  );
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
}

describe.skipIf(!serverUp)("SSR forum — contenu et métadonnées visibles des crawlers", () => {
  it("/forum : titre, description, canonical et CollectionPage", async () => {
    const html = await getHtml("/forum");

    expect(html).toMatch(/<title>[^<]*Forum[^<]*<\/title>/i);
    const desc = metaContent(html, "description");
    expect(desc, "meta description manquante").toBeTruthy();
    expect(desc!.length).toBeLessThanOrEqual(200);
    expect(html).toContain('rel="canonical"');
    expect(metaContent(html, "og:title")).toBeTruthy();
    expect(metaContent(html, "robots")).toContain("index");

    const t = types(extractJsonLd(html));
    expect(t).toContain("CollectionPage");
    expect(t).toContain("BreadcrumbList");
  });

  it("/forum : les titres de discussions sont dans le HTML initial", async () => {
    const html = await getHtml("/forum");
    const nodes = extractJsonLd(html);
    const collection = nodes.find((n) => n["@type"] === "CollectionPage");
    const list = (collection?.["mainEntity"] as Record<string, unknown> | undefined)?.[
      "itemListElement"
    ] as Array<Record<string, unknown>> | undefined;

    if (!list?.length) return; // forum encore vide : rien à vérifier
    const firstName = String(list[0]["name"] ?? "");
    const probe = firstName.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "");
    expect(html.replace(/&#x27;|&#39;/g, "'")).toContain(probe);
  });

  it("catégories et discussions : SSR complet + JSON-LD dédié", async () => {
    const sitemap = await (await fetch(`${BASE_URL}/sitemap-forum.xml`)).text();
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    const category = locs.find((u) => u.includes("/forum/categorie/"));
    if (category) {
      const html = await getHtml(new URL(category).pathname);
      expect(html).toMatch(/<title>[^<]+<\/title>/);
      expect(metaContent(html, "description")).toBeTruthy();
      expect(types(extractJsonLd(html))).toContain("BreadcrumbList");
    }

    const discussion = locs.find(
      (u) => u.includes("/forum/") && !u.includes("/categorie/") && !u.endsWith("/forum"),
    );
    if (discussion) {
      const html = await getHtml(new URL(discussion).pathname);
      const t = types(extractJsonLd(html));
      expect(t).toContain("DiscussionForumPosting");
      expect(metaContent(html, "og:type")).toBe("article");
      expect(metaContent(html, "robots")).toContain("index");
      expect(html).toContain('rel="canonical"');
    }
  });
});

describe.skipIf(!serverUp)("Sitemap forum", () => {
  it("expose un urlset valide avec uniquement des URLs forum absolues", async () => {
    const res = await fetch(`${BASE_URL}/sitemap-forum.xml`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("xml");

    const xml = await res.text();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<urlset");

    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) {
      expect(loc.startsWith("https://iktracker.fr/forum")).toBe(true);
    }
    expect(new Set(locs).size, "URLs dupliquées dans le sitemap forum").toBe(locs.length);

    for (const [, lastmod] of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
      expect(lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("est déclaré dans robots.txt et le forum reste crawlable", async () => {
    const robots = await (await fetch(`${BASE_URL}/robots.txt`)).text();
    expect(robots).toContain("Sitemap: https://iktracker.fr/sitemap-forum.xml");
    expect(robots).toContain("Allow: /forum");
    expect(robots).toContain("Disallow: /app/forum/");
  });
});
