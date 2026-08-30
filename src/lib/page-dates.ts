/**
 * Source unique de vérité des dates éditoriales des pages statiques.
 *
 * Chaque entrée alimente à la fois :
 *  - le JSON-LD de la page (datePublished / dateModified)
 *  - la mention visible « Mis à jour le … » (<LastUpdated />)
 *
 * Les deux ne peuvent donc plus diverger. Format ISO court (YYYY-MM-DD).
 */
export type PageDates = { published: string; modified: string };

export const PAGE_DATES = {
  "/bareme-ik-2026": { published: "2024-12-01", modified: "2026-01-22" },
  "/indemnite-kilometrique-velo": { published: "2026-06-29", modified: "2026-06-29" },
  "/indemnite-grand-deplacement-2026": { published: "2026-01-15", modified: "2026-07-25" },
  "/meilleure-application-indemnites-kilometriques": {
    published: "2026-07-24",
    modified: "2026-07-24",
  },
  "/artisans": { published: "2026-07-20", modified: "2026-08-03" },
  "/logiciel-devis-artisan": { published: "2026-08-20", modified: "2026-08-20" },
  "/indemnites-kilometriques-2027": { published: "2026-08-30", modified: "2026-08-30" },
  "/comparatif-izika": { published: "2026-02-03", modified: "2026-02-03" },
  "/comparatif-driversnote": { published: "2026-02-03", modified: "2026-02-03" },
} as const satisfies Record<string, PageDates>;

export type PageDatesKey = keyof typeof PAGE_DATES;

/** Renvoie les dates d'une page statique référencée. */
export function getPageDates(key: PageDatesKey): PageDates {
  return PAGE_DATES[key];
}

/** Convertit une date courte en ISO complet (utile pour le JSON-LD). */
export function toIsoDateTime(date: string): string {
  return date.length === 10 ? `${date}T00:00:00+01:00` : date;
}

/**
 * Dernière modification réelle (date du dernier commit touchant la page)
 * des URLs statiques, servie telle quelle dans <lastmod> du sitemap.
 * Ne jamais dériver ces valeurs de la date du build : une valeur absente
 * doit rester absente.
 */
export const STATIC_PAGE_LASTMOD: Record<string, string> = {
  "/": "2026-08-27",
  "/signup": "2026-08-26",
  "/mode-tournee": "2026-08-27",
  "/calendrier": "2026-08-16",
  "/expert-comptable": "2026-08-16",
  "/installer": "2026-08-16",
  "/bareme-ik-2026": "2026-08-23",
  "/indemnites-kilometriques": "2026-08-27",
  "/frais-reels": "2026-08-19",
  "/note-de-frais-kilometrique": "2026-08-19",
  "/indemnite-kilometrique-velo": "2026-08-23",
  "/indemnite-grand-deplacement-2026": "2026-08-23",
  "/mes-trajets": "2026-08-16",
  "/meilleure-application-indemnites-kilometriques": "2026-08-23",
  "/tarifs": "2026-08-24",
  "/lexique": "2026-08-23",
  "/comparatif-izika": "2026-08-23",
  "/comparatif-driversnote": "2026-08-23",
  "/api-docs": "2026-08-16",
  "/fonctionnalites": "2026-08-19",
  "/artisans": "2026-08-23",
  "/logiciel-devis-artisan": "2026-08-20",
  "/independants": "2026-08-23",
  "/blog": "2026-08-23",
  "/blog/auteur/adrien-de-volontat": "2026-08-24",
  "/mentions-legales": "2026-08-23",
  "/contact": "2026-08-24",
  "/privacy": "2026-08-23",
  "/rgpd": "2026-08-23",
  "/terms": "2026-08-23",
};

/**
 * Date de dernière mise à jour d'une URL statique, utilisable pour l'affichage
 * visible « Mis à jour le … » sur les pages publiques qui n'ont pas de couple
 * published/modified éditorial. Renvoie undefined si l'URL n'est pas suivie.
 */
export function getStaticLastModified(path: string): string | undefined {
  return STATIC_PAGE_LASTMOD[path];
}
