// @vitest-environment node
/**
 * Test de régression SSR — découverte automatique des pages publiques.
 *
 * Objectif : toute NOUVELLE page ajoutée dans src/routes/ est automatiquement
 * soumise aux invariants SEO/GEO de base, sans avoir à l'enregistrer ici :
 *   1. répond 200 ;
 *   2. contient un <h1> dans le HTML initial ;
 *   3. contient un volume minimal de texte visible (les bots IA et Googlebot
 *      lisent le HTML brut, sans exécuter le JS) ;
 *   4. contient un maillage interne minimal (liens <a href="/...">) ;
 *   5. a un <title> propre.
 *
 * Les alias (routes qui font `throw redirect(...)` sans composant) sont
 * détectés automatiquement et vérifiés comme redirections 301.
 *
 * Une page fonctionnelle sans contenu éditorial (formulaire, outil…) doit être
 * ajoutée EXPLICITEMENT à EXCLUSIONS avec une raison — c'est le filet qui
 * empêche d'oublier une nouvelle page.
 *
 * Le serveur de dev doit tourner ; sinon la suite est ignorée (CI hors app).
 * Base configurable via SSR_TEST_BASE_URL.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE_URL = process.env["SSR_TEST_BASE_URL"] ?? "http://localhost:8080";
const ROUTES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../routes");

/** Seuils génériques — volontairement bas pour ne tester que la régression. */
const MIN_TEXT_CHARS = 400;
const MIN_INTERNAL_LINKS = 3;

/**
 * Pages publiques fonctionnelles sans vocation éditoriale : exclues des
 * invariants texte/liens. Toute nouvelle page non éditoriale DOIT être
 * ajoutée ici avec sa raison, sinon le test la couvre automatiquement.
 */
const EXCLUSIONS: Record<string, string> = {
  auth: "Formulaire de connexion — page fonctionnelle, couverte par les tests SSR dédiés",
  signup: "Formulaire d'inscription — page fonctionnelle, couverte par les tests SSR dédiés",
  sso: "Callback SSO — page technique sans contenu",
  offline: "Page hors-ligne PWA — noindex, contenu minimal volontaire",
  unsubscribe: "Désabonnement e-mail — noindex, page transactionnelle",
  marina: "Outil interne d'analyse SEO — noindex, rendu via iframe srcDoc",
};

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

const serverUp = await isServerUp();

interface DiscoveredRoute {
  /** Chemin URL, ex. /bareme-ik-2026 */
  path: string;
  /** Nom de fichier sans extension, ex. bareme-ik-2026 */
  file: string;
  /** true si le fichier fait `throw redirect(...)` sans composant (alias 301) */
  isRedirect: boolean;
}

/** Découvre les pages publiques de premier niveau + l'index du blog. */
function discoverPublicRoutes(): DiscoveredRoute[] {
  const routes: DiscoveredRoute[] = [];

  for (const entry of readdirSync(ROUTES_DIR)) {
    if (!entry.endsWith(".tsx")) continue;
    const file = entry.replace(/\.tsx$/, "");
    if (file === "__root") continue;

    const source = readFileSync(path.join(ROUTES_DIR, entry), "utf8");
    const isRedirect = source.includes("throw redirect(") && !source.includes("component:");
    routes.push({ path: file === "index" ? "/" : `/${file}`, file, isRedirect });
  }

  // Index du blog : page publique éditoriale de premier niveau.
  const blogIndex = path.join(ROUTES_DIR, "blog/index.tsx");
  if (existsSync(blogIndex)) {
    routes.push({ path: "/blog", file: "blog/index", isRedirect: false });
  }

  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

/** Extrait le texte visible du HTML : retire scripts, styles, balises, entités. */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compte les liens internes distincts (href commençant par / ou iktracker.fr). */
function internalLinks(html: string): Set<string> {
  const hrefs = new Set<string>();
  for (const [, href] of html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)) {
    if (href.startsWith("/") || href.startsWith("https://iktracker.fr/")) {
      hrefs.add(href);
    }
  }
  return hrefs;
}

