/**
 * Barème kilométrique — SOURCE PARTAGÉE avec le web (src/types/trip.ts).
 * Toute modification doit être répercutée des deux côtés (ou extraite en package @iktracker/core).
 */

export interface IKBareme {
  cv: string;
  upTo5000: { rate: number };
  from5001To20000: { rate: number; fixed: number };
  over20000: { rate: number };
}

export const IK_BAREME: IKBareme[] = [
  { cv: '3', upTo5000: { rate: 0.529 }, from5001To20000: { rate: 0.316, fixed: 1065 }, over20000: { rate: 0.37 } },
  { cv: '4', upTo5000: { rate: 0.606 }, from5001To20000: { rate: 0.34, fixed: 1330 }, over20000: { rate: 0.407 } },
  { cv: '5', upTo5000: { rate: 0.636 }, from5001To20000: { rate: 0.357, fixed: 1395 }, over20000: { rate: 0.427 } },
  { cv: '6', upTo5000: { rate: 0.665 }, from5001To20000: { rate: 0.374, fixed: 1457 }, over20000: { rate: 0.447 } },
  { cv: '7+', upTo5000: { rate: 0.697 }, from5001To20000: { rate: 0.394, fixed: 1515 }, over20000: { rate: 0.47 } },
];

export type IKRateOverride = 'auto' | 'tier2' | 'tier3';

export function getIKBareme(fiscalPower: number): IKBareme {
  if (fiscalPower <= 3) return IK_BAREME[0];
  if (fiscalPower === 4) return IK_BAREME[1];
  if (fiscalPower === 5) return IK_BAREME[2];
  if (fiscalPower === 6) return IK_BAREME[3];
  return IK_BAREME[4];
}

export function getForcedRate(fiscalPower: number, override?: IKRateOverride | null): number | null {
  if (!override || override === 'auto') return null;
  const b = getIKBareme(fiscalPower);
  if (override === 'tier2') return b.from5001To20000.rate;
  if (override === 'tier3') return b.over20000.rate;
  return null;
}

export function calculateTotalAnnualIK(
  totalAnnualKm: number,
  fiscalPower: number,
  override?: IKRateOverride | null,
): number {
  const forced = getForcedRate(fiscalPower, override);
  if (forced !== null) return totalAnnualKm * forced;

  const b = getIKBareme(fiscalPower);
  if (totalAnnualKm <= 5000) return totalAnnualKm * b.upTo5000.rate;
  if (totalAnnualKm <= 20000) return totalAnnualKm * b.from5001To20000.rate + b.from5001To20000.fixed;
  return totalAnnualKm * b.over20000.rate;
}

/**
 * IK marginale d'un trajet : différentiel sur le cumul annuel.
 * Bonus 20% pour véhicule 100% électrique (jamais pour un hybride).
 */
export function calculateTripIK(params: {
  distance: number;
  totalAnnualKmBefore: number;
  fiscalPower: number;
  isElectric?: boolean;
  override?: IKRateOverride | null;
}): number {
  const { distance, totalAnnualKmBefore, fiscalPower, isElectric, override } = params;
  const after = totalAnnualKmBefore + distance;
  let ik =
    calculateTotalAnnualIK(after, fiscalPower, override) -
    calculateTotalAnnualIK(totalAnnualKmBefore, fiscalPower, override);
  if (isElectric) ik *= 1.2;
  return Math.round(ik * 100) / 100;
}
