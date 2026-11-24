/**
 * Décalage ajouté au nombre réel d'inscrits pour l'affichage public.
 * Une seule constante : il n'est appliqué qu'à un comptage réussi, jamais comme repli.
 */
export const USER_COUNT_OFFSET = 1432;

/**
 * Interprète le retour de `get_public_user_count` (entier JSON ou chaîne numérique).
 * Null si la charge n'est pas un entier positif ou nul : on n'invente pas 0.
 */
export function parsePublicUserCount(data: unknown): number | null {
  const numeric =
    typeof data === "number"
      ? data
      : typeof data === "string" && data.trim() !== ""
        ? Number(data)
        : Number.NaN;
  if (!Number.isFinite(numeric) || numeric < 0 || !Number.isInteger(numeric)) return null;
  return numeric;
}

/** Nombre affiché = inscrits réels + décalage. */
export function displayedRegisteredUserCount(base: number): number {
  return base + USER_COUNT_OFFSET;
}
