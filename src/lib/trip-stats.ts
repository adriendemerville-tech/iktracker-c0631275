/**
 * Compteurs publics « trajets enregistrés » et « kilomètres suivis ».
 * Le couple {0, 0} est l'ancien repli : on ne l'affiche pas et on ne le met pas en cache.
 */

/**
 * Budget de la lecture au rendu. L'ancien plafond de 120 ms rendait 0
 * avant la réponse de la base : le HTML affichait donc 0 trajet et 0 km.
 */
export const PUBLIC_TRIP_STATS_DEADLINE_MS = 2_500;

export interface PublicTripStats {
  tripCount: number;
  totalKm: number;
}

function parseNonNegativeNumber(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric;
}

function parseNonNegativeInteger(value: unknown): number | null {
  const numeric = parseNonNegativeNumber(value);
  if (numeric == null || !Number.isInteger(numeric)) return null;
  return numeric;
}

/**
 * Interprète le retour de `get_public_trip_stats` (une ligne, ou un tableau d'une ligne).
 * Null si la charge n'est pas lisible : on n'invente pas 0.
 */
export function parsePublicTripStats(data: unknown): PublicTripStats | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const tripCount = parseNonNegativeInteger(record.trip_count);
  const distance = parseNonNegativeNumber(record.total_distance);
  if (tripCount == null || distance == null) return null;
  return { tripCount, totalKm: Math.round(distance) };
}

/** Le couple nul est le repli historique, pas une mesure à publier. */
export function isZeroTripStatsFallback(stats: PublicTripStats): boolean {
  return stats.tripCount === 0 && stats.totalKm === 0;
}

/**
 * Mesure affichable. Null si la charge est illisible ou si c'est le couple {0, 0}.
 */
export function publishablePublicTripStats(stats: PublicTripStats | null): PublicTripStats | null {
  if (!stats || isZeroTripStatsFallback(stats)) return null;
  return stats;
}

/**
 * Amorçage du cache navigateur et du rendu. Nombres réels uniquement :
 * un 0 isolé de repli, ou le couple nul, ne devient pas la donnée fraîche.
 */
export function publicTripStatsSeed(tripCount: unknown, totalKm: unknown): PublicTripStats | null {
  if (typeof tripCount !== "number" || typeof totalKm !== "number") return null;
  if (!Number.isInteger(tripCount) || tripCount < 0 || !Number.isFinite(totalKm) || totalKm < 0) {
    return null;
  }
  return publishablePublicTripStats({ tripCount, totalKm: Math.round(totalKm) });
}
