/**
 * Affichage français des montants.
 *
 * Le séparateur de milliers et l'espace avant « € » sont des espaces
 * insécables (U+00A0). L'espace fine (U+202F) existe dans le format monétaire
 * du navigateur, mais elle est presque invisible dans la police d'affichage :
 * « 7 067 » se lit alors « 7067 ». Une espace insécable pleine reste groupée
 * et ne coupe pas le montant du symbole.
 *
 * On ne passe pas par toLocaleString : selon le moteur, un nombre simple
 * (« 7067 ») perd le groupement alors que le format monétaire le garde.
 * Les chiffres eux-mêmes ne sont pas recalculés.
 */

/** Espace insécable : milliers et symbole €. */
export const FR_NBSP = "\u00A0";

export function formatFrNumber(value: number, fractionDigits = 0): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [intPart, decPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, FR_NBSP);
  const body = decPart !== undefined ? `${grouped},${decPart}` : grouped;
  return negative ? `-${body}` : body;
}

/** Montant collé au symbole €. */
export function formatFrEuros(value: number, fractionDigits = 0): string {
  return `${formatFrNumber(value, fractionDigits)}${FR_NBSP}€`;
}

/** Taux à 3 décimales, virgule française (0,374). */
export function formatFrRate(rate: number): string {
  return formatFrNumber(rate, 3);
}

type BaremeCell = { rate: number; fixed?: number };

/** Formule du tableau : « d × 0,374 € » ou « (d × 0,374) + 1 457 € ». */
export function formatBaremeFormula(cell: BaremeCell): string {
  const rate = formatFrRate(cell.rate);
  if (cell.fixed !== undefined) {
    return `(d × ${rate}) + ${formatFrNumber(cell.fixed)}${FR_NBSP}€`;
  }
  return `d × ${rate}${FR_NBSP}€`;
}

/** Taux au kilomètre : « 0,374 €/km » ou avec part fixe. */
export function formatBaremePerKm(cell: BaremeCell): string {
  const rate = `${formatFrRate(cell.rate)}${FR_NBSP}€/km`;
  if (cell.fixed !== undefined) {
    return `${rate} + ${formatFrEuros(cell.fixed)}`;
  }
  return rate;
}
