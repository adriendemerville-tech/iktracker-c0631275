import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getIKBareme, type Trip, type Vehicle } from "@/types/trip";
import { generateCleanPdfHTML } from "./clean-pdf-html";
import { generateReportHTML } from "./report-html";
import { recalculateTrips } from "./report-shared";

const vehicle: Vehicle = {
  id: "veh-6cv",
  name: "Berline",
  ownerFirstName: "",
  ownerLastName: "",
  licensePlate: "AA-000-AA",
  make: "Berline",
  model: "6 CV",
  fiscalPower: 6,
  isElectric: false,
};

function fixtureTrip(id: string, distance: number, startTime: Date, purpose: string): Trip {
  return {
    id,
    vehicleId: vehicle.id,
    startLocation: { id: "depart", name: "Point A", address: "Point A", type: "other" },
    endLocation: { id: "arrivee", name: "Point B", address: "Point B", type: "other" },
    distance,
    baseDistance: distance,
    roundTrip: false,
    purpose,
    startTime,
    endTime: startTime,
    ikAmount: 0,
    status: "validated",
  };
}

function tripRow(html: string, purpose: string): string {
  const start = html.indexOf(purpose);
  if (start < 0) return "";
  const trStart = html.lastIndexOf("<tr", start);
  const trEnd = html.indexOf("</tr>", start);
  if (trStart < 0 || trEnd < 0) return "";
  return html.slice(trStart, trEnd + 5);
}

describe("relevé filtré depuis le 1er octobre", () => {
  const since = new Date(2026, 9, 1);
  const prior = fixtureTrip(
    "avant-octobre",
    5200,
    new Date(2026, 8, 30, 12, 0, 0),
    "Cumul jusqu'au 30 septembre",
  );
  const october = fixtureTrip(
    "octobre",
    100,
    new Date(2026, 9, 2, 12, 0, 0),
    "Trajet du 2 octobre",
  );

  const annual = recalculateTrips([prior, october], [vehicle]);
  const filtered = annual.filter((trip) => new Date(trip.startTime) >= since);
  const period = filtered[0];

  it("applique le tarif de 2e tranche (0,374) et non 0,665", () => {
    const bareme = getIKBareme(6);
    expect(bareme.upTo5000.rate).toBe(0.665);
    expect(bareme.from5001To20000.rate).toBe(0.374);

    expect(filtered).toHaveLength(1);
    expect(period.appliedRate).toBe(0.374);
    expect(period.cumulativeKm).toBe(5300);
    expect(period.recalculatedIK).toBeCloseTo(100 * 0.374, 5);
    expect(period.recalculatedIK).not.toBeCloseTo(100 * 0.665, 2);

    const isolated = recalculateTrips([october], [vehicle])[0];
    expect(isolated.appliedRate).toBe(0.665);
    expect(isolated.cumulativeKm).toBe(100);
  });

  it("inscrit ce cumul et ce montant dans le HTML du PDF et de l'impression", () => {
    const options = {
      trips: filtered,
      vehicles: [vehicle],
      totalKm: 100,
      sinceDate: since,
    };
    for (const html of [generateReportHTML(options), generateCleanPdfHTML(options)]) {
      expect(html.includes("Cumul jusqu'au 30 septembre")).toBe(false);
      const row = tripRow(html, "Trajet du 2 octobre");
      expect(row).toContain(">5300<");
      expect(row).toContain(`${period.recalculatedIK.toFixed(2)} €`);
      expect(row.includes("66.50 €")).toBe(false);
    }
  });

  it("branche le PDF et l'impression de Mes trajets sur le cumul déjà filtré", () => {
    const source = readFileSync("src/pages/MesTrajets.tsx", "utf8");
    expect(source.match(/trips: filteredRecalculatedTrips/g)).toHaveLength(3);
    expect(source.includes("trips: filteredTripsForReport")).toBe(false);
  });
});
