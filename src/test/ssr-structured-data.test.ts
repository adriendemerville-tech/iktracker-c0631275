// @vitest-environment node
/**
 * Garde-fou SSR : vérifie que les données structurées (Article, FAQPage,
 * BreadcrumbList, HowTo…) ET le contenu principal sont bien présents dans le
 * HTML renvoyé par le serveur, sans exécution de JavaScript.
 *
 * Les crawlers (Googlebot) et les agents LLM lisent ce HTML brut : tout schéma
 * injecté seulement après hydratation est invisible pour eux.
 *
 * Le serveur de dev doit tourner ; sinon la suite est ignorée (CI hors app).
 * Base configurable via SSR_TEST_BASE_URL.
 */
import { describe, expect, it, beforeAll } from "vitest";

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

/** Extrait tous les blocs JSON-LD du HTML serveur et aplatit les @graph. */
function extractJsonLd(html: string): Record<string, unknown>[] {
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  const nodes: Record<string, unknown>[] = [];

  const push = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    nodes.push(node);
    if (node["@graph"]) push(node["@graph"]);
  };

  for (const [, raw] of blocks) {
    const json = raw.replace(/\\u003c/g, "<").trim();
    expect(() => JSON.parse(json), `JSON-LD invalide sur la page : ${json.slice(0, 120)}`).not.toThrow();
    push(JSON.parse(json));
  }

  return nodes;
}

const typesOf = (nodes: Record<string, unknown>[]) =>
  nodes.flatMap((n) => {
    const t = n["@type"];
    return typeof t === "string" ? [t] : Array.isArray(t) ? (t as string[]) : [];
  });

interface RouteExpectation {
  path: string;
  /** Types schema.org obligatoires dans le HTML serveur. */
  schemas: string[];
  /** Extraits du contenu principal devant être rendus côté serveur. */
  content: string[];
}

const ROUTES: RouteExpectation[] = [
  {
    path: "/",
    schemas: ["WebSite", "Organization", "SoftwareApplication", "FAQPage", "HowTo"],
    content: ["indemnités kilométriques"],
  },
  {
    path: "/bareme-ik-2026",
    schemas: ["Article", "FAQPage", "BreadcrumbList", "SoftwareApplication"],
    content: ["Barème", "2026"],
  },
  {
    path: "/logiciel-devis-artisan",
    schemas: ["Article", "FAQPage", "SoftwareApplication"],
    content: ["devis", "dictadevi.io"],
  },
  {
    path: "/artisans",
    schemas: ["Article", "FAQPage", "BreadcrumbList"],
    content: ["artisan"],
  },
  {
    path: "/mode-tournee",
    schemas: ["Article", "BreadcrumbList"],
    content: ["tournée"],
  },
  {
    path: "/comparatif-izika",
    schemas: ["Article", "BreadcrumbList"],
    content: ["Izika"],
  },
  {
    path: "/comparatif-driversnote",
    schemas: ["Article", "BreadcrumbList"],
    content: ["Driversnote"],
  },
  {
    path: "/indemnite-kilometrique-velo",
    schemas: ["Article", "FAQPage", "BreadcrumbList"],
    content: ["vélo"],
  },
  {
    path: "/indemnite-grand-deplacement-2026",
    schemas: ["Article", "FAQPage", "BreadcrumbList"],
    content: ["grand déplacement"],
  },
  {
    path: "/meilleure-application-indemnites-kilometriques",
    schemas: ["Article", "FAQPage", "BreadcrumbList"],
    content: ["application"],
  },
  {
    path: "/blog/stack-outils-artisan-devis-vocal-kilometres-visibilite",
    schemas: ["Article", "BreadcrumbList", "HowTo"],
    content: ["dictadevi.io", "crawlers.fr"],
  },
];

const pages = new Map<string, string>();

describe.skipIf(!serverUp)("données structurées et contenu dans le HTML serveur", () => {
  beforeAll(async () => {
    await Promise.all(
      ROUTES.map(async ({ path }) => {
        const res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(30000) });
        expect(res.status, `${path} doit répondre 200`).toBe(200);
        pages.set(path, await res.text());
      }),
    );
  }, 120000);

  it.each(ROUTES)("$path : les schémas attendus sont dans le HTML serveur", ({ path, schemas }) => {
    const found = typesOf(extractJsonLd(pages.get(path)!));
    for (const type of schemas) {
      expect(found, `${path} : schéma ${type} absent du SSR (rendu client only ?)`).toContain(type);
    }
  });

  it.each(ROUTES)("$path : le contenu principal est rendu côté serveur", ({ path, content }) => {
    const html = pages.get(path)!;
    expect(html, `${path} : <h1> absent du SSR`).toMatch(/<h1[\s>]/i);
    expect(html, `${path} : <main> absent du SSR`).toMatch(/<main[\s>]/i);
    for (const needle of content) {
      expect(
        html.toLowerCase().includes(needle.toLowerCase()),
        `${path} : contenu « ${needle} » absent du HTML serveur`,
      ).toBe(true);
    }
  });

  it.each(ROUTES)("$path : title, description et canonique auto-référente", ({ path }) => {
    const html = pages.get(path)!;
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "";
    expect(title.length, `${path} : <title> manquant`).toBeGreaterThan(10);
    expect(title).not.toMatch(/Lovable/i);
    expect(html, `${path} : meta description manquante`).toMatch(
      /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{50,}/i,
    );
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
    expect(canonical, `${path} : canonical manquante`).toBeTruthy();
    expect(canonical, `${path} : canonical non auto-référente (${canonical})`).toBe(
      `https://iktracker.fr${path === "/" ? "/" : path}`,
    );
  });

  it("aucun schéma JSON-LD n'est dupliqué sur une même page", () => {
    for (const { path } of ROUTES) {
      const nodes = extractJsonLd(pages.get(path)!);
      const keys = nodes
        .filter((n) => typeof n["@type"] === "string" && typeof n["name"] === "string")
        .map((n) => `${n["@type"]}::${n["name"]}`);
      const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
      expect(new Set(duplicates), `${path} : entités JSON-LD dupliquées`).toEqual(new Set());
    }
  });
});
