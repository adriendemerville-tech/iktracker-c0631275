import { Globe, Layers, Server } from "lucide-react";

// ─── Architecture Diagram (Mermaid-style text for display) ───

export const ARCHITECTURE_SECTIONS = [
  {
    title: "Stack Technique",
    icon: <Layers className="w-5 h-5" />,
    items: [
      { label: "Frontend", value: "React 18 + TypeScript + Vite 5", badge: "SPA" },
      {
        label: "UI Framework",
        value: "Tailwind CSS 3 + shadcn/ui (Radix)",
        badge: "Design System",
      },
      { label: "State / Cache", value: "TanStack React Query v5", badge: "Cache" },
      { label: "Routing", value: "React Router DOM v6", badge: "SPA" },
      { label: "Animations", value: "Framer Motion", badge: "UX" },
      { label: "Charts", value: "Recharts", badge: "Data Viz" },
      { label: "PWA", value: "vite-plugin-pwa + Service Worker", badge: "Offline" },
    ],
  },
  {
    title: "Backend (Lovable Cloud / Supabase)",
    icon: <Server className="w-5 h-5" />,
    items: [
      { label: "Base de données", value: "PostgreSQL 15 avec RLS activé", badge: "SQL" },
      { label: "Auth", value: "Supabase Auth (email/password, OAuth Google)", badge: "Auth" },
      {
        label: "Edge Functions",
        value: "Deno runtime (11 fonctions déployées)",
        badge: "Serverless",
      },
      {
        label: "Storage",
        value: "Supabase Storage (feedback, blog, survey-screenshots)",
        badge: "S3-like",
      },
      { label: "Realtime", value: "Supabase Realtime (presence admin)", badge: "WebSocket" },
      { label: "RPC", value: "25+ fonctions SQL (stats, search, coûts, etc.)", badge: "SQL" },
    ],
  },
  {
    title: "APIs Externes",
    icon: <Globe className="w-5 h-5" />,
    items: [
      { label: "Google Maps", value: "Distance Matrix + Geocoding + Places", badge: "Géo" },
      { label: "Google Calendar", value: "OAuth2 + Calendar Events API", badge: "Sync" },
      { label: "Microsoft Outlook", value: "OAuth2 + Microsoft Graph API", badge: "Sync" },
      { label: "Google Analytics", value: "GA4 via react-ga4", badge: "Analytics" },
    ],
  },
];

export const DB_TABLES = [
  {
    name: "trips",
    desc: "Trajets IK (distance, montant IK, tour_stops JSON)",
    rows: "Principale",
    rls: true,
  },
  {
    name: "vehicles",
    desc: "Véhicules (puissance fiscale, électrique, plaque)",
    rows: "Principale",
    rls: true,
  },
  {
    name: "locations",
    desc: "Adresses enregistrées (lat/lng, type)",
    rows: "Principale",
    rls: true,
  },
  {
    name: "user_preferences",
    desc: "Préférences utilisateur (persona, email comptable)",
    rows: "Config",
    rls: true,
  },
  {
    name: "user_roles",
    desc: "Rôles (admin/user/viewer) — table séparée sécurisée",
    rows: "Sécurité",
    rls: true,
  },
  {
    name: "tour_sessions",
    desc: "Sessions tournée GPS actives (stops, gps_points, pending_stop)",
    rows: "Tournée",
    rls: true,
  },
  {
    name: "calendar_connections",
    desc: "Connexions OAuth calendrier (tokens chiffrés)",
    rows: "Sync",
    rls: true,
  },
  {
    name: "distance_cache",
    desc: "Cache distances Google Maps par paire d'adresses",
    rows: "Perf",
    rls: true,
  },
  {
    name: "frequent_destinations",
    desc: "Destinations fréquentes (keyword → address)",
    rows: "UX",
    rls: true,
  },
  {
    name: "feedback",
    desc: "Retours utilisateurs (message, image, réponse admin)",
    rows: "Support",
    rls: true,
  },
  {
    name: "blog_posts",
    desc: "Articles blog (slug, content, status draft/published/archived)",
    rows: "CMS",
    rls: true,
  },
  { name: "blog_api_keys", desc: "Clés API blog pour accès externe", rows: "CMS", rls: true },
  {
    name: "page_contents",
    desc: "Contenus éditables des pages (JSON, meta SEO)",
    rows: "CMS",
    rls: true,
  },
  {
    name: "surveys",
    desc: "Enquêtes (ciblage, durée, personas, A/B testing)",
    rows: "Surveys",
    rls: true,
  },
  {
    name: "survey_variants",
    desc: "Variantes A/B des enquêtes (content_blocks JSON)",
    rows: "Surveys",
    rls: true,
  },
  {
    name: "survey_responses",
    desc: "Réponses aux enquêtes (responses JSON, screenshots)",
    rows: "Surveys",
    rls: true,
  },
  {
    name: "survey_impressions",
    desc: "Impressions/affichages des enquêtes par utilisateur",
    rows: "Surveys",
    rls: true,
  },
  {
    name: "marketing_analytics",
    desc: "Tracking pages marketing (event, device, referrer, IP)",
    rows: "Analytics",
    rls: true,
  },
  {
    name: "report_shares",
    desc: "Relevés PDF partagés temporairement (expire 7j)",
    rows: "Export",
    rls: true,
  },
  {
    name: "share_events",
    desc: "Événements de partage (total_km, total_ik)",
    rows: "Analytics",
    rls: true,
  },
  {
    name: "download_clicks",
    desc: "Clicks sur bouton téléchargement",
    rows: "Analytics",
    rls: true,
  },
  {
    name: "api_usage_logs",
    desc: "Logs coût API (tokens, modèle, coût €)",
    rows: "Monitoring",
    rls: true,
  },
  {
    name: "api_audit_logs",
    desc: "Audit trail API blog (action, données avant/après, revert)",
    rows: "Monitoring",
    rls: true,
  },
  {
    name: "error_logs",
    desc: "Logs d'erreurs applicatives (type, source, metadata)",
    rows: "Monitoring",
    rls: true,
  },
  { name: "excluded_ips", desc: "IPs exclues des analytics marketing", rows: "Config", rls: true },
  {
    name: "takeout_import_attempts",
    desc: "Tentatives import Google Takeout",
    rows: "Import",
    rls: true,
  },
];

