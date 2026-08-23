// @vitest-environment node
/**
 * Identité « Organization » (GEO) — deux garanties :
 *
 * 1. La route racine injecte bien le JSON-LD Organization (nœud d'identité :
 *    legalName Voluntas Novare, postalAddress, contactPoint, sameAs) et tous
 *    les builders de schémas y font référence par son @id canonique.
 * 2. Dans le HTML servi, tout nœud Organization nommé « IKtracker » — nœud
 *    racine ou référence (publisher, author, worksFor, mainEntity…) — porte
 *    le même @id canonique https://iktracker.fr/#organization, pour que les
 *    moteurs et agents IA fusionnent les entités au lieu de créer des
 *    doublons d'identité.
 *
 * La partie « modules » tourne sans serveur ; la partie « HTML servi » est
 * ignorée si le serveur de dev ne répond pas (même convention que
 * ssr-structured-data.test.ts, base configurable via SSR_TEST_BASE_URL).
 */
import { describe, expect, it, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import {
  ORGANIZATION_ID,
  ORG_LEGAL_NAME,
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
} from "@/lib/seo-schemas";
import { HOME_JSON_LD_SCRIPTS } from "@/lib/home-schemas";
import { buildBlogPostSchemas } from "@/lib/blog-post-schemas";
import { buildAuthorPerson } from "@/lib/blog-schema-extractors";
import { DEVIS_ARTISAN_ARTICLE_SCHEMA } from "@/lib/logiciel-devis-artisan-schema";

const BASE_URL = process.env["SSR_TEST_BASE_URL"] ?? "http://localhost:8080";

type JsonLdNode = Record<string, unknown>;

/** Aplatit un graphe JSON-LD : nœuds racines et entités imbriquées. */
function flattenJsonLd(value: unknown, out: JsonLdNode[] = []): JsonLdNode[] {
  if (Array.isArray(value)) {
    value.forEach((v) => flattenJsonLd(v, out));
    return out;
  }
  if (!value || typeof value !== "object") return out;
  const node = value as JsonLdNode;
  out.push(node);
  for (const nested of Object.values(node)) {
    if (nested && typeof nested === "object") flattenJsonLd(nested, out);
  }
  return out;
}

const isOrganization = (n: JsonLdNode) => n["@type"] === "Organization";
const isIktrackerOrg = (n: JsonLdNode) => isOrganization(n) && n["name"] === "IKtracker";

describe("nœud d'identité Organization — builders (sans serveur)", () => {
  it("expose un @id canonique unique", () => {
    expect(ORGANIZATION_ID).toBe("https://iktracker.fr/#organization");
  });

  it("le schéma Organization racine porte l'@id canonique et l'identité Voluntas Novare", () => {
    const org = buildOrganizationSchema();
    expect(org["@type"]).toBe("Organization");
    expect(org["@id"]).toBe(ORGANIZATION_ID);
    expect(org.legalName).toBe("Voluntas Novare");
    expect(org.address).toMatchObject({ postalCode: "13210", addressCountry: "FR" });
    expect(org.contactPoint).toMatchObject({ email: "contact@iktracker.fr" });
    expect(org.sameAs).toEqual(
      expect.arrayContaining([expect.stringContaining("linkedin.com")]),
    );
  });

  it("le publisher de SoftwareApplication référence l'@id canonique", () => {
    const app = buildSoftwareApplicationSchema();
    expect(app.publisher["@id"]).toBe(ORGANIZATION_ID);
    expect(app.publisher.name).toBe("IKtracker");
    expect(app.publisher.legalName).toBe(ORG_LEGAL_NAME);
  });

  it("les schémas de la home ne contiennent que des Organizations à l'@id canonique", () => {
    const nodes = HOME_JSON_LD_SCRIPTS.flatMap((s) => flattenJsonLd(JSON.parse(s.children)));
    const orgs = nodes.filter(isIktrackerOrg);
    expect(orgs.length).toBeGreaterThan(0);
    for (const org of orgs) {
      expect(org["@id"], `home : Organization « IKtracker » sans @id canonique`).toBe(
        ORGANIZATION_ID,
      );
    }
  });

  it("les schémas d'un article de blog référencent l'@id canonique", () => {
    const schemas = buildBlogPostSchemas({
      slug: "test-slug",
      title: "Article de test",
      description: "Description de test.",
      content: "quelques mots pour le comptage",
    });
    const orgs = schemas.flatMap((s) => flattenJsonLd(s)).filter(isIktrackerOrg);
    expect(orgs.length).toBeGreaterThan(0);
    for (const org of orgs) {
      expect(org["@id"], `blog : Organization « IKtracker » sans @id canonique`).toBe(
        ORGANIZATION_ID,
      );
    }
  });

  it("buildAuthorPerson rattache tout auteur à l'Organization canonique", () => {
    for (const author of [null, "Rédaction IKtracker", "Jean Dupont"]) {
      const person = buildAuthorPerson(author);
      expect(person.worksFor["@id"], `worksFor sans @id canonique pour « ${author} »`).toBe(
        ORGANIZATION_ID,
      );
    }
  });

  it("le schéma Article de /logiciel-devis-artisan référence l'@id canonique", () => {
    expect(DEVIS_ARTISAN_ARTICLE_SCHEMA.publisher["@id"]).toBe(ORGANIZATION_ID);
  });

  it("la route racine injecte le JSON-LD Organization via head().scripts", () => {
    const rootSource = readFileSync("src/routes/__root.tsx", "utf-8");
    expect(rootSource).toContain("buildOrganizationSchema");
    expect(rootSource).toMatch(/organizationJsonLd\s*=\s*JSON\.stringify\(buildOrganizationSchema\(\)\)/);
    expect(rootSource).toContain('{ type: "application/ld+json", children: organizationJsonLd }');
  });
});

/**
 * Routes couvrant tous les gabarits de schémas de page : accueil, landing
 * pages, articles piliers, comparatifs, lexique, blog + article, page auteur
 * (worksFor « Avenir Rénovations » = Organization étrangère) et /terms, qui
 * n'apporte aucun schéma propre — l'Organization qui s'y trouve ne peut venir
 * que de la route racine.
 */
const SSR_ROUTES = [
  "/",
  "/terms",
  "/contact",
  "/lexique",
  "/blog",
  "/blog/auteur/adrien-de-volontat",
  "/blog/stack-outils-artisan-devis-vocal-kilometres-visibilite",
  "/bareme-ik-2026",
  "/artisans",
  "/independants",
  "/comparatif-izika",
  "/comparatif-driversnote",
  "/meilleure-application-indemnites-kilometriques",
  "/indemnite-kilometrique-velo",
  "/indemnite-grand-deplacement-2026",
  "/logiciel-devis-artisan",
];

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

const serverUp = await isServerUp();

describe.skipIf(!serverUp)("nœud d'identité Organization — HTML servi (SSR)", () => {
  const pages = new Map<string, JsonLdNode[]>();

  beforeAll(async () => {
    await Promise.all(
      SSR_ROUTES.map(async (path) => {
        const res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(30000) });
        expect(res.status, `${path} doit répondre 200`).toBe(200);
        const html = await res.text();
        const nodes = [
          ...html.matchAll(
            /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
          ),
        ].flatMap(([, raw]) =>
          flattenJsonLd(JSON.parse(raw.replace(/\\u003c/g, "<").trim())),
        );
        pages.set(path, nodes);
      }),
    );
  }, 120000);

  it.each(SSR_ROUTES)("%s : la route racine injecte le nœud Organization canonique", (path) => {
    const nodes = pages.get(path)!;
    const rootOrg = nodes.find((n) => isOrganization(n) && n["@id"] === ORGANIZATION_ID);
    expect(rootOrg, `${path} : JSON-LD Organization racine absent du SSR`).toBeTruthy();
    expect(
      rootOrg!.legalName,
      `${path} : legalName « Voluntas Novare » manquant sur le nœud racine`,
    ).toBe(ORG_LEGAL_NAME);
  });

  it.each(SSR_ROUTES)(
    "%s : toute Organization « IKtracker » porte l'@id canonique",
    (path) => {
      const nodes = pages.get(path)!;
      const offenders = nodes.filter((n) => isIktrackerOrg(n) && n["@id"] !== ORGANIZATION_ID);
      expect(
        offenders,
        `${path} : ${offenders.length} nœud(s) Organization « IKtracker » sans @id canonique`,
      ).toEqual([]);
    },
  );

  it("les Organizations étrangères (Avenir Rénovations) ne portent PAS l'@id IKtracker", () => {
    const nodes = pages.get("/blog/auteur/adrien-de-volontat")!;
    const foreign = nodes.filter((n) => isOrganization(n) && n["name"] !== "IKtracker");
    expect(foreign.length, "page auteur : worksFor « Avenir Rénovations » attendu").toBeGreaterThan(
      0,
    );
    for (const org of foreign) {
      expect(org["@id"]).not.toBe(ORGANIZATION_ID);
    }
  });
});
