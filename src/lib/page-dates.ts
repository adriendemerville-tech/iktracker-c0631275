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