export const EDGE_FUNCTIONS = [
  {
    name: "blog-api",
    desc: "API REST CRUD pour les articles de blog",
    method: "GET/POST/PUT/DELETE",
  },
  { name: "calendar-debug", desc: "Debug des connexions calendrier OAuth", method: "POST" },
  { name: "convert-blog-images", desc: "Conversion images blog en WebP optimisé", method: "POST" },
  {
    name: "google-calendar-auth",
    desc: "OAuth2 flow Google Calendar (code → tokens)",
    method: "GET/POST",
  },
  {
    name: "outlook-calendar-auth",
    desc: "OAuth2 flow Microsoft Outlook (Graph API)",
    method: "GET/POST",
  },
  {
    name: "parse-takeout",
    desc: "Parsing fichiers Google Takeout (historique positions)",
    method: "POST",
  },
  { name: "recalculate-distances", desc: "Recalcul distances via Google Maps API", method: "POST" },
  { name: "sitemap", desc: "Génération dynamique sitemap.xml (pages + blog)", method: "GET" },
  {
    name: "sync-calendar-trips",
    desc: "Synchronisation événements calendrier → trajets",
    method: "POST",
  },
  { name: "vehicle-lookup", desc: "Lookup véhicule par plaque d'immatriculation", method: "POST" },
  { name: "view-report", desc: "Affichage relevé IK partagé temporairement", method: "GET" },
];

export const SECURITY_FEATURES = [
  "Row Level Security (RLS) activé sur toutes les 26 tables",
  "Rôles utilisateurs dans table séparée (admin/user/viewer)",
  "Fonction has_role() en SECURITY DEFINER pour éviter récursion RLS",
  "Fonction has_admin_or_viewer_role() pour accès lecture stats (viewers)",
  "Séparation stricte admin vs viewer : viewers = lecture seule, pas de mutation",
  "Tokens OAuth chiffrés côté serveur (calendar_connections)",
  "Pas de clés privées dans le code client (env vars Deno pour Google Maps, etc.)",
  "Content Security Policy (CSP) via headers Netlify",
  "Politique noindex sur pages admin et sensibles",
  "Validation côté serveur dans les Edge Functions (Deno)",
  "CORS configuré par fonction Edge",
  "Expiration automatique des rapports partagés (7 jours)",
  "Nettoyage automatique des numéros de téléphone après 7 jours (cleanup_old_phone_numbers)",
  "Pas d'exposition de stack traces dans les réponses d'erreur (calendar-debug)",
  "RLS report_shares : accès limité au propriétaire (pas d'énumération publique)",
];

export const IK_BAREME = [
  {
    cv: "3 CV",
    up5000: "0,529 €/km",
    f5001_20000: "(d × 0,316) + 1 065 €",
    over20000: "0,370 €/km",
  },
  {
    cv: "4 CV",
    up5000: "0,606 €/km",
    f5001_20000: "(d × 0,340) + 1 330 €",
    over20000: "0,407 €/km",
  },
  {
    cv: "5 CV",
    up5000: "0,636 €/km",
    f5001_20000: "(d × 0,357) + 1 395 €",
    over20000: "0,427 €/km",
  },
  {
    cv: "6 CV",
    up5000: "0,665 €/km",
    f5001_20000: "(d × 0,374) + 1 457 €",
    over20000: "0,447 €/km",
  },
  {
    cv: "7+ CV",
    up5000: "0,697 €/km",
    f5001_20000: "(d × 0,394) + 1 515 €",
    over20000: "0,470 €/km",
  },
];
