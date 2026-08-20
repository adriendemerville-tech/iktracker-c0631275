import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PAGE_DATES, getPageDates, toIsoDateTime, type PageDatesKey } from "./page-dates";

const ROOT = path.resolve(__dirname, "../..");
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Page statique = route TanStack + composant page, tous deux référencés ici. */
const PAGE_SOURCES: Record<PageDatesKey, string> = {
  "/bareme-ik-2026": "src/pages/BaremeIK2026.tsx",
  "/indemnite-kilometrique-velo": "src/pages/IndemniteKilometriqueVelo.tsx",
  "/indemnite-grand-deplacement-2026": "src/pages/IndemniteGrandDeplacement2026.tsx",
  "/meilleure-application-indemnites-kilometriques": "src/pages/MeilleureApplicationIK.tsx",
  "/artisans": "src/pages/Artisans.tsx",
  "/comparatif-izika": "src/pages/ComparatifIzika.tsx",
  "/comparatif-driversnote": "src/pages/ComparatifDriversNote.tsx",
};

const keys = Object.keys(PAGE_DATES) as PageDatesKey[];
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("page-dates registry", () => {
  it("couvre exactement les pages statiques déclarées", () => {
    expect(Object.keys(PAGE_SOURCES).sort()).toEqual(keys.slice().sort());
  });

  it.each(keys)("%s a des dates ISO valides et cohérentes", (key) => {
    const { published, modified } = getPageDates(key);
    expect(published).toMatch(ISO_DAY);
    expect(modified).toMatch(ISO_DAY);
    expect(Number.isNaN(Date.parse(published))).toBe(false);
    expect(Number.isNaN(Date.parse(modified))).toBe(false);
    // dateModified ne peut jamais précéder datePublished (erreur Search Console).
    expect(Date.parse(modified)).toBeGreaterThanOrEqual(Date.parse(published));
    // ni être dans le futur.
    expect(Date.parse(modified)).toBeLessThanOrEqual(Date.now());
  });

  it("toIsoDateTime produit un datetime complet avec fuseau", () => {
    expect(toIsoDateTime("2026-01-22")).toBe("2026-01-22T00:00:00+01:00");
    expect(toIsoDateTime("2026-01-22T10:00:00Z")).toBe("2026-01-22T10:00:00Z");
  });

  it.each(keys)("%s correspond à un fichier de route existant", (key) => {
    const routeFile = path.join(ROOT, "src/routes", `${key.replace(/^\//, "")}.tsx`);
    expect(existsSync(routeFile), `route manquante pour ${key}`).toBe(true);
  });
});

describe("cohérence JSON-LD / balise de date par page statique", () => {
  it.each(keys)("%s : le JSON-LD lit le registre, pas une date en dur", (key) => {
    const src = read(PAGE_SOURCES[key]);
    expect(src).toContain(`getPageDates("${key}")`);

    const published = src.match(/datePublished:\s*([^,\n]+)/);
    const modified = src.match(/dateModified:\s*([^,\n]+)/);
    expect(published, "datePublished absent du JSON-LD").not.toBeNull();
    expect(modified, "dateModified absent du JSON-LD").not.toBeNull();
    // Aucune date littérale : la valeur doit dériver de PAGE_DATE.
    expect(published![1]).not.toMatch(/["']\d{4}-\d{2}-\d{2}/);
    expect(modified![1]).not.toMatch(/["']\d{4}-\d{2}-\d{2}/);
    // …et doit dériver du registre, directement ou via une constante locale.
    expect(published![1]).toMatch(/PAGE_DATE\.published|PAGE_PUBLISHED/);
    expect(modified![1]).toMatch(/PAGE_DATE\.modified|PAGE_MODIFIED/);
  });

  it.each(keys)("%s : la mention « Mis à jour le » utilise dateModified", (key) => {
    const src = read(PAGE_SOURCES[key]);
    expect(src, "composant LastUpdated absent").toContain("<LastUpdated");
    const usage = src.match(/<LastUpdated[^>]*date=\{?([^}\s]+)\}?/);
    expect(usage, "prop date manquante sur <LastUpdated>").not.toBeNull();
    expect(usage![1]).toMatch(/PAGE_DATE\.modified|PAGE_MODIFIED/);
  });

  it.each(keys)("%s : mainEntityOfPage pointe vers l'URL canonique de la page", (key) => {
    const src = read(PAGE_SOURCES[key]);
    const expected = `https://iktracker.fr${key}`;
    const inline = src.includes(`mainEntityOfPage: "${expected}"`);
    const viaConst = /mainEntityOfPage:\s*PAGE_URL/.test(src) && src.includes(`"${expected}"`);
    expect(inline || viaConst, `mainEntityOfPage incohérent pour ${key}`).toBe(true);
  });
});

describe("articles de blog", () => {
  it("dérive les deux dates de la base et non de constantes", () => {
    const src = read("src/pages/BlogPost.tsx");
    expect(src).toMatch(/datePublished:\s*dateISO/);
    expect(src).toMatch(/dateModified:\s*modifiedDateISO/);
    expect(src).toContain("post.updated_at");
    expect(src).toContain("<LastUpdated");
  });
});