const allRoutes = discoverPublicRoutes();
const contentRoutes = allRoutes.filter((r) => !r.isRedirect && !(r.file in EXCLUSIONS));
const redirectRoutes = allRoutes.filter((r) => r.isRedirect);
const excludedRoutes = allRoutes.filter((r) => !r.isRedirect && r.file in EXCLUSIONS);

const pages = new Map<string, string>();

describe.skipIf(!serverUp)("régression SSR — toute nouvelle page sert texte et liens", () => {
  beforeAll(async () => {
    await Promise.all(
      contentRoutes.map(async ({ path: p }) => {
        const res = await fetch(`${BASE_URL}${p}`, { signal: AbortSignal.timeout(30000) });
        expect(res.status, `${p} doit répondre 200`).toBe(200);
        pages.set(p, await res.text());
      }),
    );
  }, 180000);

  it("la découverte trouve les pages publiques (garde-fou de configuration)", () => {
    // Si ce test échoue, la découverte est cassée et la suite ne protège plus rien.
    expect(contentRoutes.length).toBeGreaterThanOrEqual(20);
    expect(contentRoutes.map((r) => r.path)).toContain("/");
    expect(contentRoutes.map((r) => r.path)).toContain("/blog");
  });

  it("chaque exclusion correspond à une route existante (pas d'exclusion orpheline)", () => {
    const discoveredFiles = new Set(allRoutes.map((r) => r.file));
    for (const file of Object.keys(EXCLUSIONS)) {
      expect(
        discoveredFiles.has(file),
        `EXCLUSIONS[${file}] ne correspond à aucune route — à retirer`,
      ).toBe(true);
    }
  });

  it.each(contentRoutes.map((r) => [r.path] as const))(
    "%s : du texte visible est présent dans le HTML initial",
    (p) => {
      const text = visibleText(pages.get(p)!);
      expect(
        text.length,
        `${p} : seulement ${text.length} caractères de texte visible dans le SSR ` +
          `(minimum ${MIN_TEXT_CHARS}) — page rendue côté client uniquement ? ` +
          `Si c'est une page fonctionnelle sans contenu, l'ajouter à EXCLUSIONS.`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_CHARS);
    },
  );

  it.each(contentRoutes.map((r) => [r.path] as const))(
    "%s : un <h1> et un maillage interne minimal dans le HTML initial",
    (p) => {
      const html = pages.get(p)!;
      expect(html, `${p} : <h1> absent du SSR`).toMatch(/<h1[\s>]/i);
      const links = internalLinks(html);
      expect(
        links.size,
        `${p} : seulement ${links.size} liens internes dans le SSR ` +
          `(minimum ${MIN_INTERNAL_LINKS}) — maillage rendu côté client ?`,
      ).toBeGreaterThanOrEqual(MIN_INTERNAL_LINKS);
    },
  );

  it.each(contentRoutes.map((r) => [r.path] as const))(
    "%s : <title> présent et sans marqueur générique",
    (p) => {
      const title = pages.get(p)!.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "";
      expect(title.length, `${p} : <title> manquant`).toBeGreaterThan(10);
      expect(title, `${p} : titre générique « ${title} »`).not.toMatch(/Lovable/i);
    },
  );

  it.each(redirectRoutes.map((r) => [r.path] as const))(
    "%s : l'alias répond bien en redirection 301",
    async (p) => {
      const res = await fetch(`${BASE_URL}${p}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      expect(res.status, `${p} : attendu 301, reçu ${res.status}`).toBe(301);
      expect(res.headers.get("location"), `${p} : en-tête Location manquant`).toBeTruthy();
    },
  );

  it("récapitulatif de couverture (informationnel)", () => {
    console.log(
      `[ssr-regression] ${contentRoutes.length} pages de contenu testées, ` +
        `${redirectRoutes.length} alias 301 testés, ` +
        `${excludedRoutes.length} exclusions : ${excludedRoutes.map((r) => r.file).join(", ")}`,
    );
  });
});
