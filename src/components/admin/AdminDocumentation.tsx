import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Database,
  Globe,
  Lock,
  Cpu,
  Layers,
  Server,
  Code,
  FileText,
  Shield,
  Zap,
  Map,
  Calendar,
  Car,
  Calculator,
  Share2,
  Bell,
  Smartphone,
  Clock,
  Navigation as NavigationIcon,
} from 'lucide-react';

// ─── Architecture Diagram (Mermaid-style text for display) ───

const ARCHITECTURE_SECTIONS = [
  {
    title: 'Stack Technique',
    icon: <Layers className="w-5 h-5" />,
    items: [
      { label: 'Frontend', value: 'React 18 + TypeScript + Vite 5', badge: 'SPA' },
      { label: 'UI Framework', value: 'Tailwind CSS 3 + shadcn/ui (Radix)', badge: 'Design System' },
      { label: 'State / Cache', value: 'TanStack React Query v5', badge: 'Cache' },
      { label: 'Routing', value: 'React Router DOM v6', badge: 'SPA' },
      { label: 'Animations', value: 'Framer Motion', badge: 'UX' },
      { label: 'Charts', value: 'Recharts', badge: 'Data Viz' },
      { label: 'PWA', value: 'vite-plugin-pwa + Service Worker', badge: 'Offline' },
    ],
  },
  {
    title: 'Backend (Lovable Cloud / Supabase)',
    icon: <Server className="w-5 h-5" />,
    items: [
      { label: 'Base de données', value: 'PostgreSQL 15 avec RLS activé', badge: 'SQL' },
      { label: 'Auth', value: 'Supabase Auth (email/password, OAuth Google)', badge: 'Auth' },
      { label: 'Edge Functions', value: 'Deno runtime (11 fonctions déployées)', badge: 'Serverless' },
      { label: 'Storage', value: 'Supabase Storage (feedback, blog, survey-screenshots)', badge: 'S3-like' },
      { label: 'Realtime', value: 'Supabase Realtime (presence admin)', badge: 'WebSocket' },
      { label: 'RPC', value: '25+ fonctions SQL (stats, search, coûts, etc.)', badge: 'SQL' },
    ],
  },
  {
    title: 'APIs Externes',
    icon: <Globe className="w-5 h-5" />,
    items: [
      { label: 'Google Maps', value: 'Distance Matrix + Geocoding + Places', badge: 'Géo' },
      { label: 'Google Calendar', value: 'OAuth2 + Calendar Events API', badge: 'Sync' },
      { label: 'Microsoft Outlook', value: 'OAuth2 + Microsoft Graph API', badge: 'Sync' },
      { label: 'Google Analytics', value: 'GA4 via react-ga4', badge: 'Analytics' },
    ],
  },
];

