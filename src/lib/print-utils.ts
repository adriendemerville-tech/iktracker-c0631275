// HTML/CSS based print utility - replaces heavy PDF libraries
// Uses native browser print dialog with @media print for PDF generation

import { Trip, Vehicle, IK_BAREME_2024, calculateTotalAnnualIK, getIKBareme } from '@/types/trip';

interface UserInfo {
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface PrintReportOptions {
  trips: Trip[];
  vehicles: Vehicle[];
  totalKm: number;
  logoUrl?: string;
  userInfo?: UserInfo;
}

interface RecalculatedTrip extends Trip {
  recalculatedIK: number;
  cumulativeKm: number;
  appliedRate: number;
}

function recalculateTrips(trips: Trip[], vehicles: Vehicle[]): RecalculatedTrip[] {
  const getVehicle = (id: string) => vehicles.find(v => v.id === id);
  const grouped = new Map<string, Trip[]>();
  
  trips.forEach(trip => {
    const year = new Date(trip.startTime).getFullYear();
    const key = `${trip.vehicleId}-${year}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(trip);
  });

  const result: RecalculatedTrip[] = [];

  grouped.forEach((vehicleTrips, key) => {
    const vehicleId = key.split('-')[0];
    const vehicle = getVehicle(vehicleId);
    const sorted = [...vehicleTrips].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    let cumulativeKm = 0;

    sorted.forEach(trip => {
      const prevCumulativeKm = cumulativeKm;
      cumulativeKm += trip.distance;

      if (!vehicle) {
        result.push({ ...trip, recalculatedIK: trip.ikAmount, cumulativeKm, appliedRate: 0 });
        return;
      }

      const ikBefore = calculateTotalAnnualIK(prevCumulativeKm, vehicle.fiscalPower);
      const ikAfter = calculateTotalAnnualIK(cumulativeKm, vehicle.fiscalPower);
      const recalculatedIK = ikAfter - ikBefore;

      const bareme = getIKBareme(vehicle.fiscalPower);
      let appliedRate = bareme.upTo5000.rate;
      if (cumulativeKm > 20000) appliedRate = bareme.over20000.rate;
      else if (cumulativeKm > 5000) appliedRate = bareme.from5001To20000.rate;

      result.push({ ...trip, recalculatedIK, cumulativeKm, appliedRate });
    });
  });

  return result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function formatAddress(str: string, max: number): string {
  const parts = str.split(',').map(p => p.trim());
  let result = parts[0];
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const postalMatch = part.match(/(\d{5})\s+(.+)/);
    if (postalMatch) {
      result += `, ${postalMatch[1]} ${postalMatch[2]}`;
      break;
    }
    if (part.match(/^\d{5}/) || (part.length > 2 && !part.match(/france/i))) {
      result += `, ${part}`;
      break;
    }
  }
  
  return result.length > max ? result.substring(0, max - 1) + '…' : result;
}

function generateReportHTML(options: PrintReportOptions): string {
  const { trips, vehicles, totalKm, logoUrl, userInfo } = options;
  
  const now = new Date();
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();
  
  // Format edition date
  const editionDate = now.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  
  // Build user info string
  const userName = userInfo?.firstName || userInfo?.lastName
    ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim()
    : null;
  const userEmail = userInfo?.email || null;
  
  const recalculatedTrips = recalculateTrips(trips, vehicles);
  const recalculatedTotalIK = recalculatedTrips.reduce((sum, t) => sum + t.recalculatedIK, 0);
  
  const vehicle = vehicles.length > 0 ? vehicles[0] : null;
  const vehicleName = vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || `Véhicule ${vehicle.fiscalPower} CV` : '';
  const vehicleDetails = vehicle ? `${vehicle.fiscalPower} CV${vehicle.licensePlate ? ' • ' + vehicle.licensePlate : ''}` : '';

  const tripRows = recalculatedTrips.map((t, i) => {
    const tripDate = new Date(t.startTime);
    const day = tripDate.getDate().toString().padStart(2, '0');
    const month = (tripDate.getMonth() + 1).toString().padStart(2, '0');
    const startAddr = formatAddress(t.startLocation.name, 50);
    const endAddr = formatAddress(t.endLocation.name, 50);
    const motif = t.purpose || '-';
    const isAlt = i % 2 === 1;
    
    return `
      <tr class="${isAlt ? 'alt-row' : ''}">
        <td class="date-col">${day}/${month}</td>
        <td class="addr-col">${startAddr}</td>
        <td class="addr-col">${endAddr}</td>
        <td class="motif-col">${motif.length > 30 ? motif.substring(0, 29) + '…' : motif}</td>
        <td class="num-col">${Math.round(t.distance)} km</td>
        <td class="num-col ik-col">${t.recalculatedIK.toFixed(2)} €</td>
      </tr>
    `;
  }).join('');

  const baremeRows = IK_BAREME_2024.map((b, i) => {
    const isAlt = i % 2 === 1;
    return `
      <tr class="${isAlt ? 'alt-row' : ''}">
        <td class="cv-col">${b.cv === '7+' ? '7 CV et plus' : b.cv + ' CV'}</td>
        <td class="bareme-col">d × ${b.upTo5000.rate} €</td>
        <td class="bareme-col">(d × ${b.from5001To20000.rate}) + ${b.from5001To20000.fixed} €</td>
        <td class="bareme-col">d × ${b.over20000.rate} €</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Relevé IK - ${currentMonth} ${currentYear}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 8pt;
      color: #1e293b;
      background: white;
      line-height: 1.3;
      padding: 12mm;
      margin: 0;
      max-width: 100%;
    }
    
    .page {
      width: 100%;
      page-break-after: always;
      padding: 0;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    /* Header band */
    .header-band {
      background: #0f172a;
      height: 5mm;
      width: 100%;
      margin-bottom: 4mm;
    }
    
    /* Header section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4mm;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 3mm;
    }
    
    .logo {
      width: 10mm;
      height: 10mm;
      object-fit: contain;
    }
    
    .title {
      font-size: 14pt;
      font-weight: 700;
      color: #1e293b;
    }
    
    .subtitle {
      font-size: 9pt;
      color: #64748b;
      margin-top: 1mm;
    }
    
    .stats-container {
      display: flex;
      gap: 3mm;
    }
    
    .stat-card {
      background: #f8fafc;
      border-radius: 2mm;
      padding: 2mm 4mm;
      min-width: 35mm;
    }
    
    .stat-label {
      font-size: 7pt;
      color: #64748b;
      margin-bottom: 1mm;
    }
    
    .stat-value {
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
    }
    
    .stat-value.primary {
      color: #2661d9;
    }
    
    /* Vehicle info */
    .vehicle-info {
      background: white;
      border: 0.3mm solid #e2e8f0;
      border-radius: 2mm;
      padding: 2mm 4mm;
      margin-bottom: 4mm;
      display: flex;
      gap: 8mm;
    }
    
    .vehicle-name {
      font-weight: 700;
      font-size: 9pt;
    }
    
    .vehicle-details {
      color: #64748b;
      font-size: 8pt;
    }
    
    /* User info section */
    .user-info-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4mm;
      padding: 2mm 0;
      border-bottom: 0.2mm solid #e2e8f0;
    }
    
    .user-info-left {
      display: flex;
      flex-direction: column;
      gap: 1mm;
    }
    
    .user-info-name {
      font-size: 9pt;
      font-weight: 600;
      color: #1e293b;
    }
    
    .user-info-email {
      font-size: 8pt;
      color: #64748b;
    }
    
    .user-info-right {
      text-align: right;
    }
    
    .edition-date {
      font-size: 7pt;
      color: #94a3b8;
    }
    
    /* Table styles */
    table {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      font-size: 7pt;
      table-layout: fixed;
    }
    
    thead th {
      background: #2661d9;
      color: white;
      font-weight: 700;
      font-size: 6pt;
      text-transform: uppercase;
      padding: 1.5mm 1.5mm;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    thead th.num-col {
      text-align: right;
    }
    
    tbody td {
      padding: 1.5mm 1.5mm;
      border-bottom: 0.1mm solid #e2e8f0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .alt-row {
      background: #f8fafc;
    }
    
    .date-col {
      width: 12mm;
      text-align: center;
    }
    
    .addr-col {
      width: auto;
      max-width: 80mm;
    }
    
    .motif-col {
      width: 35mm;
      max-width: 35mm;
    }
    
    .num-col {
      width: 15mm;
      text-align: right;
    }
    
    .ik-col {
      font-weight: 700;
      color: #2661d9;
    }
    
    /* Barème table */
    .cv-col {
      font-weight: 700;
      width: 22mm;
    }
    
    .bareme-col {
      text-align: center;
      width: auto;
    }
    
    /* Total section */
    .total-section {
      margin-top: 4mm;
      padding-top: 3mm;
      border-top: 0.3mm solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .total-label {
      font-size: 10pt;
      color: #1e293b;
    }
    
    .total-value {
      font-size: 14pt;
      font-weight: 700;
      color: #2661d9;
    }
    
    /* Page 2 - Barème */
    .bareme-title {
      font-size: 12pt;
      font-weight: 700;
      margin-bottom: 3mm;
    }
    
    .bareme-explanation {
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 4mm;
      max-width: 200mm;
    }
    
    .legend {
      font-size: 7pt;
      color: #64748b;
      font-style: italic;
      margin-top: 3mm;
    }
    
    .electric-bonus {
      background: #eff6ff;
      border-radius: 2mm;
      padding: 3mm 4mm;
      margin-top: 4mm;
      max-width: 180mm;
    }
    
    .electric-bonus-title {
      font-size: 8pt;
      font-weight: 700;
      color: #2661d9;
      margin-bottom: 1mm;
    }
    
    .electric-bonus-text {
      font-size: 7pt;
      color: #64748b;
    }
    
    .source {
      font-size: 6pt;
      color: #94a3b8;
      margin-top: 4mm;
    }
    
    /* Footer */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 12mm;
    }
    
    .footer-tagline {
      font-size: 7pt;
      color: #64748b;
      margin-bottom: 2mm;
    }
    
    .footer-line {
      border-top: 0.2mm solid #e2e8f0;
      padding-top: 2mm;
      display: flex;
      justify-content: space-between;
    }
    
    .footer-text {
      font-size: 6pt;
      color: #94a3b8;
    }
    
    .back-button {
      position: fixed;
      top: 12mm;
      left: 12mm;
      background: #0f172a;
      color: white;
      border: none;
      border-radius: 2mm;
      padding: 2mm 4mm;
      font-size: 9pt;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 2mm;
      z-index: 1000;
      text-decoration: none;
      transition: background 0.2s;
    }
    
    .back-button:hover {
      background: #1e293b;
    }
    
    .back-button svg {
      width: 14px;
      height: 14px;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .no-print {
        display: none;
      }
      
      .back-button {
        display: none;
      }
    }
  </style>
</head>
<body>
  <a href="/" class="back-button">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m12 19-7-7 7-7"/>
      <path d="M19 12H5"/>
    </svg>
    Retour
  </a>
  
  <!-- Page 1: Trips -->
  <div class="page">
    <div class="header-band"></div>
    
    <!-- User info & edition date -->
    <div class="user-info-section">
      <div class="user-info-left">
        ${userName ? `<div class="user-info-name">${userName}</div>` : ''}
        ${userEmail ? `<div class="user-info-email">${userEmail}</div>` : ''}
      </div>
      <div class="user-info-right">
        <div class="edition-date">Édité le ${editionDate}</div>
      </div>
    </div>
    
    <div class="header">
      <div class="header-left">
        ${logoUrl ? `<img src="${logoUrl}" alt="IKtracker" class="logo">` : ''}
        <div>
          <div class="title">Relevé IK</div>
          <div class="subtitle">${currentMonth} ${currentYear}</div>
        </div>
      </div>
      
      <div class="stats-container">
        <div class="stat-card">
          <div class="stat-label">Distance totale</div>
          <div class="stat-value">${totalKm.toLocaleString('fr-FR')} km</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Indemnités</div>
          <div class="stat-value primary">${recalculatedTotalIK.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
        </div>
      </div>
    </div>
    
    ${vehicle ? `
    <div class="vehicle-info">
      <span class="vehicle-name">${vehicleName}</span>
      <span class="vehicle-details">${vehicleDetails}</span>
    </div>
    ` : ''}
    
    <table>
      <thead>
        <tr>
          <th class="date-col">Date</th>
          <th class="addr-col">Départ</th>
          <th class="addr-col">Arrivée</th>
          <th class="motif-col">Motif</th>
          <th class="num-col">Distance</th>
          <th class="num-col">IK</th>
        </tr>
      </thead>
      <tbody>
        ${tripRows}
      </tbody>
    </table>
    
    <div class="total-section">
      <span class="total-label">Total à déclarer</span>
      <span class="total-value">${recalculatedTotalIK.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
    </div>
  </div>
  
  <!-- Page 2: Barème -->
  <div class="page">
    <div class="header-band"></div>
    
    <div class="header-left" style="margin-bottom: 4mm;">
      ${logoUrl ? `<img src="${logoUrl}" alt="IKtracker" class="logo" style="display: inline-block; vertical-align: middle; margin-right: 3mm;">` : ''}
      <span class="bareme-title" style="display: inline-block; vertical-align: middle;">Barème kilométrique fiscal 2026</span>
    </div>
    
    <p class="bareme-explanation">
      Le barème kilométrique permet de calculer les frais de déplacement professionnels déductibles. 
      Le montant varie selon la puissance fiscale du véhicule et le nombre de kilomètres parcourus sur l'année.
    </p>
    
    <table>
      <thead>
        <tr>
          <th class="cv-col">Puissance fiscale</th>
          <th class="bareme-col">Jusqu'à 5 000 km</th>
          <th class="bareme-col">De 5 001 à 20 000 km</th>
          <th class="bareme-col">Au-delà de 20 000 km</th>
        </tr>
      </thead>
      <tbody>
        ${baremeRows}
      </tbody>
    </table>
    
    <p class="legend">d = distance parcourue en kilomètres</p>
    
    <div class="electric-bonus">
      <div class="electric-bonus-title">⚡ Bonus véhicule électrique</div>
      <div class="electric-bonus-text">
        Les véhicules 100% électriques bénéficient d'une majoration de 20% sur le montant des indemnités kilométriques.
      </div>
    </div>
    
    <p class="source">
      Source : Arrêté du 27 mars 2024 fixant le barème forfaitaire permettant l'évaluation des frais de déplacement relatifs à l'utilisation d'un véhicule.
    </p>
  </div>
  
  <div class="footer">
    <div class="footer-tagline">Simplifiez votre suivi kilométrique avec IKtracker</div>
    <div class="footer-line">
      <span class="footer-text">Généré par IKtracker • iktracker.fr • Conforme au barème fiscal 2026</span>
    </div>
  </div>
</body>
</html>
`;
}

export function printReport(options: PrintReportOptions): void {
  const html = generateReportHTML(options);
  
  // Create invisible iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error('Cannot access iframe document');
    document.body.removeChild(iframe);
    return;
  }
  
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();
  
  // Wait for content to load, then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Remove iframe after print dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };
  
  // Fallback trigger if onload doesn't fire
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  }, 1000);
}

// For ZIP export, we need to generate a simple HTML file that can be opened in browser
export function generatePrintableHTML(options: PrintReportOptions): string {
  return generateReportHTML(options);
}
