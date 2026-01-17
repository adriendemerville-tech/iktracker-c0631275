// HTML/CSS based print utility - replaces heavy PDF libraries
// Uses native browser print dialog with @media print for PDF generation

import { Trip, Vehicle, IK_BAREME_2024, calculateTotalAnnualIK, getIKBareme } from '@/types/trip';

interface UserInfo {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
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

// SVG Icons with explicit inline dimensions to prevent rendering bugs
const ICONS = {
  back: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="m12 19-7-7 7-7"/></svg>`,
  print: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>`,
  user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  car: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
  calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  bolt: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
};

function generateReportHTML(options: PrintReportOptions): string {
  const { trips, vehicles, totalKm, userInfo } = options;
  
  const now = new Date();
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();
  
  const editionDate = now.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  
  const userName = userInfo?.firstName || userInfo?.lastName
    ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim()
    : null;
  const userEmail = userInfo?.email || null;
  
  const vehicle = vehicles.length > 0 ? vehicles[0] : null;
  const ownerName = vehicle?.ownerFirstName || vehicle?.ownerLastName
    ? `${vehicle.ownerFirstName || ''} ${vehicle.ownerLastName || ''}`.trim()
    : userName;
  const vehicleName = vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || `Véhicule ${vehicle.fiscalPower} CV` : '';
  const vehicleDetails = vehicle ? `${vehicle.fiscalPower} CV${vehicle.licensePlate ? ' • ' + vehicle.licensePlate : ''}${vehicle.isElectric ? ' • Électrique (+20%)' : ''}` : '';
  
  const recalculatedTrips = recalculateTrips(trips, vehicles);
  const recalculatedTotalIK = recalculatedTrips.reduce((sum, t) => sum + t.recalculatedIK, 0);

  // Generate trip rows WITHOUT the "Taux" column
  const tripRows = recalculatedTrips.map((t, i) => {
    const tripDate = new Date(t.startTime);
    const day = tripDate.getDate().toString().padStart(2, '0');
    const month = (tripDate.getMonth() + 1).toString().padStart(2, '0');
    const year = tripDate.getFullYear().toString().slice(-2);
    const startAddr = formatAddress(t.startLocation.name, 40);
    const endAddr = formatAddress(t.endLocation.name, 40);
    const motif = t.purpose || '-';
    const isAlt = i % 2 === 1;
    
    return `
      <tr class="${isAlt ? 'alt-row' : ''}">
        <td class="date-col">${day}/${month}/${year}</td>
        <td class="addr-col">${startAddr}</td>
        <td class="addr-col">${endAddr}</td>
        <td class="motif-col">${motif.length > 25 ? motif.substring(0, 24) + '…' : motif}</td>
        <td class="num-col">${Math.round(t.distance)}</td>
        <td class="num-col cumul-col">${Math.round(t.cumulativeKm)}</td>
        <td class="num-col ik-col">${t.recalculatedIK.toFixed(2)} €</td>
      </tr>
    `;
  }).join('');

  const baremeRows = IK_BAREME_2024.map((b, i) => {
    const isAlt = i % 2 === 1;
    return `
      <tr class="${isAlt ? 'alt-row' : ''}">
        <td class="cv-col">${b.cv === '7+' ? '7 CV et +' : b.cv + ' CV'}</td>
        <td class="bareme-col">d × ${b.upTo5000.rate}</td>
        <td class="bareme-col">(d × ${b.from5001To20000.rate}) + ${b.from5001To20000.fixed}</td>
        <td class="bareme-col">d × ${b.over20000.rate}</td>
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 9pt;
      color: #1a1a1a;
      background: #fff;
      line-height: 1.4;
      padding: 10mm;
    }
    
    .page {
      width: 100%;
      page-break-after: always;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 5mm;
      padding-bottom: 4mm;
      border-bottom: 2px solid #2563eb;
    }
    
    .brand {
      display: flex;
      align-items: center;
      gap: 3mm;
    }
    
    .brand-logo {
      width: 12mm;
      height: 12mm;
      object-fit: contain;
    }
    
    .brand-text {
      font-size: 16pt;
      font-weight: 700;
      color: #2563eb;
      letter-spacing: -0.5px;
    }
    
    .brand-tagline {
      font-size: 7pt;
      color: #6b7280;
      margin-top: 1mm;
    }
    
    .doc-info {
      text-align: right;
    }
    
    .doc-title {
      font-size: 13pt;
      font-weight: 700;
      color: #111;
    }
    
    .doc-date {
      font-size: 8pt;
      color: #6b7280;
      margin-top: 1mm;
    }
    
    /* Identity Cards - Stripe-like clean design */
    .identity-section {
      display: flex;
      gap: 4mm;
      margin-bottom: 4mm;
    }
    
    .identity-card {
      flex: 1;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 2mm;
      padding: 4mm 5mm;
    }
    
    .identity-card-header {
      display: flex;
      align-items: center;
      gap: 2mm;
      margin-bottom: 2mm;
    }
    
    .identity-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 6mm;
      height: 6mm;
      background: #eff6ff;
      color: #2563eb;
      border-radius: 1mm;
    }
    
    .identity-icon svg {
      width: 14px;
      height: 14px;
    }
    
    .identity-card-title {
      font-size: 6pt;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .identity-content {
      display: flex;
      flex-direction: column;
      gap: 1mm;
    }
    
    .identity-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .identity-label {
      font-size: 7pt;
      color: #9ca3af;
    }
    
    .identity-value {
      font-size: 8pt;
      font-weight: 600;
      color: #111827;
    }
    
    /* Summary Cards */
    .summary-section {
      display: flex;
      gap: 4mm;
      margin-bottom: 5mm;
    }
    
    .summary-card {
      flex: 1;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 2mm;
      padding: 4mm;
      text-align: center;
    }
    
    .summary-card.primary {
      background: #2563eb;
      border: none;
      color: white;
    }
    
    .summary-card.primary .summary-label {
      color: rgba(255,255,255,0.85);
    }
    
    .summary-card.primary .summary-value {
      color: white;
    }
    
    .summary-label {
      font-size: 6pt;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 1mm;
    }
    
    .summary-value {
      font-size: 18pt;
      font-weight: 700;
      color: #111;
      line-height: 1;
    }
    
    /* Section Title */
    .section-title {
      font-size: 10pt;
      font-weight: 600;
      color: #111;
      margin-bottom: 2mm;
      display: flex;
      align-items: center;
      gap: 2mm;
    }
    
    .section-title::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 12px;
      background: #2563eb;
      border-radius: 2px;
    }
    
    /* Table - Clean and spacious */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      table-layout: fixed;
      margin-bottom: 3mm;
    }
    
    thead th {
      background: #111827;
      color: white;
      font-weight: 600;
      font-size: 6pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 3mm 2mm;
      text-align: left;
    }
    
    thead th.num-col {
      text-align: right;
    }
    
    tbody tr {
      background: white;
    }
    
    tbody tr.alt-row {
      background: #fafafa;
    }
    
    tbody td {
      padding: 2.5mm 2mm;
      border-bottom: 1px solid #f1f5f9;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
    }
    
    .date-col {
      width: 16mm;
      font-weight: 500;
    }
    
    .addr-col {
      width: auto;
      font-size: 7pt;
    }
    
    .motif-col {
      width: 32mm;
      font-size: 7pt;
      color: #6b7280;
    }
    
    .num-col {
      width: 14mm;
      text-align: right;
      font-weight: 500;
    }
    
    .cumul-col {
      color: #6b7280;
      font-weight: 400;
    }
    
    .ik-col {
      color: #2563eb;
      font-weight: 700;
      width: 18mm;
    }
    
    /* Total Row */
    .total-row {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 2mm;
      margin-top: 2mm;
      padding: 3mm 4mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .total-label {
      font-size: 9pt;
      font-weight: 600;
      color: #111;
    }
    
    .total-values {
      display: flex;
      gap: 5mm;
      align-items: center;
    }
    
    .total-km {
      font-size: 11pt;
      font-weight: 600;
      color: #111;
    }
    
    .total-ik {
      font-size: 12pt;
      font-weight: 700;
      color: white;
      padding: 2mm 3mm;
      background: #2563eb;
      border-radius: 1.5mm;
    }
    
    /* Barème */
    .bareme-section {
      margin-top: 5mm;
    }
    
    .cv-col {
      width: 25mm;
      font-weight: 600;
    }
    
    .bareme-col {
      text-align: center;
      font-weight: 500;
    }
    
    .bareme-note {
      font-size: 7pt;
      color: #6b7280;
      font-style: italic;
      margin-top: 2mm;
    }
    
    /* Electric Bonus */
    .electric-bonus {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 2mm;
      padding: 3mm 4mm;
      margin-top: 4mm;
      display: flex;
      align-items: center;
      gap: 3mm;
    }
    
    .electric-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #059669;
    }
    
    .electric-icon svg {
      width: 18px;
      height: 18px;
    }
    
    .electric-text {
      font-size: 8pt;
      color: #065f46;
    }
    
    .electric-text strong {
      font-weight: 600;
    }
    
    /* Footer */
    .footer {
      margin-top: 6mm;
      padding-top: 3mm;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .footer-left {
      font-size: 7pt;
      color: #6b7280;
    }
    
    .footer-right {
      font-size: 7pt;
      color: #6b7280;
    }
    
    .footer-url {
      color: #2563eb;
      font-weight: 500;
      text-decoration: none;
    }
    
    /* Legal */
    .legal-text {
      font-size: 6pt;
      color: #9ca3af;
      margin-top: 4mm;
      line-height: 1.4;
    }
    
    /* Top Actions */
    .top-actions {
      position: fixed;
      top: 4mm;
      left: 4mm;
      display: flex;
      gap: 2mm;
      z-index: 1000;
    }
    
    .action-button {
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 50%;
      width: 9mm;
      height: 9mm;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      opacity: 0.8;
      transition: opacity 0.2s, background 0.2s;
    }
    
    .action-button:hover {
      opacity: 1;
      background: #4b5563;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        padding: 0;
      }
      
      .no-print, .top-actions {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="top-actions no-print">
    <a href="/" class="action-button" title="Retour">
      ${ICONS.back}
    </a>
    <button onclick="window.print()" class="action-button" title="Imprimer (Ctrl+P)">
      ${ICONS.print}
    </button>
  </div>
  
  <!-- Page 1: Main Report -->
  <div class="page">
    <div class="header">
      <div class="brand">
        <img src="https://iktracker.fr/logo-iktracker-250.webp" alt="IKtracker" class="brand-logo" />
        <div>
          <div class="brand-text">IKtracker</div>
          <div class="brand-tagline">Suivi des indemnités kilométriques</div>
        </div>
      </div>
      <div class="doc-info">
        <div class="doc-title">Relevé des Frais Kilométriques</div>
        <div class="doc-date">Édité le ${editionDate}</div>
      </div>
    </div>
    
    <div class="identity-section">
      <div class="identity-card">
        <div class="identity-card-header">
          <div class="identity-icon">${ICONS.user}</div>
          <div class="identity-card-title">Titulaire</div>
        </div>
        <div class="identity-content">
          ${ownerName ? `<div class="identity-row"><span class="identity-label">Nom</span><span class="identity-value">${ownerName}</span></div>` : ''}
          ${userEmail ? `<div class="identity-row"><span class="identity-label">Email</span><span class="identity-value">${userEmail}</span></div>` : ''}
        </div>
      </div>
      <div class="identity-card">
        <div class="identity-card-header">
          <div class="identity-icon">${ICONS.car}</div>
          <div class="identity-card-title">Véhicule</div>
        </div>
        <div class="identity-content">
          ${vehicleName ? `<div class="identity-row"><span class="identity-label">Modèle</span><span class="identity-value">${vehicleName}</span></div>` : ''}
          ${vehicle?.fiscalPower ? `<div class="identity-row"><span class="identity-label">Puissance</span><span class="identity-value">${vehicle.fiscalPower} CV</span></div>` : ''}
          ${vehicle?.licensePlate ? `<div class="identity-row"><span class="identity-label">Immat.</span><span class="identity-value">${vehicle.licensePlate}</span></div>` : ''}
          ${vehicle?.isElectric ? `<div class="identity-row"><span class="identity-label">Type</span><span class="identity-value">⚡ Électrique (+20%)</span></div>` : ''}
        </div>
      </div>
      <div class="identity-card">
        <div class="identity-card-header">
          <div class="identity-icon">${ICONS.calendar}</div>
          <div class="identity-card-title">Période</div>
        </div>
        <div class="identity-content">
          <div class="identity-row"><span class="identity-label">Mois</span><span class="identity-value">${currentMonth} ${currentYear}</span></div>
          <div class="identity-row"><span class="identity-label">Trajets</span><span class="identity-value">${trips.length}</span></div>
        </div>
      </div>
    </div>
    
    <div class="summary-section">
      <div class="summary-card">
        <div class="summary-label">Distance totale</div>
        <div class="summary-value">${totalKm.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Nombre de trajets</div>
        <div class="summary-value">${trips.length}</div>
      </div>
      <div class="summary-card primary">
        <div class="summary-label">Indemnités à déclarer</div>
        <div class="summary-value">${recalculatedTotalIK.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
      </div>
    </div>
    
    <div class="section-title">Détail des trajets</div>
    <table>
      <thead>
        <tr>
          <th class="date-col">Date</th>
          <th class="addr-col">Départ</th>
          <th class="addr-col">Arrivée</th>
          <th class="motif-col">Motif</th>
          <th class="num-col">Km</th>
          <th class="num-col">Cumul</th>
          <th class="num-col">IK</th>
        </tr>
      </thead>
      <tbody>
        ${tripRows}
      </tbody>
    </table>
    
    <div class="total-row">
      <span class="total-label">Total à déclarer</span>
      <div class="total-values">
        <span class="total-km">${totalKm.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km</span>
        <span class="total-ik">${recalculatedTotalIK.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-left">Document généré automatiquement • Conforme au barème fiscal 2026</div>
      <div class="footer-right"><a href="https://iktracker.fr" class="footer-url">iktracker.fr</a></div>
    </div>
  </div>
  
  <!-- Page 2: Barème -->
  <div class="page">
    <div class="header">
      <div class="brand">
        <img src="https://iktracker.fr/logo-iktracker-250.webp" alt="IKtracker" class="brand-logo" />
        <div>
          <div class="brand-text">IKtracker</div>
          <div class="brand-tagline">Suivi des indemnités kilométriques</div>
        </div>
      </div>
      <div class="doc-info">
        <div class="doc-title">Barème Kilométrique 2026</div>
        <div class="doc-date">Annexe au relevé</div>
      </div>
    </div>
    
    <div class="bareme-section">
      <div class="section-title">Barème fiscal applicable</div>
      
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
      
      <p class="bareme-note">d = distance parcourue en kilomètres. Les montants sont en euros.</p>
      
      <div class="electric-bonus">
        <span class="electric-icon">${ICONS.bolt}</span>
        <div class="electric-text">
          <strong>Véhicules électriques :</strong> Les véhicules 100% électriques bénéficient d'une majoration de 20% sur le montant des indemnités kilométriques.
        </div>
      </div>
    </div>
    
    <div class="legal-text">
      Source : Arrêté du 27 mars 2024 fixant le barème forfaitaire permettant l'évaluation des frais de déplacement relatifs à l'utilisation d'un véhicule par les bénéficiaires de traitements et salaires optant pour le régime des frais réels déductibles.
      <br><br>
      Ce document est généré automatiquement par IKtracker et constitue un récapitulatif des trajets professionnels effectués. Il appartient au déclarant de vérifier l'exactitude des informations et de les conserver conformément aux obligations fiscales en vigueur.
    </div>
    
    <div class="footer">
      <div class="footer-left">Document généré automatiquement • Conforme au barème fiscal 2026</div>
      <div class="footer-right"><a href="https://iktracker.fr" class="footer-url">iktracker.fr</a></div>
    </div>
  </div>
</body>
</html>
`;
}

export function printReport(options: PrintReportOptions): void {
  const html = generateReportHTML(options);
  
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
  
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };
  
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

export function generatePrintableHTML(options: PrintReportOptions): string {
  return generateReportHTML(options);
}

export async function exportToPDF(options: PrintReportOptions): Promise<void> {
  const html = generateReportHTML(options);
  
  const { htmlToPdfBlob } = await import('@/lib/pdf-utils');
  
  const pdfBlob = await htmlToPdfBlob(html);
  
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
