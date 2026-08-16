import { Trip, Vehicle, IK_BAREME_2024 } from "@/types/trip";
import {
  esc,
  formatStopTime,
  recalculateTrips,
  extractCity,
  TZ_LABEL_SUFFIX,
  type PrintReportOptions,
} from "./report-shared";

// Generate clean HTML without action bar and scripts - optimized for PDF export via html2pdf.js
export function generateCleanPdfHTML(options: PrintReportOptions): string {
  const { trips, vehicles, totalKm, userInfo, logoUrl, ikRateOverride = "auto" } = options;
  const logoSrc = logoUrl || "/logo-iktracker-250.webp";

  const now = new Date();
  const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();

  const editionDate = now.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const userDisplayName =
    userInfo?.firstName || userInfo?.lastName
      ? `${userInfo.firstName || ""} ${userInfo.lastName || ""}`.trim()
      : null;
  const userEmail = userInfo?.email || null;

  const vehicle = vehicles.length > 0 ? vehicles[0] : null;

  const titulaireNom =
    userDisplayName ||
    (vehicle?.ownerFirstName || vehicle?.ownerLastName
      ? `${vehicle.ownerFirstName || ""} ${vehicle.ownerLastName || ""}`.trim()
      : null) ||
    userEmail;

  const vehicleName = vehicle
    ? `${vehicle.make || ""} ${vehicle.model || ""}`.trim() || `Véhicule ${vehicle.fiscalPower} CV`
    : "";

  const recalculatedTrips = recalculateTrips(trips, vehicles, ikRateOverride);
  const recalculatedTotalIK = recalculatedTrips.reduce((sum, t) => sum + t.recalculatedIK, 0);

  const tripRows = recalculatedTrips
    .map((t, i) => {
      const tripDate = new Date(t.startTime);
      const day = tripDate.getDate().toString().padStart(2, "0");
      const month = (tripDate.getMonth() + 1).toString().padStart(2, "0");
      const year = tripDate.getFullYear().toString().slice(-2);
      const startCity = extractCity(t.startLocation.address || t.startLocation.name);
      const endCity = extractCity(t.endLocation.address || t.endLocation.name);
      const motifRaw = t.purpose || "-";
      const motif = motifRaw.length > 60 ? motifRaw.substring(0, 59) + "…" : motifRaw;
      const bgColor = i % 2 === 0 ? "#ffffff" : "#f9fafb";

      const isTour = Array.isArray(t.tourStops) && t.tourStops.length >= 2;
      let tourDetailRow = "";
      if (isTour) {
        const stopsHtml = t
          .tourStops!.map((s, idx) => {
            const { time, missing } = formatStopTime(s.timestamp);
            const label = s.address || s.city || `Étape ${idx + 1}`;
            const timeColor = missing ? "#9ca3af" : "#111827";
            const suffix = missing
              ? ' <span style="color:#9ca3af; font-style: italic;">(heure non enregistrée)</span>'
              : "";
            return `<div style="display: flex; padding: 3px 0; font-size: 10px; color: #374151;">
          <span style="display: inline-block; width: 22px; font-weight: 700; color: #2563eb;">${idx + 1}.</span>
          <span style="display: inline-block; width: 50px; font-weight: 600; color: ${timeColor};">${time}</span>
          <span style="flex: 1; color: #4b5563;">${esc(label)}${suffix}</span>
        </div>`;
          })
          .join("");
        tourDetailRow = `
      <tr style="background-color: ${bgColor};">
        <td colspan="7" style="padding: 6px 12px 10px 20px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-size: 10px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px;">Détail de la tournée · ${t.tourStops!.length} étapes${TZ_LABEL_SUFFIX}</div>
          ${stopsHtml}
        </td>
      </tr>`;
      }

      const mainRow = `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-weight: 500; font-size: 11px;">${day}/${month}/${year}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px;">${esc(startCity)}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px;">${esc(endCity)}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-size: 10px; color: #6b7280;">${esc(motif)}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; font-size: 11px;">${Math.round(t.distance)}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #9ca3af; font-size: 11px;">${Math.round(t.cumulativeKm)}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #2563eb; font-size: 11px;">${t.recalculatedIK.toFixed(2)} €</td>
      </tr>`;

      return isTour
        ? `<tbody style="page-break-inside: avoid;">${mainRow}${tourDetailRow}</tbody>`
        : mainRow;
    })
    .join("");

  const baremeRows = IK_BAREME_2024.map((b, i) => {
    const bgColor = i % 2 === 0 ? "#ffffff" : "#f9fafb";
    return `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 11px;">${b.cv === "7+" ? "7 CV et +" : b.cv + " CV"}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px;">d × ${b.upTo5000.rate}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px;">(d × ${b.from5001To20000.rate}) + ${b.from5001To20000.fixed}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px;">d × ${b.over20000.rate}</td>
      </tr>
    `;
  }).join("");

  const userIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const carIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
  const calendarIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;

  // Clean HTML without action bar and scripts - optimized for html2canvas capture
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Relevé IK - ${currentMonth} ${currentYear}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      background: #ffffff;
      line-height: 1.4;
      padding: 20px 30px;
    }
    .page {
      width: 100%;
      background: #fff;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <table style="width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="vertical-align: middle;">
          <img src="${logoSrc}" alt="IKtracker" style="height: 40px; width: auto;" crossorigin="anonymous" />
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <div style="font-size: 18px; font-weight: 700; color: #111;">Relevé des Frais Kilométriques</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Édité le ${editionDate}</div>
        </td>
      </tr>
    </table>
    
    <!-- Identity Cards -->
    <table style="width: 100%; margin-bottom: 16px; border-spacing: 10px 0; border-collapse: separate;">
      <tr>
        <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <div style="width: 28px; height: 28px; background: #eff6ff; border-radius: 6px; display: flex; align-items: center; justify-content: center;">${userIcon}</div>
            <span style="margin-left: 8px; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase;">TITULAIRE</span>
          </div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">Nom</div>
          <div style="font-size: 12px; font-weight: 600; color: #111827;">${esc(titulaireNom) || "-"}</div>
        </td>
        <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <div style="width: 28px; height: 28px; background: #eff6ff; border-radius: 6px; display: flex; align-items: center; justify-content: center;">${carIcon}</div>
            <span style="margin-left: 8px; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase;">VÉHICULE</span>
          </div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">Modèle</div>
          <div style="font-size: 12px; font-weight: 600; color: #111827;">${esc(vehicleName) || "-"}</div>
          <div style="font-size: 11px; color: #9ca3af; margin-top: 6px; margin-bottom: 2px;">Puissance</div>
          <div style="font-size: 12px; font-weight: 600; color: #111827;">${vehicle?.fiscalPower ? vehicle.fiscalPower + " CV" : "-"}</div>
        </td>
        <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <div style="width: 28px; height: 28px; background: #eff6ff; border-radius: 6px; display: flex; align-items: center; justify-content: center;">${calendarIcon}</div>
            <span style="margin-left: 8px; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase;">PÉRIODE</span>
          </div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">Mois</div>
          <div style="font-size: 12px; font-weight: 600; color: #111827;">${currentMonth} ${currentYear}</div>
          <div style="font-size: 11px; color: #9ca3af; margin-top: 6px; margin-bottom: 2px;">Trajets</div>
          <div style="font-size: 12px; font-weight: 600; color: #111827;">${trips.length}</div>
        </td>
      </tr>
    </table>
    
    <!-- Summary Cards -->
    <table style="width: 100%; margin-bottom: 20px; border-spacing: 10px 0; border-collapse: separate;">
      <tr>
        <td style="width: 33.33%; text-align: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <div style="font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Distance totale</div>
          <div style="font-size: 24px; font-weight: 700; color: #111;">${totalKm.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} km</div>
        </td>
        <td style="width: 33.33%; text-align: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <div style="font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Nombre de trajets</div>
          <div style="font-size: 24px; font-weight: 700; color: #111;">${trips.length}</div>
        </td>
        <td style="width: 33.33%; text-align: center; background: #2563eb; border-radius: 8px; padding: 16px;">
          <div style="font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.85); text-transform: uppercase; margin-bottom: 4px;">Indemnités à déclarer</div>
          <div style="font-size: 24px; font-weight: 700; color: #ffffff;">${recalculatedTotalIK.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
        </td>
      </tr>
    </table>
    
    <!-- Trips Table -->
    <div style="font-size: 13px; font-weight: 600; color: #111; margin-bottom: 10px;">
      <span style="display: inline-block; width: 3px; height: 14px; background: #2563eb; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>
      Détail des trajets
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <thead>
        <tr style="background: #0f172a;">
          <th style="padding: 10px 6px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase;">Date</th>
          <th style="padding: 10px 6px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase;">Départ</th>
          <th style="padding: 10px 6px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase;">Arrivée</th>
          <th style="padding: 10px 6px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase;">Motif</th>
          <th style="padding: 10px 6px; text-align: right; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase;">Km</th>
          <th style="padding: 10px 6px; text-align: right; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase;">Cumul</th>
          <th style="padding: 10px 6px; text-align: right; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase;">IK</th>
        </tr>
      </thead>
      <tbody>
        ${tripRows}
      </tbody>
    </table>
    
    <!-- Barème Section -->
    <div style="font-size: 13px; font-weight: 600; color: #111; margin-bottom: 10px;">
      <span style="display: inline-block; width: 3px; height: 14px; background: #2563eb; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>
      Barème kilométrique 2024
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <thead>
        <tr style="background: #0f172a;">
          <th style="padding: 10px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase;">CV</th>
          <th style="padding: 10px; text-align: center; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase;">Jusqu'à 5000 km</th>
          <th style="padding: 10px; text-align: center; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase;">5001 à 20000 km</th>
          <th style="padding: 10px; text-align: center; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase;">Au-delà de 20000 km</th>
        </tr>
      </thead>
      <tbody>
        ${baremeRows}
      </tbody>
    </table>
    
    <!-- Footer -->
    <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <div style="font-size: 10px; color: #9ca3af;">Généré par IKtracker • iktracker.fr</div>
    </div>
  </div>
</body>
</html>`;
}

