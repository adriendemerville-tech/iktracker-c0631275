// HTML/CSS based print utility - replaces heavy PDF libraries
// Uses native browser print dialog with @media print for PDF generation

import {
  Trip,
  Vehicle,
  IK_BAREME_2024,
  calculateTotalAnnualIK,
  getIKBareme,
  IKRateOverride,
} from "@/types/trip";

// Escape user-controlled values before interpolating into HTML to prevent XSS.
export function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Fuseau horaire d'affichage des horodatages d'étapes (fixe pour l'audit).
export const AUDIT_TIMEZONE = "Europe/Paris";
export const TZ_LABEL_SUFFIX = ` · heures ${AUDIT_TIMEZONE}`;

// Formatte un timestamp d'étape en HH:MM dans le fuseau d'audit, avec fallback.
export function formatStopTime(iso: string | undefined | null): { time: string; missing: boolean } {
  if (!iso) return { time: "--:--", missing: true };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { time: "--:--", missing: true };
  try {
    return {
      time: new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: AUDIT_TIMEZONE,
      }).format(d),
      missing: false,
    };
  } catch {
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return { time: `${hh}:${mm}`, missing: false };
  }
}

export interface UserInfo {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}

export interface PrintReportOptions {
  trips: Trip[];
  vehicles: Vehicle[];
  totalKm: number;
  logoUrl?: string;
  userInfo?: UserInfo;
  sinceDate?: Date;
  ikRateOverride?: IKRateOverride;
}

export interface RecalculatedTrip extends Trip {
  recalculatedIK: number;
  cumulativeKm: number;
  appliedRate: number;
}

export function recalculateTrips(
  trips: Trip[],
  vehicles: Vehicle[],
  override: IKRateOverride = "auto",
): RecalculatedTrip[] {
  const getVehicle = (id: string) => vehicles.find((v) => v.id === id);
  const grouped = new Map<string, Trip[]>();

  trips.forEach((trip) => {
    const year = new Date(trip.startTime).getFullYear();
    const key = `${trip.vehicleId}-${year}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(trip);
  });

  const result: RecalculatedTrip[] = [];

  grouped.forEach((vehicleTrips, key) => {
    const vehicleId = key.split("-")[0];
    const vehicle = getVehicle(vehicleId);
    const sorted = [...vehicleTrips].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    let cumulativeKm = 0;

    sorted.forEach((trip) => {
      const prevCumulativeKm = cumulativeKm;
      cumulativeKm += trip.distance;

      if (!vehicle) {
        result.push({ ...trip, recalculatedIK: trip.ikAmount, cumulativeKm, appliedRate: 0 });
        return;
      }

      const ikBefore = calculateTotalAnnualIK(prevCumulativeKm, vehicle.fiscalPower, override);
      const ikAfter = calculateTotalAnnualIK(cumulativeKm, vehicle.fiscalPower, override);
      let recalculatedIK = ikAfter - ikBefore;
      if (vehicle.isElectric) recalculatedIK = recalculatedIK * 1.2;

      const bareme = getIKBareme(vehicle.fiscalPower);
      let appliedRate: number;
      if (override === "tier2") appliedRate = bareme.from5001To20000.rate;
      else if (override === "tier3") appliedRate = bareme.over20000.rate;
      else {
        appliedRate = bareme.upTo5000.rate;
        if (cumulativeKm > 20000) appliedRate = bareme.over20000.rate;
        else if (cumulativeKm > 5000) appliedRate = bareme.from5001To20000.rate;
      }

      result.push({ ...trip, recalculatedIK, cumulativeKm, appliedRate });
    });
  });

  return result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

// Extract city name from full address (e.g., "255 chemin des masques, 13160 Châteaurenard" → "Châteaurenard")
export function extractCity(address: string): string {
  const parts = address.split(",").map((p) => p.trim());

  // Look for postal code + city pattern
  for (const part of parts) {
    const postalMatch = part.match(/^\d{5}\s+(.+)$/);
    if (postalMatch) {
      return postalMatch[1];
    }
  }

  // Fallback: try to get last meaningful part
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    // Skip "France", postal-only, or very short strings
    if (part.match(/^france$/i) || part.match(/^\d{5}$/) || part.length < 3) continue;
    // Skip if it looks like a street (contains numbers at start or "rue", "avenue", etc.)
    if (part.match(/^\d/) || part.match(/^(rue|avenue|boulevard|chemin|allée|place|impasse)/i))
      continue;
    return part;
  }

  // Ultimate fallback: truncate address
  return address.length > 25 ? address.substring(0, 24) + "…" : address;
}