const DB_TABLES = [
  { name: 'trips', desc: 'Trajets IK (distance, montant IK, tour_stops JSON)', rows: 'Principale', rls: true },
  { name: 'vehicles', desc: 'Véhicules (puissance fiscale, électrique, plaque)', rows: 'Principale', rls: true },
  { name: 'locations', desc: 'Adresses enregistrées (lat/lng, type)', rows: 'Principale', rls: true },
  { name: 'user_preferences', desc: 'Préférences utilisateur (persona, email comptable)', rows: 'Config', rls: true },
  { name: 'user_roles', desc: 'Rôles (admin/user/viewer) — table séparée sécurisée', rows: 'Sécurité', rls: true },
  { name: 'tour_sessions', desc: 'Sessions tournée GPS actives (stops, gps_points, pending_stop)', rows: 'Tournée', rls: true },
  { name: 'calendar_connections', desc: 'Connexions OAuth calendrier (tokens chiffrés)', rows: 'Sync', rls: true },
  { name: 'distance_cache', desc: 'Cache distances Google Maps par paire d\'adresses', rows: 'Perf', rls: true },
  { name: 'frequent_destinations', desc: 'Destinations fréquentes (keyword → address)', rows: 'UX', rls: true },
  { name: 'feedback', desc: 'Retours utilisateurs (message, image, réponse admin)', rows: 'Support', rls: true },
  { name: 'blog_posts', desc: 'Articles blog (slug, content, status draft/published/archived)', rows: 'CMS', rls: true },
  { name: 'blog_api_keys', desc: 'Clés API blog pour accès externe', rows: 'CMS', rls: true },
  { name: 'page_contents', desc: 'Contenus éditables des pages (JSON, meta SEO)', rows: 'CMS', rls: true },
  { name: 'surveys', desc: 'Enquêtes (ciblage, durée, personas, A/B testing)', rows: 'Surveys', rls: true },
  { name: 'survey_variants', desc: 'Variantes A/B des enquêtes (content_blocks JSON)', rows: 'Surveys', rls: true },
  { name: 'survey_responses', desc: 'Réponses aux enquêtes (responses JSON, screenshots)', rows: 'Surveys', rls: true },
  { name: 'survey_impressions', desc: 'Impressions/affichages des enquêtes par utilisateur', rows: 'Surveys', rls: true },
  { name: 'marketing_analytics', desc: 'Tracking pages marketing (event, device, referrer, IP)', rows: 'Analytics', rls: true },
  { name: 'report_shares', desc: 'Relevés PDF partagés temporairement (expire 7j)', rows: 'Export', rls: true },
  { name: 'share_events', desc: 'Événements de partage (total_km, total_ik)', rows: 'Analytics', rls: true },
  { name: 'download_clicks', desc: 'Clicks sur bouton téléchargement', rows: 'Analytics', rls: true },
  { name: 'api_usage_logs', desc: 'Logs coût API (tokens, modèle, coût €)', rows: 'Monitoring', rls: true },
  { name: 'api_audit_logs', desc: 'Audit trail API blog (action, données avant/après, revert)', rows: 'Monitoring', rls: true },
  { name: 'error_logs', desc: 'Logs d\'erreurs applicatives (type, source, metadata)', rows: 'Monitoring', rls: true },
  { name: 'excluded_ips', desc: 'IPs exclues des analytics marketing', rows: 'Config', rls: true },
  { name: 'takeout_import_attempts', desc: 'Tentatives import Google Takeout', rows: 'Import', rls: true },
];

const EDGE_FUNCTIONS = [
  { name: 'blog-api', desc: 'API REST CRUD pour les articles de blog', method: 'GET/POST/PUT/DELETE' },
  { name: 'calendar-debug', desc: 'Debug des connexions calendrier OAuth', method: 'POST' },
  { name: 'convert-blog-images', desc: 'Conversion images blog en WebP optimisé', method: 'POST' },
  { name: 'google-calendar-auth', desc: 'OAuth2 flow Google Calendar (code → tokens)', method: 'GET/POST' },
  { name: 'outlook-calendar-auth', desc: 'OAuth2 flow Microsoft Outlook (Graph API)', method: 'GET/POST' },
  { name: 'parse-takeout', desc: 'Parsing fichiers Google Takeout (historique positions)', method: 'POST' },
  { name: 'recalculate-distances', desc: 'Recalcul distances via Google Maps API', method: 'POST' },
  { name: 'sitemap', desc: 'Génération dynamique sitemap.xml (pages + blog)', method: 'GET' },
  { name: 'sync-calendar-trips', desc: 'Synchronisation événements calendrier → trajets', method: 'POST' },
  { name: 'vehicle-lookup', desc: 'Lookup véhicule par plaque d\'immatriculation', method: 'POST' },
  { name: 'view-report', desc: 'Affichage relevé IK partagé temporairement', method: 'GET' },
];

const SECURITY_FEATURES = [
  'Row Level Security (RLS) activé sur toutes les 26 tables',
  'Rôles utilisateurs dans table séparée (admin/user/viewer)',
  'Fonction has_role() en SECURITY DEFINER pour éviter récursion RLS',
  'Fonction has_admin_or_viewer_role() pour accès lecture stats (viewers)',
  'Séparation stricte admin vs viewer : viewers = lecture seule, pas de mutation',
  'Tokens OAuth chiffrés côté serveur (calendar_connections)',
  'Pas de clés privées dans le code client (env vars Deno pour Google Maps, etc.)',
  'Content Security Policy (CSP) via headers Netlify',
  'Politique noindex sur pages admin et sensibles',
  'Validation côté serveur dans les Edge Functions (Deno)',
  'CORS configuré par fonction Edge',
  'Expiration automatique des rapports partagés (7 jours)',
  'Nettoyage automatique des numéros de téléphone après 7 jours (cleanup_old_phone_numbers)',
  'Pas d\'exposition de stack traces dans les réponses d\'erreur (calendar-debug)',
  'RLS report_shares : accès limité au propriétaire (pas d\'énumération publique)',
];

