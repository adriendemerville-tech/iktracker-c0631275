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
  
  // Build user display info - prioritize userInfo, fallback to vehicle owner
  const userDisplayName = userInfo?.firstName || userInfo?.lastName
    ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim()
    : null;
  const userEmail = userInfo?.email || null;
  
  const vehicle = vehicles.length > 0 ? vehicles[0] : null;
  
  // For titulaire: use userInfo first, fallback to vehicle owner
  const titulaireNom = userDisplayName || 
    (vehicle?.ownerFirstName || vehicle?.ownerLastName
      ? `${vehicle.ownerFirstName || ''} ${vehicle.ownerLastName || ''}`.trim()
      : null);
  
  const vehicleName = vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || `Véhicule ${vehicle.fiscalPower} CV` : '';
  const vehicleDetails = vehicle ? `${vehicle.fiscalPower} CV${vehicle.licensePlate ? ' • ' + vehicle.licensePlate : ''}${vehicle.isElectric ? ' • Électrique (+20%)' : ''}` : '';
  
  const recalculatedTrips = recalculateTrips(trips, vehicles);
  const recalculatedTotalIK = recalculatedTrips.reduce((sum, t) => sum + t.recalculatedIK, 0);

  // Generate trip rows - columns: Date, Départ, Arrivée, Motif, Km, Cumul, IK
  // Using fixed column widths to prevent misalignment across pages
  const tripRows = recalculatedTrips.map((t, i) => {
    const tripDate = new Date(t.startTime);
    const day = tripDate.getDate().toString().padStart(2, '0');
    const month = (tripDate.getMonth() + 1).toString().padStart(2, '0');
    const year = tripDate.getFullYear().toString().slice(-2);
    const startAddr = formatAddress(t.startLocation.name, 32);
    const endAddr = formatAddress(t.endLocation.name, 32);
    const motif = t.purpose || '-';
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    
    return `
      <tr style="background-color: ${bgColor}; page-break-inside: avoid;">
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-weight: 500; font-size: 11px; width: 70px; min-width: 70px;">${day}/${month}/${year}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; width: 170px; min-width: 170px; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${startAddr}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; width: 170px; min-width: 170px; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${endAddr}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; width: 140px; min-width: 140px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${motif.length > 22 ? motif.substring(0, 21) + '…' : motif}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; font-size: 11px; width: 50px; min-width: 50px;">${Math.round(t.distance)}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #9ca3af; font-size: 11px; width: 55px; min-width: 55px;">${Math.round(t.cumulativeKm)}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #2563eb; font-size: 11px; width: 70px; min-width: 70px;">${t.recalculatedIK.toFixed(2)} €</td>
      </tr>
    `;
  }).join('');

  const baremeRows = IK_BAREME_2024.map((b, i) => {
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    return `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 11px;">${b.cv === '7+' ? '7 CV et +' : b.cv + ' CV'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px;">d × ${b.upTo5000.rate}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px;">(d × ${b.from5001To20000.rate}) + ${b.from5001To20000.fixed}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px;">d × ${b.over20000.rate}</td>
      </tr>
    `;
  }).join('');

  // Using table-based layout for maximum PDF compatibility
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
      font-size: 12px;
      color: #1a1a1a;
      background: #fff;
      line-height: 1.4;
      padding: 0;
    }
    
    .page {
      width: 100%;
      padding: 20px;
      page-break-after: always;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    .no-print {
      position: fixed;
      top: 15px;
      left: 15px;
      z-index: 1000;
    }
    
    .action-btn {
      display: inline-block;
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      text-align: center;
      line-height: 36px;
      margin-right: 8px;
      text-decoration: none;
      font-size: 14px;
    }
    
    .action-btn:hover {
      background: #4b5563;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        padding: 0;
      }
      
      .no-print {
        display: none !important;
      }
      
      .page {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <a href="/" class="action-btn" title="Retour">←</a>
    <button onclick="window.print()" class="action-btn" title="Imprimer">🖨</button>
  </div>
  
  <!-- Page 1: Main Report -->
  <div class="page">
    <!-- Header -->
    <table style="width: 100%; margin-bottom: 20px; border-bottom: 3px solid #2563eb; padding-bottom: 15px;">
      <tr>
        <td style="vertical-align: middle;">
          <table>
            <tr>
              <td style="vertical-align: middle; padding-right: 12px;">
                <img src="https://iktracker.fr/logo-iktracker-250.webp" alt="IKtracker" style="width: 48px; height: 48px; object-fit: contain;" />
              </td>
              <td style="vertical-align: middle;">
                <div style="font-size: 22px; font-weight: 700; color: #2563eb; letter-spacing: -0.5px;">IKtracker</div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Suivi des indemnités kilométriques</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <div style="font-size: 18px; font-weight: 700; color: #111;">Relevé des Frais Kilométriques</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Édité le ${editionDate}</div>
        </td>
      </tr>
    </table>
    
    <!-- Identity Cards Row -->
    <table style="width: 100%; margin-bottom: 20px; border-spacing: 12px 0; border-collapse: separate;">
      <tr>
        <!-- Titulaire Card -->
        <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <table style="width: 100%;">
            <tr>
              <td style="padding-bottom: 12px;">
                <table>
                  <tr>
                    <td style="width: 28px; height: 28px; background: #eff6ff; border-radius: 6px; text-align: center; vertical-align: middle;">
                      <span style="color: #2563eb; font-size: 14px;">👤</span>
                    </td>
                    <td style="padding-left: 10px; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">TITULAIRE</td>
                  </tr>
                </table>
              </td>
            </tr>
            ${titulaireNom ? `<tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Nom</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${titulaireNom}</td></tr></table></td></tr>` : ''}
            ${userEmail ? `<tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Email</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${userEmail}</td></tr></table></td></tr>` : ''}
          </table>
        </td>
        
        <!-- Véhicule Card -->
        <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <table style="width: 100%;">
            <tr>
              <td style="padding-bottom: 12px;">
                <table>
                  <tr>
                    <td style="width: 28px; height: 28px; background: #eff6ff; border-radius: 6px; text-align: center; vertical-align: middle;">
                      <span style="color: #2563eb; font-size: 14px;">🚗</span>
                    </td>
                    <td style="padding-left: 10px; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">VÉHICULE</td>
                  </tr>
                </table>
              </td>
            </tr>
            ${vehicleName ? `<tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Modèle</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${vehicleName}</td></tr></table></td></tr>` : ''}
            ${vehicle?.fiscalPower ? `<tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Puissance</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${vehicle.fiscalPower} CV</td></tr></table></td></tr>` : ''}
            ${vehicle?.licensePlate ? `<tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Immatriculation</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${vehicle.licensePlate}</td></tr></table></td></tr>` : ''}
            ${vehicle?.isElectric ? `<tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Type</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #059669;">⚡ Électrique (+20%)</td></tr></table></td></tr>` : ''}
          </table>
        </td>
        
        <!-- Période Card -->
        <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <table style="width: 100%;">
            <tr>
              <td style="padding-bottom: 12px;">
                <table>
                  <tr>
                    <td style="width: 28px; height: 28px; background: #eff6ff; border-radius: 6px; text-align: center; vertical-align: middle;">
                      <span style="color: #2563eb; font-size: 14px;">📅</span>
                    </td>
                    <td style="padding-left: 10px; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">PÉRIODE</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Mois</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${currentMonth} ${currentYear}</td></tr></table></td></tr>
            <tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Trajets</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${trips.length}</td></tr></table></td></tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Summary Cards Row -->
    <table style="width: 100%; margin-bottom: 24px; border-spacing: 12px 0; border-collapse: separate;">
      <tr>
        <!-- Distance Card -->
        <td style="width: 33.33%; text-align: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px 16px;">
          <div style="font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Distance totale</div>
          <div style="font-size: 28px; font-weight: 700; color: #111; line-height: 1;">${totalKm.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km</div>
        </td>
        
        <!-- Trajets Card -->
        <td style="width: 33.33%; text-align: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px 16px;">
          <div style="font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Nombre de trajets</div>
          <div style="font-size: 28px; font-weight: 700; color: #111; line-height: 1;">${trips.length}</div>
        </td>
        
        <!-- IK Card (Primary Blue) -->
        <td style="width: 33.33%; text-align: center; background: #2563eb; border-radius: 12px; padding: 20px 16px;">
          <div style="font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Indemnités à déclarer</div>
          <div style="font-size: 28px; font-weight: 700; color: #ffffff; line-height: 1;">${recalculatedTotalIK.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
        </td>
      </tr>
    </table>
    
    <!-- Section Title -->
    <div style="font-size: 14px; font-weight: 600; color: #111; margin-bottom: 12px; display: flex; align-items: center;">
      <span style="display: inline-block; width: 4px; height: 16px; background: #2563eb; border-radius: 2px; margin-right: 10px;"></span>
      Détail des trajets
    </div>
    
    <!-- Trips Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; table-layout: fixed;">
      <thead>
        <tr style="background: #111827;">
          <th style="padding: 12px 8px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 70px;">Date</th>
          <th style="padding: 12px 8px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 170px;">Départ</th>
          <th style="padding: 12px 8px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 170px;">Arrivée</th>
          <th style="padding: 12px 8px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 140px;">Motif</th>
          <th style="padding: 12px 8px; text-align: right; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 50px;">Km</th>
          <th style="padding: 12px 8px; text-align: right; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 55px;">Cumul</th>
          <th style="padding: 12px 8px; text-align: right; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 70px;">IK</th>
        </tr>
      </thead>
      <tbody>
        ${tripRows}
      </tbody>
    </table>
    
    <!-- Total Row -->
    <table style="width: 100%; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 14px 20px; font-size: 13px; font-weight: 600; color: #111;">Total à déclarer</td>
        <td style="padding: 14px 20px; text-align: right;">
          <span style="font-size: 14px; font-weight: 600; color: #111; margin-right: 20px;">${totalKm.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km</span>
          <span style="font-size: 16px; font-weight: 700; color: #ffffff; background: #2563eb; padding: 6px 14px; border-radius: 6px;">${recalculatedTotalIK.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
        </td>
      </tr>
    </table>
    
    <!-- Footer -->
    <table style="width: 100%; border-top: 1px solid #e5e7eb; padding-top: 12px;">
      <tr>
        <td style="font-size: 11px; color: #6b7280;">Document généré automatiquement • Conforme au barème fiscal 2026</td>
        <td style="text-align: right; font-size: 11px;"><a href="https://iktracker.fr" style="color: #2563eb; font-weight: 500; text-decoration: none;">iktracker.fr</a></td>
      </tr>
    </table>
  </div>
  
  <!-- Page 2: Barème -->
  <div class="page">
    <!-- Header -->
    <table style="width: 100%; margin-bottom: 24px; border-bottom: 3px solid #2563eb; padding-bottom: 15px;">
      <tr>
        <td style="vertical-align: middle;">
          <table>
            <tr>
              <td style="vertical-align: middle; padding-right: 12px;">
                <img src="https://iktracker.fr/logo-iktracker-250.webp" alt="IKtracker" style="width: 48px; height: 48px; object-fit: contain;" />
              </td>
              <td style="vertical-align: middle;">
                <div style="font-size: 22px; font-weight: 700; color: #2563eb; letter-spacing: -0.5px;">IKtracker</div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Suivi des indemnités kilométriques</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <div style="font-size: 18px; font-weight: 700; color: #111;">Barème Kilométrique 2026</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Annexe au relevé</div>
        </td>
      </tr>
    </table>
    
    <!-- Section Title -->
    <div style="font-size: 14px; font-weight: 600; color: #111; margin-bottom: 16px; display: flex; align-items: center;">
      <span style="display: inline-block; width: 4px; height: 16px; background: #2563eb; border-radius: 2px; margin-right: 10px;"></span>
      Barème fiscal applicable
    </div>
    
    <!-- Barème Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #111827;">
          <th style="padding: 14px 12px; text-align: left; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; width: 25%;">Puissance fiscale</th>
          <th style="padding: 14px 12px; text-align: center; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Jusqu'à 5 000 km</th>
          <th style="padding: 14px 12px; text-align: center; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">De 5 001 à 20 000 km</th>
          <th style="padding: 14px 12px; text-align: center; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Au-delà de 20 000 km</th>
        </tr>
      </thead>
      <tbody>
        ${baremeRows}
      </tbody>
    </table>
    
    <p style="font-size: 11px; color: #6b7280; font-style: italic; margin-bottom: 24px;">d = distance parcourue en kilomètres. Les montants sont en euros.</p>
    
    <!-- Electric Bonus -->
    <table style="width: 100%; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; margin-bottom: 30px;">
      <tr>
        <td style="padding: 16px 20px;">
          <table>
            <tr>
              <td style="vertical-align: top; padding-right: 14px;">
                <span style="font-size: 22px;">⚡</span>
              </td>
              <td style="font-size: 12px; color: #065f46; line-height: 1.5;">
                <strong style="font-weight: 600;">Véhicules électriques :</strong> Les véhicules 100% électriques bénéficient d'une majoration de 20% sur le montant des indemnités kilométriques.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Legal -->
    <p style="font-size: 10px; color: #9ca3af; line-height: 1.5; margin-bottom: 24px;">
      Source : Arrêté du 27 mars 2024 fixant le barème forfaitaire permettant l'évaluation des frais de déplacement relatifs à l'utilisation d'un véhicule par les bénéficiaires de traitements et salaires optant pour le régime des frais réels déductibles.
      <br><br>
      Ce document est généré automatiquement par IKtracker et constitue un récapitulatif des trajets professionnels effectués. Il appartient au déclarant de vérifier l'exactitude des informations et de les conserver conformément aux obligations fiscales en vigueur.
    </p>
    
    <!-- Footer -->
    <table style="width: 100%; border-top: 1px solid #e5e7eb; padding-top: 12px;">
      <tr>
        <td style="font-size: 11px; color: #6b7280;">Document généré automatiquement • Conforme au barème fiscal 2026</td>
        <td style="text-align: right; font-size: 11px;"><a href="https://iktracker.fr" style="color: #2563eb; font-weight: 500; text-decoration: none;">iktracker.fr</a></td>
      </tr>
    </table>
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
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `releve-ik-${dateStr}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
