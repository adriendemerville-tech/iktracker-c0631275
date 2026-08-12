import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { TripRow } from './trips';

const euro = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

export function buildReportHtml(params: { trips: TripRow[]; periodLabel: string; ownerName: string }): string {
  const { trips, periodLabel, ownerName } = params;
  const totalKm = trips.reduce((s, t) => s + (t.distance ?? 0), 0);
  const totalIk = trips.reduce((s, t) => s + (t.ik_amount ?? 0), 0);

  const rows = trips
    .map(
      (t) => `<tr>
        <td>${t.date}</td>
        <td>${t.start_address ?? '-'}</td>
        <td>${t.end_address ?? '-'}</td>
        <td>${t.purpose ?? '-'}</td>
        <td class="num">${t.distance.toFixed(1)}</td>
        <td class="num">${euro(t.ik_amount ?? 0)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, Helvetica, sans-serif; color: #1c1917; padding: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { color: #57534e; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; background: #f5f5f4; padding: 6px; border-bottom: 1px solid #e7e5e4; }
    td { padding: 6px; border-bottom: 1px solid #f5f5f4; }
    .num { text-align: right; }
    .total { margin-top: 18px; font-size: 13px; font-weight: 600; }
    footer { margin-top: 28px; font-size: 10px; color: #78716c; }
  </style></head><body>
  <h1>Relevé d'indemnités kilométriques</h1>
  <div class="sub">${ownerName} — ${periodLabel}</div>
  <table>
    <thead><tr><th>Date</th><th>Départ</th><th>Arrivée</th><th>Motif</th><th class="num">Km</th><th class="num">IK</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Total : ${totalKm.toFixed(1)} km — ${euro(totalIk)}</div>
  <footer>Généré par IKTracker — iktracker.fr — barème kilométrique officiel.</footer>
  </body></html>`;
}

export async function exportReportPdf(params: { trips: TripRow[]; periodLabel: string; ownerName: string }) {
  const html = buildReportHtml(params);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
  return uri;
}
