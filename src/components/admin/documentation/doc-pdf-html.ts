import { DB_TABLES, EDGE_FUNCTIONS, SECURITY_FEATURES, IK_BAREME } from "./doc-data";

export function generateDocPdfHtml(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>IKtracker — Documentation Technique</title>
<style>
  @page { size: A4 landscape; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; font-size: 11px; line-height: 1.5; }
  .page { page-break-after: always; padding: 20px; }
  .page:last-child { page-break-after: avoid; }
  h1 { font-size: 22px; color: #0d47a1; border-bottom: 3px solid #0d47a1; padding-bottom: 6px; margin-bottom: 16px; }
  h2 { font-size: 16px; color: #1565c0; margin: 14px 0 8px; }
  h3 { font-size: 13px; color: #1976d2; margin: 10px 0 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 10px; }
  th { background: #e3f2fd; color: #0d47a1; padding: 6px 8px; text-align: left; border: 1px solid #bbdefb; }
  td { padding: 5px 8px; border: 1px solid #e0e0e0; }
  tr:nth-child(even) { background: #fafafa; }
  .badge { display: inline-block; background: #e3f2fd; color: #1565c0; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; }
  .section { margin-bottom: 16px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; }
  .card-title { font-size: 13px; font-weight: 700; color: #0d47a1; margin-bottom: 6px; }
  ul { padding-left: 16px; }
  li { margin-bottom: 3px; }
  .footer { text-align: center; color: #999; font-size: 9px; margin-top: 20px; }
  .arch-box { border: 2px solid #1565c0; border-radius: 10px; padding: 10px; text-align: center; background: #e3f2fd; margin: 4px; }
  .arch-arrow { text-align: center; font-size: 18px; color: #1565c0; }
  .arch-row { display: flex; justify-content: center; align-items: center; gap: 8px; margin: 6px 0; flex-wrap: wrap; }
</style>
</head>
<body>

<!-- PAGE 1 : Vue d'ensemble -->
<div class="page">
  <h1>📘 IKtracker — Documentation Technique v3.0</h1>
  <p style="margin-bottom:14px;">Document interne — Généré le ${new Date().toLocaleDateString("fr-FR")} — Confidentiel</p>
  
  <h2>🏗️ Architecture Globale</h2>
  <div class="arch-row">
    <div class="arch-box" style="min-width:120px"><strong>Client PWA</strong><br/>React 18 + Vite 5<br/>TypeScript + Tailwind</div>
    <div class="arch-arrow">→</div>
    <div class="arch-box" style="min-width:120px"><strong>Supabase</strong><br/>PostgreSQL + Auth<br/>Edge Functions (Deno)</div>
    <div class="arch-arrow">→</div>
    <div class="arch-box" style="min-width:120px"><strong>APIs Externes</strong><br/>Google Maps<br/>Google/Outlook Calendar</div>
  </div>
  <div class="arch-row" style="margin-top:8px;">
    <div class="arch-box" style="min-width:120px"><strong>CDN / Hosting</strong><br/>Netlify / Vercel<br/>Service Worker PWA</div>
    <div class="arch-arrow">→</div>
    <div class="arch-box" style="min-width:120px"><strong>Storage</strong><br/>Supabase Storage<br/>Images blog + feedback</div>
    <div class="arch-arrow">→</div>
    <div class="arch-box" style="min-width:120px"><strong>Analytics</strong><br/>GA4 + Custom<br/>Marketing analytics DB</div>
  </div>

  <div class="grid2" style="margin-top:16px;">
    <div class="card">
      <div class="card-title">🎯 Frontend</div>
      <ul>
        <li><strong>Framework :</strong> React 18.3 + TypeScript 5.8</li>
        <li><strong>Bundler :</strong> Vite 5.4 (SWC plugin)</li>
        <li><strong>CSS :</strong> Tailwind 3.4 + design tokens HSL</li>
        <li><strong>Composants :</strong> shadcn/ui (Radix primitives)</li>
        <li><strong>State :</strong> React Query v5 (staleTime: 5min)</li>
        <li><strong>Routing :</strong> React Router v6 (lazy loading)</li>
        <li><strong>Charts :</strong> Recharts 2.15</li>
        <li><strong>Animations :</strong> Framer Motion 12</li>
        <li><strong>PWA :</strong> vite-plugin-pwa (precache + runtime)</li>
        <li><strong>Compression :</strong> vite-plugin-compression (gzip)</li>
      </ul>
    </div>
    <div class="card">
      <div class="card-title">☁️ Backend</div>
      <ul>
        <li><strong>BaaS :</strong> Supabase (Lovable Cloud)</li>
        <li><strong>DB :</strong> PostgreSQL 15 + RLS sur 26 tables</li>
        <li><strong>Auth :</strong> Email/password + Google OAuth</li>
        <li><strong>Functions :</strong> 11 Edge Functions Deno</li>
        <li><strong>Storage :</strong> 3 Buckets S3-compatible</li>
        <li><strong>Realtime :</strong> WebSocket presence (admin)</li>
        <li><strong>RPC :</strong> 25+ fonctions SQL (stats, search, coûts)</li>
        <li><strong>Cron :</strong> cleanup_expired_shares, cleanup_old_phone_numbers</li>
      </ul>
    </div>
  </div>
</div>

<!-- PAGE 2 : Base de données -->
<div class="page">
  <h1>🗄️ Schéma Base de Données</h1>
  <p style="margin-bottom:10px;">${DB_TABLES.length} tables avec Row Level Security activé sur chacune.</p>
  <table>
    <thead><tr><th>Table</th><th>Description</th><th>Catégorie</th><th>RLS</th></tr></thead>
    <tbody>
      ${DB_TABLES.map((t) => `<tr><td><code>${t.name}</code></td><td>${t.desc}</td><td><span class="badge">${t.rows}</span></td><td>✅</td></tr>`).join("")}
    </tbody>
  </table>

  <h2>🔧 Fonctions RPC Principales</h2>
  <div class="grid2">
    <div class="card">
      <div class="card-title">Stats & Analytics</div>
      <ul>
        <li><code>get_admin_stats(start_date, end_date)</code></li>
        <li><code>get_daily_active_users(days_back)</code> — connexions + actions</li>
        <li><code>get_marketing_stats(days_back)</code></li>
        <li><code>get_marketing_stats_by_page(days_back)</code></li>
        <li><code>get_marketing_views_by_day(days_back)</code></li>
        <li><code>get_registrations_by_day(days_back)</code></li>
        <li><code>get_monthly_stats(months_back)</code></li>
        <li><code>get_top_users(limit, sort_by)</code></li>
        <li><code>get_user_stats(_user_id)</code></li>
        <li><code>get_total_tours_count(start, end)</code></li>
        <li><code>get_bareme_simulations_by_day(days_back)</code></li>
        <li><code>get_signup_clicks_by_day(start, end)</code></li>
        <li><code>get_shares_by_day(days_back)</code></li>
        <li><code>get_download_clicks_by_day(days_back)</code></li>
        <li><code>get_download_stats()</code></li>
        <li><code>get_share_stats()</code></li>
        <li><code>get_takeout_import_stats()</code></li>
      </ul>
    </div>
    <div class="card">
      <div class="card-title">Sécurité, Coûts & Utils</div>
      <ul>
        <li><code>has_role(_user_id, _role)</code> — SECURITY DEFINER</li>
        <li><code>has_admin_or_viewer_role(_user_id)</code> — lecture stats</li>
        <li><code>search_users(search_term, limit)</code></li>
        <li><code>get_recent_signups(limit)</code></li>
        <li><code>cleanup_expired_shares()</code></li>
        <li><code>cleanup_old_phone_numbers()</code></li>
        <li><code>get_api_cost_stats(days_back)</code></li>
        <li><code>get_api_cost_by_function(days_back)</code></li>
        <li><code>get_api_cost_by_day(days_back)</code></li>
        <li><code>get_api_cost_by_model(days_back)</code></li>
      </ul>
    </div>
  </div>
</div>

<!-- PAGE 3 : Edge Functions + Sécurité -->
<div class="page">
  <h1>⚡ Edge Functions (Deno)</h1>
  <table>
    <thead><tr><th>Fonction</th><th>Description</th><th>Méthode</th></tr></thead>
    <tbody>
      ${EDGE_FUNCTIONS.map((f) => `<tr><td><code>${f.name}</code></td><td>${f.desc}</td><td><span class="badge">${f.method}</span></td></tr>`).join("")}
    </tbody>
  </table>

  <h2>🔒 Sécurité</h2>
  <ul>
    ${SECURITY_FEATURES.map((s) => `<li>✅ ${s}</li>`).join("")}
  </ul>

  <h2>📊 Barème IK 2026 (intégré dans le code)</h2>
  <table>
    <thead><tr><th>Puissance</th><th>≤ 5 000 km</th><th>5 001 – 20 000 km</th><th>> 20 000 km</th></tr></thead>
    <tbody>
      ${IK_BAREME.map((b) => `<tr><td><strong>${b.cv}</strong></td><td>${b.up5000}</td><td>${b.f5001_20000}</td><td>${b.over20000}</td></tr>`).join("")}
    </tbody>
  </table>
  <p style="margin-top:4px;font-size:10px;color:#666;">Véhicules 100% électriques : majoration de 20% appliquée automatiquement.</p>

  <h2>📱 Fonctionnalités Clés</h2>
  <div class="grid2">
    <div class="card">
      <div class="card-title">Mode Tournée GPS</div>
      <ul>
        <li>Geolocation API (watchPosition)</li>
        <li>Détection d'arrêt par distance/temps</li>
        <li>Reverse geocoding automatique</li>
        <li>Calcul distance route Google Maps</li>
        <li>Wake Lock API (écran allumé)</li>
        <li>Récupération session interrompue</li>
      </ul>
    </div>
    <div class="card">
      <div class="card-title">Sync Calendrier</div>
      <ul>
        <li>OAuth2 Google Calendar / Outlook</li>
        <li>Parsing événements avec adresse</li>
        <li>Création trajets auto (aller-retour)</li>
        <li>Déduplication par calendar_event_id</li>
        <li>Refresh token automatique</li>
        <li>Edge Function sync-calendar-trips</li>
      </ul>
    </div>
  </div>

  <div class="footer">IKtracker — Documentation technique confidentielle — ${new Date().getFullYear()}</div>
</div>
</body>
</html>`;
}

