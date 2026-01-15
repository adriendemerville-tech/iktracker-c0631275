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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Urbanist:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 8pt;
      color: #1e293b;
      background: white;
      line-height: 1.4;
      padding: 10mm;
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
    
    /* Title styling */
    .main-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 18pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4mm;
    }
    
    /* User info header */
    .user-header {
      margin-bottom: 5mm;
    }
    
    .user-name {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11pt;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 1mm;
    }
    
    .user-email {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 9pt;
      color: #64748b;
    }
    
    .edition-date {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 8pt;
      color: #94a3b8;
      margin-bottom: 5mm;
    }
    
    /* Section title */
    .section-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 12pt;
      font-weight: 700;
      color: #1e293b;
      margin: 6mm 0 4mm 0;
    }
    
    /* Stats badges */
    .stats-row {
      display: flex;
      gap: 4mm;
      margin-bottom: 5mm;
    }
    
    .stat-badge {
      background: #f1f5f9;
      border-radius: 3mm;
      padding: 3mm 5mm;
      display: inline-flex;
      flex-direction: column;
      gap: 1mm;
    }
    
    .stat-label {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 7pt;
      color: #64748b;
      font-weight: 500;
    }
    
    .stat-value {
      font-family: 'Urbanist', sans-serif;
      font-size: 14pt;
      font-weight: 700;
      color: #1e293b;
    }
    
    .stat-value.primary {
      color: #2661D9;
    }
    
    /* Vehicle header */
    .vehicle-header {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 10pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 3mm;
      padding: 2mm 0;
      border-bottom: 0.3mm solid #e2e8f0;
    }
    
    .vehicle-cv {
      font-weight: 400;
      color: #64748b;
      margin-left: 2mm;
    }
    
    /* Table styles */
    table {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      table-layout: fixed;
      border: 0.2mm solid #e2e8f0;
      border-radius: 2mm;
      overflow: hidden;
    }
    
    thead th {
      background: #2661D9;
      color: white;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 600;
      font-size: 6.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 2mm 2mm;
      text-align: left;
      border: none;
    }
    
    thead th.num-col {
      text-align: right;
    }
    
    tbody tr {
      background: white;
    }
    
    tbody tr.alt-row {
      background: #f8fafc;
    }
    
    tbody td {
      font-family: 'Plus Jakarta Sans', sans-serif;
      padding: 2mm 2mm;
      border-bottom: 0.15mm solid #e2e8f0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
    }
    
    tbody tr:last-child td {
      border-bottom: none;
    }
    
    .date-col {
      width: 14mm;
      text-align: center;
      font-family: 'Urbanist', sans-serif;
      font-weight: 500;
    }
    
    .addr-col {
      width: auto;
      max-width: 75mm;
      font-size: 7pt;
    }
    
    .motif-col {
      width: 40mm;
      max-width: 40mm;
      font-size: 7pt;
      color: #475569;
    }
    
    .num-col {
      width: 16mm;
      text-align: right;
      font-family: 'Urbanist', sans-serif;
      font-weight: 600;
    }
    
    .ik-col {
      color: #2661D9;
      font-weight: 700;
    }
    
    /* Total section */
    .total-section {
      margin-top: 5mm;
      padding: 4mm 5mm;
      background: #f8fafc;
      border-radius: 3mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 0.3mm solid #e2e8f0;
    }
    
    .total-label {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
    }
    
    .total-value {
      font-family: 'Urbanist', sans-serif;
      font-size: 16pt;
      font-weight: 700;
      color: #2661D9;
    }
    
    /* Barème table */
    .cv-col {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 600;
      width: 28mm;
    }
    
    .bareme-col {
      font-family: 'Urbanist', sans-serif;
      text-align: center;
      width: auto;
    }
    
    /* Barème explanation */
    .bareme-explanation {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 5mm;
      max-width: 220mm;
      line-height: 1.5;
    }
    
    .legend {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 7pt;
      color: #64748b;
      font-style: italic;
      margin-top: 3mm;
    }
    
    /* Electric bonus */
    .electric-bonus {
      background: #eff6ff;
      border: 0.2mm solid #bfdbfe;
      border-radius: 3mm;
      padding: 4mm 5mm;
      margin-top: 5mm;
      max-width: 200mm;
    }
    
    .electric-bonus-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 9pt;
      font-weight: 700;
      color: #2661D9;
      margin-bottom: 2mm;
    }
    
    .electric-bonus-text {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 8pt;
      color: #475569;
      line-height: 1.4;
    }
    
    .source {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 6pt;
      color: #94a3b8;
      margin-top: 5mm;
      line-height: 1.4;
    }
    
    /* Footer */
    .footer {
      margin-top: 8mm;
      padding-top: 4mm;
      border-top: 0.2mm solid #e2e8f0;
    }
    
    .footer-tagline {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 8pt;
      color: #64748b;
      font-style: italic;
      margin-bottom: 2mm;
    }
    
    .footer-text {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 7pt;
      color: #94a3b8;
    }
    
    .back-button {
      position: fixed;
      top: 10mm;
      left: 10mm;
      background: #1e293b;
      color: white;
      border: none;
      border-radius: 2mm;
      padding: 2mm 4mm;
      font-family: 'Plus Jakarta Sans', sans-serif;
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
      background: #334155;
    }
    
    .back-button svg {
      width: 14px;
      height: 14px;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        padding: 0;
      }
      
      .no-print, .back-button {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <a href="/" class="back-button no-print">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m12 19-7-7 7-7"/>
      <path d="M19 12H5"/>
    </svg>
    Retour
  </a>
  
  <!-- Page 1: Trips -->
  <div class="page">
    <!-- Main title -->
    <h1 class="main-title">Relevé IK - ${currentMonth} ${currentYear}</h1>
    
    <!-- User info -->
    <div class="user-header">
      ${userName ? `<div class="user-name">${userName}</div>` : ''}
      ${userEmail ? `<div class="user-email">${userEmail}</div>` : ''}
    </div>
    
    <!-- Edition date -->
    <div class="edition-date">Édité le ${editionDate}</div>
    
    <!-- Stats badges -->
    <h2 class="section-title">Relevé IK</h2>
    <div class="stats-row">
      <div class="stat-badge">
        <span class="stat-label">Distance totale</span>
        <span class="stat-value">${totalKm.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km</span>
      </div>
      <div class="stat-badge">
        <span class="stat-label">Indemnités</span>
        <span class="stat-value primary">${recalculatedTotalIK.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
      </div>
    </div>
    
    <!-- Vehicle header -->
    ${vehicle ? `
    <div class="vehicle-header">
      ${vehicleName.toUpperCase()}<span class="vehicle-cv">${vehicleDetails}</span>
    </div>
    ` : ''}
    
    <!-- Trips table -->
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
    
    <!-- Total section -->
    <div class="total-section">
      <span class="total-label">Total à déclarer</span>
      <span class="total-value">${recalculatedTotalIK.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-tagline">Simplifiez votre suivi kilométrique avec IKtracker</div>
      <div class="footer-text">Généré par IKtracker • iktracker.fr • Conforme au barème fiscal 2026</div>
    </div>
  </div>
  
  <!-- Page 2: Barème -->
  <div class="page">
    <h1 class="main-title">Barème kilométrique fiscal 2026</h1>
    
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
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-tagline">Simplifiez votre suivi kilométrique avec IKtracker</div>
      <div class="footer-text">Généré par IKtracker • iktracker.fr • Conforme au barème fiscal 2026</div>
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

// Export directly to PDF file download
export async function exportToPDF(options: PrintReportOptions): Promise<void> {
  const html = generateReportHTML(options);
  
  // Dynamically import htmlToPdfBlob from pdf-utils
  const { htmlToPdfBlob } = await import('@/lib/pdf-utils');
  
  const pdfBlob = await htmlToPdfBlob(html);
  
  // Trigger download
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `releve-ik-${dateStr}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