const IK_BAREME = [
  { cv: '3 CV', up5000: '0,529 €/km', f5001_20000: '(d × 0,316) + 1 065 €', over20000: '0,370 €/km' },
  { cv: '4 CV', up5000: '0,606 €/km', f5001_20000: '(d × 0,340) + 1 330 €', over20000: '0,407 €/km' },
  { cv: '5 CV', up5000: '0,636 €/km', f5001_20000: '(d × 0,357) + 1 395 €', over20000: '0,427 €/km' },
  { cv: '6 CV', up5000: '0,665 €/km', f5001_20000: '(d × 0,374) + 1 457 €', over20000: '0,447 €/km' },
  { cv: '7+ CV', up5000: '0,697 €/km', f5001_20000: '(d × 0,394) + 1 515 €', over20000: '0,470 €/km' },
];

function generateDocPdfHtml(): string {
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
  <p style="margin-bottom:14px;">Document interne — Généré le ${new Date().toLocaleDateString('fr-FR')} — Confidentiel</p>
  
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
      ${DB_TABLES.map(t => `<tr><td><code>${t.name}</code></td><td>${t.desc}</td><td><span class="badge">${t.rows}</span></td><td>✅</td></tr>`).join('')}
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
      ${EDGE_FUNCTIONS.map(f => `<tr><td><code>${f.name}</code></td><td>${f.desc}</td><td><span class="badge">${f.method}</span></td></tr>`).join('')}
    </tbody>
  </table>

  <h2>🔒 Sécurité</h2>
  <ul>
    ${SECURITY_FEATURES.map(s => `<li>✅ ${s}</li>`).join('')}
  </ul>

  <h2>📊 Barème IK 2024 (intégré dans le code)</h2>
  <table>
    <thead><tr><th>Puissance</th><th>≤ 5 000 km</th><th>5 001 – 20 000 km</th><th>> 20 000 km</th></tr></thead>
    <tbody>
      ${IK_BAREME.map(b => `<tr><td><strong>${b.cv}</strong></td><td>${b.up5000}</td><td>${b.f5001_20000}</td><td>${b.over20000}</td></tr>`).join('')}
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

export function AdminDocumentation() {
  const [docTab, setDocTab] = useState('architecture');

  const handleDownloadPdf = () => {
    const html = generateDocPdfHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          URL.revokeObjectURL(url);
        }, 500);
      };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Documentation Technique</h2>
          <p className="text-sm text-muted-foreground">Architecture, schéma DB, sécurité, fonctions</p>
        </div>
        <Button onClick={handleDownloadPdf} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exporter PDF
        </Button>
      </div>

      <Tabs value={docTab} onValueChange={setDocTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="architecture"><Layers className="w-3.5 h-3.5 mr-1" />Stack</TabsTrigger>
          <TabsTrigger value="database"><Database className="w-3.5 h-3.5 mr-1" />DB</TabsTrigger>
          <TabsTrigger value="functions"><Zap className="w-3.5 h-3.5 mr-1" />Functions</TabsTrigger>
          <TabsTrigger value="security"><Shield className="w-3.5 h-3.5 mr-1" />Sécurité</TabsTrigger>
          <TabsTrigger value="tour"><Map className="w-3.5 h-3.5 mr-1" />Tournée</TabsTrigger>
        </TabsList>

        {/* Architecture */}
        <TabsContent value="architecture" className="space-y-4">
          {/* Visual schema */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                Schéma d'Architecture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <ArchBox icon={<Smartphone className="w-4 h-4" />} label="Client PWA" sub="React + Vite" color="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" />
                  <span className="text-xl text-muted-foreground">→</span>
                  <ArchBox icon={<Server className="w-4 h-4" />} label="Supabase" sub="PostgreSQL + Auth" color="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" />
                  <span className="text-xl text-muted-foreground">→</span>
                  <ArchBox icon={<Globe className="w-4 h-4" />} label="APIs" sub="Maps + Calendar" color="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" />
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center mt-2">
                  <ArchBox icon={<Zap className="w-4 h-4" />} label="Edge Functions" sub="Deno Runtime" color="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800" />
                  <span className="text-xl text-muted-foreground">→</span>
                  <ArchBox icon={<Database className="w-4 h-4" />} label="Storage" sub="S3 Buckets" color="bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800" />
                  <span className="text-xl text-muted-foreground">→</span>
                  <ArchBox icon={<Bell className="w-4 h-4" />} label="Realtime" sub="WebSocket" color="bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800" />
                </div>
              </div>
            </CardContent>
          </Card>

          {ARCHITECTURE_SECTIONS.map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {section.icon}
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <div>
                        <span className="font-medium text-sm text-foreground">{item.label}</span>
                        <span className="text-sm text-muted-foreground ml-2">{item.value}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{item.badge}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Database */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Tables PostgreSQL ({DB_TABLES.length})
              </CardTitle>
              <CardDescription>Toutes les tables ont RLS activé</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-1.5">
                  {DB_TABLES.map((table) => (
                    <div key={table.name} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded shrink-0">{table.name}</code>
                      <span className="text-sm text-muted-foreground flex-1">{table.desc}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className="text-xs">{table.rows}</Badge>
                        {table.rls && <Lock className="w-3 h-3 text-green-600" />}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Barème IK 2024
              </CardTitle>
              <CardDescription>Intégré dans src/types/trip.ts — Majoration 20% véhicules électriques</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-foreground">CV</th>
                      <th className="text-left py-2 font-medium text-foreground">≤ 5 000 km</th>
                      <th className="text-left py-2 font-medium text-foreground">5 001 – 20 000 km</th>
                      <th className="text-left py-2 font-medium text-foreground">&gt; 20 000 km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {IK_BAREME.map((b) => (
                      <tr key={b.cv} className="border-b border-border last:border-0">
                        <td className="py-1.5 font-medium text-foreground">{b.cv}</td>
                        <td className="py-1.5 text-muted-foreground">{b.up5000}</td>
                        <td className="py-1.5 text-muted-foreground">{b.f5001_20000}</td>
                        <td className="py-1.5 text-muted-foreground">{b.over20000}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edge Functions */}
        <TabsContent value="functions" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Edge Functions ({EDGE_FUNCTIONS.length})
              </CardTitle>
              <CardDescription>Runtime Deno — Déployées automatiquement via Lovable Cloud</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {EDGE_FUNCTIONS.map((fn) => (
                  <div key={fn.name} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded shrink-0">{fn.name}</code>
                    <span className="text-sm text-muted-foreground flex-1">{fn.desc}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">{fn.method}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Mesures de Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SECURITY_FEATURES.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5">
                    <Lock className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                Patterns de Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-mono text-muted-foreground mb-1">// Vérification rôle admin (SECURITY DEFINER)</p>
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{`CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;`}</pre>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-mono text-muted-foreground mb-1">// Politique RLS type (accès par user_id)</p>
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{`CREATE POLICY "users_own_data" ON trips
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tour Mode */}
        <TabsContent value="tour" className="space-y-4">
          {/* Workflow Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Map className="w-5 h-5 text-primary" />
                Mode Tournée — Workflow Complet
              </CardTitle>
              <CardDescription>Suivi GPS automatique pour itinérants (infirmiers, commerciaux, livreurs)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                {[
                  { step: '1', title: 'Démarrage', desc: 'Utilisateur clique sur le bouton Tournée (TourButton) → appelle startTour() dans useTourTracker' },
                  { step: '2', title: 'Permissions', desc: 'Demande Geolocation API (navigator.geolocation.watchPosition) + Wake Lock API (écran allumé)' },
                  { step: '3', title: 'Suivi GPS', desc: 'watchPosition avec intervalle 10s, filtre précision > 50m ignoré, déplacement < 5m ignoré' },
                  { step: '4', title: 'Détection arrêt', desc: 'Immobilité dans rayon 100m pendant ≥ 2 min → nouveau TourStop créé automatiquement' },
                  { step: '5', title: 'Reverse geocoding', desc: 'API Google Geocoding sur chaque arrêt pour obtenir ville + adresse (cache mémoire)' },
                  { step: '6', title: 'Calcul distance', desc: 'Distance cumulée Haversine entre tous les GpsPoint filtrés (pas les stops)' },
                  { step: '7', title: 'Fin de tournée', desc: 'Bouton Terminer → handleConvertToTrips() : reverse geocode départ/arrivée, calcul distance route Google Maps, création Trip validé' },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{s.step}</div>
                    <div>
                      <span className="font-medium text-sm text-foreground">{s.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Session Recovery */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Récupération de Session
              </CardTitle>
              <CardDescription>useTourSessionRecovery.ts — Gestion des interruptions (app kill, navigation, mise en veille)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="default" className="shrink-0 mt-0.5">Cas A</Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">Inactivité &lt; 20 min → Reprise transparente</p>
                      <p className="text-xs text-muted-foreground">La tournée reprend automatiquement sans intervention utilisateur. Le gap GPS est comblé.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="shrink-0 mt-0.5">Cas B</Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">20 min — 2 heures → Modale TourRecoveryModal</p>
                      <p className="text-xs text-muted-foreground">L'utilisateur choisit « Reprendre » ou « Terminer ». Affiche nb d'étapes et km parcourus.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0 mt-0.5">Cas C</Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">Inactivité &gt; 2 heures → Finalisation automatique</p>
                      <p className="text-xs text-muted-foreground">La tournée est convertie en trajet automatiquement. Données sauvegardées dans localStorage puis nettoyées.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs font-mono text-muted-foreground mb-1">// Persistance localStorage</p>
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{`TOUR_SESSION_DATA    → { sessionId, startTime, lastActivity, stops[], gpsPoints[], totalDistanceKm }
TOUR_LAST_ACTIVITY   → timestamp ISO (mis à jour toutes les 30s)
TOUR_ACTIVE          → "true" / supprimé
TOUR_STOPS           → TourStop[] sérialisé
TOUR_GPS_POINTS      → GpsPoint[] sérialisé
TOUR_DISTANCE        → number (km cumulés)`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* GPS Technical Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <NavigationIcon className="w-5 h-5 text-primary" />
                Paramètres GPS & Détection
              </CardTitle>
              <CardDescription>useTourTracker.ts — Constantes et algorithme de détection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-foreground">Paramètre</th>
                      <th className="text-left py-2 font-medium text-foreground">Valeur</th>
                      <th className="text-left py-2 font-medium text-foreground">Rôle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { param: 'WATCH_INTERVAL', val: '10 000 ms', role: 'Intervalle minimum entre deux positions GPS' },
                      { param: 'MAX_ACCURACY', val: '50 m', role: 'Positions avec précision > 50m ignorées (bruit)' },
                      { param: 'MIN_DISPLACEMENT', val: '5 m', role: 'Mouvement < 5m ignoré (tremblement GPS)' },
                      { param: 'STOP_RADIUS', val: '100 m', role: "Rayon d\u2019immobilité pour détecter un arrêt" },
                      { param: 'STOP_DURATION', val: '120 s (2 min)', role: 'Durée minimum dans le rayon pour valider un arrêt' },
                      { param: 'MIN_TRIP_DISTANCE', val: '0.5 km', role: 'Distance minimale pour créer un trajet valide' },
                      { param: 'ACTIVITY_UPDATE', val: '30 s', role: 'Fréquence de mise à jour du timestamp localStorage' },
                      { param: 'TRANSPARENT_RESUME', val: '< 20 min', role: 'Seuil reprise silencieuse (Cas A)' },
                      { param: 'MODAL_RESUME', val: '20 min – 2h', role: 'Seuil modale de récupération (Cas B)' },
                      { param: 'AUTO_FINALIZE', val: '> 2h', role: 'Seuil finalisation automatique (Cas C)' },
                    ].map((r) => (
                      <tr key={r.param} className="border-b border-border last:border-0">
                        <td className="py-1.5"><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{r.param}</code></td>
                        <td className="py-1.5 font-medium text-foreground">{r.val}</td>
                        <td className="py-1.5 text-muted-foreground text-xs">{r.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Components & Files */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                Fichiers & Composants
              </CardTitle>
              <CardDescription>Architecture du mode tournée dans le codebase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {[
                  { file: 'hooks/useTourTracker.ts', desc: 'Hook principal : watchPosition, détection arrêts, calcul distance, persistance localStorage', badge: 'Core' },
                  { file: 'hooks/useTourSessionRecovery.ts', desc: 'Récupération session : save/load/clear + logique Cas A/B/C + formatInactivityDuration', badge: 'Recovery' },
                  { file: 'hooks/useWakeLock.ts', desc: "Wake Lock API : garde l\u2019écran allumé pendant la tournée", badge: 'API' },
                  { file: 'hooks/useGeolocation.ts', desc: 'Abstraction Geolocation API + gestion permissions', badge: 'API' },
                  { file: 'components/TourButton.tsx', desc: 'Bouton principal sur la page Home : gradient animé, compteur km/étapes', badge: 'UI' },
                  { file: 'components/FocusTourView.tsx', desc: 'Vue plein écran pendant tournée active : heure, durée, distance, signal GPS, batterie', badge: 'UI' },
                  { file: 'components/TourLogSheet.tsx', desc: 'Sheet bottom avec liste des étapes détectées, stats temps/distance', badge: 'UI' },
                  { file: 'components/TourRecoveryModal.tsx', desc: 'AlertDialog Cas B : "Reprendre" ou "Terminer" avec stats de la tournée interrompue', badge: 'UI' },
                  { file: 'components/TourDetailSheet.tsx', desc: "Détail d\u2019une tournée passée : timeline des arrêts avec adresses et durées", badge: 'UI' },
                  { file: 'lib/distance.ts', desc: 'Haversine (getDistanceInMeters/Km) + calculateDrivingDistance (Google Maps fallback)', badge: 'Util' },
                  { file: 'lib/geocoding.ts', desc: 'reverseGeocode() avec cache mémoire + extractCityFromAddress()', badge: 'Util' },
                  { file: 'types/trip.ts', desc: 'Interface TourStopData { id, timestamp, lat, lng, address?, city?, duration? }', badge: 'Type' },
                ].map((f) => (
                  <div key={f.file} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded shrink-0">{f.file}</code>
                    <span className="text-xs text-muted-foreground flex-1">{f.desc}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{f.badge}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conversion to Trip */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Conversion Tournée → Trajet
              </CardTitle>
              <CardDescription>handleConvertToTrips() dans Index.tsx</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-3">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{`1. Récupérer premier et dernier TourStop
2. Si stop.city manquant → reverseGeocode(lat, lng) via Google API
3. Calculer distance route via calculateDrivingDistance(start, end)
   └─ Fallback: distance Haversine si Google Maps indisponible
4. Filtrer si distance < 0.5 km (trajet trop court)
5. Créer Trip avec :
   ├─ startLocation / endLocation (nom = ville géocodée)
   ├─ distance = distance route (simple trajet, pas aller-retour)
   ├─ roundTrip = false
   ├─ purpose = "Tournée"
   ├─ tourStops = TourStopData[] (toutes les étapes intermédiaires)
   ├─ ikAmount = calculé via calculateIK(distance, annualKm, fiscalPower)
   └─ status = "validated"
6. Sauvegarder dans Supabase (table trips, colonne tour_stops = JSON)
7. Enregistrer dans localStorage "LAST_SAVED_TRIP" (notification "Dernier trajet enregistré")
8. Nettoyer localStorage tournée (clearTourStorage)`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ArchBox({ icon, label, sub, color }: { icon: React.ReactNode; label: string; sub: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 ${color}`}>
      {icon}
      <div className="text-left">
        <div className="font-semibold text-sm text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
