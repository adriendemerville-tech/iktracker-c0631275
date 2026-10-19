// Recopie fidèle du barème IK de src/types/trip.ts (le bundle Deno ne peut pas
// importer depuis src/types). Toute évolution du barème doit être reportée ici.
import type { SupabaseClient } from "@supabase/supabase-js";

export type IKRateOverride = "auto" | "tier2" | "tier3";

interface IKBareme {
  cv: string;
  upTo5000: { rate: number };
  from5001To20000: { rate: number; fixed: number };
  over20000: { rate: number };
}

const IK_BAREME: IKBareme[] = [
  { cv: "3", upTo5000: { rate: 0.529 }, from5001To20000: { rate: 0.316, fixed: 1065 }, over20000: { rate: 0.37 } },
  { cv: "4", upTo5000: { rate: 0.606 }, from5001To20000: { rate: 0.34, fixed: 1330 }, over20000: { rate: 0.407 } },
  { cv: "5", upTo5000: { rate: 0.636 }, from5001To20000: { rate: 0.357, fixed: 1395 }, over20000: { rate: 0.427 } },
  { cv: "6", upTo5000: { rate: 0.665 }, from5001To20000: { rate: 0.374, fixed: 1457 }, over20000: { rate: 0.447 } },
  { cv: "7+", upTo5000: { rate: 0.697 }, from5001To20000: { rate: 0.394, fixed: 1515 }, over20000: { rate: 0.47 } },
];

export function getIKBareme(fiscalPower: number): IKBareme {
  if (fiscalPower <= 3) return IK_BAREME[0];
  if (fiscalPower === 4) return IK_BAREME[1];
  if (fiscalPower === 5) return IK_BAREME[2];
  if (fiscalPower === 6) return IK_BAREME[3];
  return IK_BAREME[4];
}

export function getForcedRate(fiscalPower: number, override?: IKRateOverride | null): number | null {
  if (!override || override === "auto") return null;
  const bareme = getIKBareme(fiscalPower);
  if (override === "tier2") return bareme.from5001To20000.rate;
  if (override === "tier3") return bareme.over20000.rate;
  return null;
}

export function calculateTotalAnnualIK(
  totalAnnualKm: number,
  fiscalPower: number,
  override?: IKRateOverride | null,
): number {
  const forced = getForcedRate(fiscalPower, override);
  if (forced !== null) return totalAnnualKm * forced;
  const bareme = getIKBareme(fiscalPower);
  if (totalAnnualKm <= 5000) return totalAnnualKm * bareme.upTo5000.rate;
  if (totalAnnualKm <= 20000) return totalAnnualKm * bareme.from5001To20000.rate + bareme.from5001To20000.fixed;
  return totalAnnualKm * bareme.over20000.rate;
}

export interface VehicleRow {
  id: string;
  fiscal_power: number;
  is_electric: boolean | null;
}

export interface AdjustedTrip {
  id: string;
  old_ik_amount: number;
  new_ik_amount: number;
}

// Calcule l'IK marginal d'un trajet : part du barème cumulatif annuel
// (total(after) - total(before)), majorée de 20 % si le véhicule est électrique.
export function marginalIK(
  beforeKm: number,
  distanceKm: number,
  vehicle: { fiscal_power: number; is_electric?: boolean | null },
  override?: IKRateOverride | null,
): number {
  let ik =
    calculateTotalAnnualIK(beforeKm + distanceKm, vehicle.fiscal_power, override) -
    calculateTotalAnnualIK(beforeKm, vehicle.fiscal_power, override);
  if (vehicle.is_electric) ik *= 1.2;
  return Math.round(ik * 100) / 100;
}

// Recalcule les ik_amount de tous les trajets non supprimés des véhicules/années
// concernés, dans l'ordre chronologique — même logique que reassignPeriodToVehicle
// dans src/hooks/useTrips.ts. N'écrit que les montants qui changent.
export async function recalculateVehicleYearsIK(
  supabase: SupabaseClient,
  userId: string,
  vehicleIds: string[],
  years: number[],
  rateOverride: IKRateOverride,
): Promise<AdjustedTrip[]> {
  if (vehicleIds.length === 0 || years.length === 0) return [];

  const { data: vehicles, error: vErr } = await supabase
    .from("vehicles")
    .select("id, fiscal_power, is_electric")
    .eq("user_id", userId)
    .in("id", vehicleIds);
  if (vErr) throw new Error(vErr.message);
  const vehicleById = new Map((vehicles ?? []).map((v) => [v.id as string, v as VehicleRow]));

  const minDate = `${Math.min(...years)}-01-01`;
  const maxDate = `${Math.max(...years)}-12-31`;
  const { data: rows, error: tErr } = await supabase
    .from("trips")
    .select("id, vehicle_id, date, distance, ik_amount")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .in("vehicle_id", vehicleIds)
    .gte("date", minDate)
    .lte("date", maxDate)
    .order("date", { ascending: true });
  if (tErr) throw new Error(tErr.message);

  const cum = new Map<string, number>();
  const updates: { id: string; ik: number; old: number }[] = [];
  for (const r of rows ?? []) {
    const v = r.vehicle_id ? vehicleById.get(r.vehicle_id as string) : undefined;
    if (!v) continue;
    const year = Number(String(r.date).slice(0, 4));
    if (!years.includes(year)) continue;
    const key = `${r.vehicle_id}-${year}`;
    const before = cum.get(key) ?? 0;
    const after = before + (Number(r.distance) || 0);
    cum.set(key, after);
    const ik = marginalIK(before, Number(r.distance) || 0, v, rateOverride);
    const old = Number(r.ik_amount) || 0;
    if (Math.abs(ik - old) > 0.005) updates.push({ id: r.id as string, ik, old });
  }

  for (let i = 0; i < updates.length; i += 20) {
    await Promise.all(
      updates
        .slice(i, i + 20)
        .map((u) => supabase.from("trips").update({ ik_amount: u.ik }).eq("id", u.id)),
    );
  }
  return updates.map((u) => ({ id: u.id, old_ik_amount: u.old, new_ik_amount: u.ik }));
}

// Lit la préférence ik_rate_override de l'utilisateur (user_preferences).
export async function getIkRateOverride(
  supabase: SupabaseClient,
  userId: string,
): Promise<IKRateOverride> {
  const { data } = await supabase
    .from("user_preferences")
    .select("ik_rate_override")
    .eq("user_id", userId)
    .maybeSingle();
  const v = data?.ik_rate_override;
  return v === "tier2" || v === "tier3" ? v : "auto";
}
