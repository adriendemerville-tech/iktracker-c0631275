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

// Extract city name from full address (e.g., "255 chemin des masques, 13160 Châteaurenard" → "Châteaurenard")
function extractCity(address: string): string {
  const parts = address.split(',').map(p => p.trim());
  
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
    if (part.match(/^\d/) || part.match(/^(rue|avenue|boulevard|chemin|allée|place|impasse)/i)) continue;
    return part;
  }
  
  // Ultimate fallback: truncate address
  return address.length > 25 ? address.substring(0, 24) + '…' : address;
}

function generateReportHTML(options: PrintReportOptions): string {
  const { trips, vehicles, totalKm, userInfo, logoUrl } = options;
  const logoSrc = logoUrl || '/logo-iktracker-250.webp';
  
  // Get Supabase config for the share link feature
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  
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
  
  // For titulaire: use userInfo first, fallback to vehicle owner, then email as last resort
  const titulaireNom = userDisplayName || 
    (vehicle?.ownerFirstName || vehicle?.ownerLastName
      ? `${vehicle.ownerFirstName || ''} ${vehicle.ownerLastName || ''}`.trim()
      : null) ||
    userEmail; // Use email as title if no name available
  
  const vehicleName = vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || `Véhicule ${vehicle.fiscalPower} CV` : '';
  
  const recalculatedTrips = recalculateTrips(trips, vehicles);
  const recalculatedTotalIK = recalculatedTrips.reduce((sum, t) => sum + t.recalculatedIK, 0);

  // Generate trip rows - columns: Date, Départ, Arrivée, Motif, Km, Cumul, IK
  // Using city extraction for Départ/Arrivée
  const tripRows = recalculatedTrips.map((t, i) => {
    const tripDate = new Date(t.startTime);
    const day = tripDate.getDate().toString().padStart(2, '0');
    const month = (tripDate.getMonth() + 1).toString().padStart(2, '0');
    const year = tripDate.getFullYear().toString().slice(-2);
    const startCity = extractCity(t.startLocation.address || t.startLocation.name);
    const endCity = extractCity(t.endLocation.address || t.endLocation.name);
    const motif = t.purpose || '-';
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    
    return `
      <tr style="background-color: ${bgColor}; page-break-inside: avoid;">
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-weight: 500; font-size: 11px; width: 70px; min-width: 70px;">${day}/${month}/${year}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; width: 140px; min-width: 140px;">${startCity}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; width: 140px; min-width: 140px;">${endCity}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; width: 180px; min-width: 180px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${motif.length > 28 ? motif.substring(0, 27) + '…' : motif}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; font-size: 11px; width: 60px; min-width: 60px;">${Math.round(t.distance)}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #9ca3af; font-size: 11px; width: 65px; min-width: 65px;">${Math.round(t.cumulativeKm)}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #2563eb; font-size: 11px; width: 80px; min-width: 80px;">${t.recalculatedIK.toFixed(2)} €</td>
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

  // SVG Icons with explicit dimensions
  const userIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const carIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
  const calendarIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/svg+xml" href="https://iktracker.lovable.app/favicon.svg">
  <link rel="icon" type="image/png" sizes="48x48" href="https://iktracker.lovable.app/favicon-48x48.png">
  <title>Relevé IK - ${currentMonth} ${currentYear}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm;
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
      background: #f5f5f5;
      line-height: 1.4;
      padding: 40px 60px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page {
      width: 100%;
      padding: 30px 40px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      page-break-after: always;
    }
    
    .page:last-child {
      page-break-after: avoid;
      margin-bottom: 0;
    }
    
    .action-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #fff;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
    }
    
    .action-bar .left-actions,
    .action-bar .right-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    
    .action-bar button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: background 0.2s, transform 0.1s;
    }
    
    .action-bar button:hover {
      transform: translateY(-1px);
    }
    
    .action-bar button:active {
      transform: translateY(0);
    }
    
    .btn-back {
      background: #6B7280;
      color: #fff;
    }
    
    .btn-back:hover {
      background: #4B5563;
    }
    
    .btn-pdf {
      background: #6B7280;
      color: #fff;
    }
    
    .btn-pdf:hover {
      background: #4B5563;
    }
    
    .btn-pdf:disabled {
      opacity: 0.7;
      cursor: wait;
    }
    
    .btn-print {
      background: #6B7280;
      color: #fff;
    }
    
    .btn-print:hover {
      background: #4B5563;
    }
    
    .btn-email {
      background: #6B7280;
      color: #fff;
    }
    
    .btn-email:hover {
      background: #4B5563;
    }
    
    .btn-link {
      background: #6B7280;
      color: #fff;
    }
    
    .btn-link:hover {
      background: #4B5563;
    }
    
    .btn-link.copied {
      background: #22c55e;
    }
    
    .content-wrapper {
      margin-top: 70px;
    }
    
    @media print {
      .action-bar {
        display: none !important;
      }
      
      .content-wrapper {
        margin-top: 0;
      }
      
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        padding: 0;
        background: #fff;
        max-width: none;
      }
      
      .page {
        padding: 0;
        background: transparent;
        box-shadow: none;
        border-radius: 0;
        margin-bottom: 0;
      }
    }
  </style>
</head>
<body>
  <!-- Action Bar (hidden in print) -->
  <div class="action-bar">
    <div class="left-actions">
      <button class="btn-back" onclick="window.history.back()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Retour
      </button>
    </div>
    <div class="right-actions">
      <button class="btn-link" onclick="copyShareLink()" id="btn-link" style="display: none;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <span id="btn-link-text">Copier le lien</span>
      </button>
      <button class="btn-pdf" onclick="downloadPDF()" id="btn-pdf">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        Télécharger PDF
      </button>
      <button class="btn-print" onclick="window.print()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
        Imprimer
      </button>
      <button class="btn-email" onclick="sendByEmail()" id="btn-email">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        Envoyer par mail
      </button>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
    // User info embedded from the app
    const USER_INFO = {
      firstName: '${userInfo?.firstName || ''}',
      lastName: '${userInfo?.lastName || ''}',
      email: '${userInfo?.email || ''}'
    };
    const SUPABASE_URL = '${supabaseUrl}';
    const SUPABASE_KEY = '${supabaseKey}';
    
    function getUserDisplayName() {
      if (USER_INFO.firstName || USER_INFO.lastName) {
        return (USER_INFO.firstName + ' ' + USER_INFO.lastName).trim();
      }
      return '';
    }

    async function downloadPDF() {
      const btn = document.getElementById('btn-pdf');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Génération...';
      btn.disabled = true;
      
      try {
        const content = document.querySelector('.content-wrapper');
        const actionBar = document.querySelector('.action-bar');
        actionBar.style.display = 'none';
        
        // Generate filename with date
        const today = new Date();
        const dateStr = today.getFullYear() + '-' + 
          String(today.getMonth() + 1).padStart(2, '0') + '-' + 
          String(today.getDate()).padStart(2, '0');
        const filename = 'releve-ik-' + dateStr + '.pdf';
        
        const opt = {
          margin: [10, 5, 10, 5], // top, left, bottom, right in mm
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#f5f5f5' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        await html2pdf().set(opt).from(content).save();
        
        actionBar.style.display = 'flex';
      } catch (e) {
        console.error('Erreur PDF:', e);
        alert('Erreur lors de la génération du PDF');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
    
    async function sendByEmail() {
      const btn = document.getElementById('btn-email');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Préparation...';
      btn.disabled = true;
      
      try {
        let shareLink = '';
        
        // Try to create a share link if Supabase is configured
        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            // Get the HTML content to share (without the action bar)
            const actionBar = document.querySelector('.action-bar');
            actionBar.style.display = 'none';
            const htmlContent = document.documentElement.outerHTML;
            actionBar.style.display = 'flex';
            
            // Get auth token from localStorage if available
            const authData = localStorage.getItem('sb-' + SUPABASE_URL.split('//')[1].split('.')[0] + '-auth-token');
            const accessToken = authData ? JSON.parse(authData)?.access_token : null;
            
            if (accessToken) {
              const response = await fetch(SUPABASE_URL + '/rest/v1/report_shares', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SUPABASE_KEY,
                  'Authorization': 'Bearer ' + accessToken,
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                  user_id: JSON.parse(authData)?.user?.id,
                  html_content: htmlContent
                })
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data && data[0] && data[0].id) {
                  // Use a friendly URL on the current domain (proxied via /public/_redirects)
                  shareLink = window.location.origin + '/temporaryreleve/' + data[0].id;
                }
              }
            }
          } catch (e) {
            console.warn('Could not create share link:', e);
          }
        }
        
        // Build email body
        const userName = getUserDisplayName();
        let body = 'Bonjour,\\n\\n';
        body += 'Veuillez trouver ci-dessous mon relevé de frais kilométriques.\\n\\n';
        
        if (shareLink) {
          body += 'Vous pouvez consulter le relevé en ligne via ce lien (valide 7 jours) :\\n';
          body += shareLink + '\\n\\n';
        }
        
        body += 'Bien à vous,';
        
        if (userName) {
          body += '\\n\\n' + userName;
        }
        
        const subject = 'Relevé des frais kilométriques' + (userName ? ' - ' + userName : '');
        
        window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body.replace(/\\\\n/g, '\\n'));
        
      } catch (e) {
        console.error('Erreur envoi mail:', e);
        alert('Erreur lors de la préparation de l\\'email');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
    
    // Store the current share link globally
    let currentShareLink = '';
    
    async function copyShareLink() {
      const btn = document.getElementById('btn-link');
      const btnText = document.getElementById('btn-link-text');
      
      if (!currentShareLink) {
        // Need to create a share link first
        btn.disabled = true;
        btnText.textContent = 'Création...';
        
        try {
          if (SUPABASE_URL && SUPABASE_KEY) {
            const actionBar = document.querySelector('.action-bar');
            actionBar.style.display = 'none';
            const htmlContent = document.documentElement.outerHTML;
            actionBar.style.display = 'flex';
            
            const authData = localStorage.getItem('sb-' + SUPABASE_URL.split('//')[1].split('.')[0] + '-auth-token');
            const accessToken = authData ? JSON.parse(authData)?.access_token : null;
            
            if (accessToken) {
              const response = await fetch(SUPABASE_URL + '/rest/v1/report_shares', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SUPABASE_KEY,
                  'Authorization': 'Bearer ' + accessToken,
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                  user_id: JSON.parse(authData)?.user?.id,
                  html_content: htmlContent
                })
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data && data[0] && data[0].id) {
                  // Use a friendly URL on the current domain (proxied via /public/_redirects)
                  currentShareLink = window.location.origin + '/temporaryreleve/' + data[0].id;
                }
              }
            }
          }
        } catch (e) {
          console.warn('Could not create share link:', e);
        }
        
        btn.disabled = false;
      }
      
      if (currentShareLink) {
        try {
          await navigator.clipboard.writeText(currentShareLink);
          btn.classList.add('copied');
          btnText.textContent = 'Copié !';
          setTimeout(() => {
            btn.classList.remove('copied');
            btnText.textContent = 'Copier le lien';
          }, 2000);
        } catch (e) {
          // Fallback for older browsers
          const textarea = document.createElement('textarea');
          textarea.value = currentShareLink;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          btn.classList.add('copied');
          btnText.textContent = 'Copié !';
          setTimeout(() => {
            btn.classList.remove('copied');
            btnText.textContent = 'Copier le lien';
          }, 2000);
        }
      } else {
        alert('Impossible de créer le lien de partage. Veuillez réessayer.');
      }
    }
    
    // Show the copy link button after page load (only if Supabase is configured)
    if (SUPABASE_URL && SUPABASE_KEY) {
      document.getElementById('btn-link').style.display = 'inline-flex';
    }
  </script>
  <style>
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }
  </style>

  <div class="content-wrapper">
  <!-- Page 1: Main Report -->
  <div class="page">
    <!-- Header -->
    <table style="width: 100%; margin-bottom: 20px; border-bottom: 3px solid #2563eb; padding-bottom: 15px;">
      <tr>
        <td style="vertical-align: middle;">
          <table>
            <tr>
              <td style="vertical-align: middle; padding-right: 12px;">
                <img src="${logoSrc}" alt="IKtracker" style="width: 48px; height: 48px; object-fit: contain;" />
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
        <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <table style="width: 100%;">
            <tr>
              <td style="padding-bottom: 12px;">
                <table>
                  <tr>
                    <td style="width: 32px; height: 32px; background: #eff6ff; border-radius: 8px; text-align: center; vertical-align: middle;">
                      ${userIcon}
                    </td>
                    <td style="padding-left: 10px; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">TITULAIRE</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Nom</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${titulaireNom || '-'}</td></tr></table></td></tr>
            <tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Email</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${userEmail || '-'}</td></tr></table></td></tr>
          </table>
        </td>
        
        <!-- Véhicule Card -->
        <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <table style="width: 100%;">
            <tr>
              <td style="padding-bottom: 12px;">
                <table>
                  <tr>
                    <td style="width: 32px; height: 32px; background: #eff6ff; border-radius: 8px; text-align: center; vertical-align: middle;">
                      ${carIcon}
                    </td>
                    <td style="padding-left: 10px; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">VÉHICULE</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Modèle</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${vehicleName || '-'}</td></tr></table></td></tr>
            <tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Puissance</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${vehicle?.fiscalPower ? vehicle.fiscalPower + ' CV' : '-'}</td></tr></table></td></tr>
            <tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Immatriculation</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #111827;">${vehicle?.licensePlate || '-'}</td></tr></table></td></tr>
            ${vehicle?.isElectric ? `<tr><td style="padding: 4px 0;"><table style="width: 100%;"><tr><td style="font-size: 11px; color: #9ca3af;">Type</td><td style="text-align: right; font-size: 12px; font-weight: 600; color: #059669;">⚡ Électrique (+20%)</td></tr></table></td></tr>` : ''}
          </table>
        </td>
        
        <!-- Période Card -->
        <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <table style="width: 100%;">
            <tr>
              <td style="padding-bottom: 12px;">
                <table>
                  <tr>
                    <td style="width: 32px; height: 32px; background: #eff6ff; border-radius: 8px; text-align: center; vertical-align: middle;">
                      ${calendarIcon}
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
        <td style="width: 33.33%; text-align: center; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Distance totale</div>
          <div style="font-size: 28px; font-weight: 700; color: #111; line-height: 1;">${totalKm.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km</div>
        </td>
        
        <!-- Trajets Card -->
        <td style="width: 33.33%; text-align: center; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Nombre de trajets</div>
          <div style="font-size: 28px; font-weight: 700; color: #111; line-height: 1;">${trips.length}</div>
        </td>
        
        <!-- IK Card (Primary Blue) -->
        <td style="width: 33.33%; text-align: center; background: #2563eb; border-radius: 12px; padding: 20px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
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
        <tr style="background: #0f172a;">
          <th style="padding: 12px 8px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 70px;">Date</th>
          <th style="padding: 12px 8px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 140px;">Départ</th>
          <th style="padding: 12px 8px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 140px;">Arrivée</th>
          <th style="padding: 12px 8px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 180px;">Motif</th>
          <th style="padding: 12px 8px; text-align: right; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 60px;">Km</th>
          <th style="padding: 12px 8px; text-align: right; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 65px;">Cumul</th>
          <th style="padding: 12px 8px; text-align: right; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 80px;">IK</th>
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
        <tr style="background: #0f172a;">
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
  </div><!-- end content-wrapper -->
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

// Generate clean HTML without action bar and scripts - optimized for PDF export via html2pdf.js
export function generateCleanPdfHTML(options: PrintReportOptions): string {
  const { trips, vehicles, totalKm, userInfo, logoUrl } = options;
  const logoSrc = logoUrl || '/logo-iktracker-250.webp';
  
  const now = new Date();
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();
  
  const editionDate = now.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  
  const userDisplayName = userInfo?.firstName || userInfo?.lastName
    ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim()
    : null;
  const userEmail = userInfo?.email || null;
  
  const vehicle = vehicles.length > 0 ? vehicles[0] : null;
  
  const titulaireNom = userDisplayName || 
    (vehicle?.ownerFirstName || vehicle?.ownerLastName
      ? `${vehicle.ownerFirstName || ''} ${vehicle.ownerLastName || ''}`.trim()
      : null) ||
    userEmail;
  
  const vehicleName = vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || `Véhicule ${vehicle.fiscalPower} CV` : '';
  
  const recalculatedTrips = recalculateTrips(trips, vehicles);
  const recalculatedTotalIK = recalculatedTrips.reduce((sum, t) => sum + t.recalculatedIK, 0);

  const tripRows = recalculatedTrips.map((t, i) => {
    const tripDate = new Date(t.startTime);
    const day = tripDate.getDate().toString().padStart(2, '0');
    const month = (tripDate.getMonth() + 1).toString().padStart(2, '0');
    const year = tripDate.getFullYear().toString().slice(-2);
    const startCity = extractCity(t.startLocation.address || t.startLocation.name);
    const endCity = extractCity(t.endLocation.address || t.endLocation.name);
    const motif = t.purpose || '-';
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    
    return `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-weight: 500; font-size: 11px;">${day}/${month}/${year}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px;">${startCity}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px;">${endCity}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-size: 10px; color: #6b7280;">${motif.length > 25 ? motif.substring(0, 24) + '…' : motif}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; font-size: 11px;">${Math.round(t.distance)}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #9ca3af; font-size: 11px;">${Math.round(t.cumulativeKm)}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #2563eb; font-size: 11px;">${t.recalculatedIK.toFixed(2)} €</td>
      </tr>
    `;
  }).join('');

  const baremeRows = IK_BAREME_2024.map((b, i) => {
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    return `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 11px;">${b.cv === '7+' ? '7 CV et +' : b.cv + ' CV'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px;">d × ${b.upTo5000.rate}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px;">(d × ${b.from5001To20000.rate}) + ${b.from5001To20000.fixed}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px;">d × ${b.over20000.rate}</td>
      </tr>
    `;
  }).join('');

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
          <div style="font-size: 12px; font-weight: 600; color: #111827;">${titulaireNom || '-'}</div>
        </td>
        <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <div style="width: 28px; height: 28px; background: #eff6ff; border-radius: 6px; display: flex; align-items: center; justify-content: center;">${carIcon}</div>
            <span style="margin-left: 8px; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase;">VÉHICULE</span>
          </div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">Modèle</div>
          <div style="font-size: 12px; font-weight: 600; color: #111827;">${vehicleName || '-'}</div>
          <div style="font-size: 11px; color: #9ca3af; margin-top: 6px; margin-bottom: 2px;">Puissance</div>
          <div style="font-size: 12px; font-weight: 600; color: #111827;">${vehicle?.fiscalPower ? vehicle.fiscalPower + ' CV' : '-'}</div>
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
          <div style="font-size: 24px; font-weight: 700; color: #111;">${totalKm.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km</div>
        </td>
        <td style="width: 33.33%; text-align: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <div style="font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Nombre de trajets</div>
          <div style="font-size: 24px; font-weight: 700; color: #111;">${trips.length}</div>
        </td>
        <td style="width: 33.33%; text-align: center; background: #2563eb; border-radius: 8px; padding: 16px;">
          <div style="font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.85); text-transform: uppercase; margin-bottom: 4px;">Indemnités à déclarer</div>
          <div style="font-size: 24px; font-weight: 700; color: #ffffff;">${recalculatedTotalIK.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
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
      <div style="font-size: 10px; color: #9ca3af;">Généré par IKtracker • iktracker.lovable.app</div>
    </div>
  </div>
</body>
</html>`;
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
