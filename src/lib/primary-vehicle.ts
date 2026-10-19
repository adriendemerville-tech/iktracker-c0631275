import type { Vehicle } from "@/types/trip";

/**
 * Liste les véhicules en plaçant le véhicule principal (celui de la préférence
 * defaultVehicleId) en premier. Les autres conservent leur ordre d'origine.
 * Sans véhicule principal connu, la liste est inchangée.
 */
export function sortVehiclesWithPrimaryFirst(
  vehicles: Vehicle[],
  defaultVehicleId: string | null | undefined,
): Vehicle[] {
  if (!defaultVehicleId) return vehicles;
  const primary = vehicles.filter((v) => v.id === defaultVehicleId);
  if (primary.length === 0) return vehicles;
  return [...primary, ...vehicles.filter((v) => v.id !== defaultVehicleId)];
}
