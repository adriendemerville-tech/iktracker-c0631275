// AUTO-GÉNÉRÉ par scripts/generate-linkedin-docs-context.cjs — ne pas éditer à la main.
// Source : docs/BACKEND.md + docs/FRONTEND.md (2026-07-30).
// Relancer le script après toute évolution majeure de la doc technique.

export type DocSection = {
  origin: "backend" | "frontend";
  heading: string;
  body: string;
};

export const DOC_SECTIONS: DocSection[] = [
  {
    "origin": "backend",
    "heading": "Table des matières",
    "body": "1. [Architecture globale](#1-architecture-globale)\n2. [Base de données](#2-base-de-données)\n3. [Edge Functions](#3-edge-functions)\n4. [Authentification & Rôles](#4-authentification--rôles)\n5. [SEO & Bot-routing](#5-seo--bot-routing)\n6. [Intégrations externes](#6-intégrations-externes)\n7. [Monitoring & Coûts](#7-monitoring--coûts)\n8. [Partner API & SSO](#8-partner-api--sso)\n\n---"
  },
  {
    "origin": "backend",
    "heading": "Hébergement",
    "body": "Composant   Service   Détail  \n --- --- --- \n  Frontend   Lovable Publish   SPA React déployée automatiquement  \n  Backend   Lovable Cloud (Supabase)   PostgreSQL + Edge Functions (Deno)  \n  DNS & Edge   Cloudflare   Proxy, Workers, SSL (mode Full)  \n  Domaine canonique   **iktracker.fr** (apex)   Hôte SEO/GEO — Worker Cloudflare actif, pre-rendering bots  \n  Sous-domaine www   www.iktracker.fr   301 → apex via Cloudflare Redirect Rule  \n  Domaine secondaire   iktracker.com / www.iktracker.com   301 → apex via Worker"
  },
  {
    "origin": "backend",
    "heading": "Domaines & Redirections",
    "body": "- Hôte canonique : **iktracker.fr** (apex) — canonicals, og:url, sitemap, JSON-LD, robots pointent tous vers l'apex.\n- `www.iktracker.fr` → 301 → `https://iktracker.fr` (Cloudflare Redirect Rule + fallback Worker).\n- `iktracker.com` / `www.iktracker.com` → 301 → `https://iktracker.fr` via Worker.\n- Exception : `/robots.txt` et `/llms.txt` sur .com sont servis par proxy depuis iktracker.fr.\n- **Redirections legacy 301** (map `LEGACY_REDIRECTS` dans le Worker) : `/install → /installer`, `/mestrajets → /mes-trajets`, `/experts-comptables → /expert-comptable`, `/nos-offres → /tarifs`, `/simulateur → /bareme-ik-2026`, `/guide-complet-indemnites-kilometriques-frais-reels → /blog/indemnites-kilometriques-2026-guide-complet`, `/fonctionnalites/suivi-kilometrique-automatique → /mode-tournee`, etc. Ajouter une entrée = éditer la map puis `wrangler deploy`.\n\n---"
  },
  {
    "origin": "backend",
    "heading": "Données utilisateur",
    "body": "Table   Description   RLS  \n --- --- --- \n  `trips`   Trajets enregistrés (distance, IK, date, véhicule)   ✅ user_id  \n  `vehicles`   Véhicules de l'utilisateur (CV fiscaux, plaque)   ✅ user_id  \n  `locations`   Adresses enregistrées (domicile, travail)   ✅ user_id  \n  `frequent_destinations`   Destinations fréquentes (mot-clé → adresse)   ✅ user_id  \n  `distance_cache`   Cache des distances calculées   ✅ user_id  \n  `user_preferences`   Préférences (persona, comptable, visites, didacticiel terminé, `calendar_import_mode` : `individual` ou `tour`, `ik_rate_override` : `auto` \\  `tier2` \\  `tier3` pour figer le taux IK)   ✅ user_id  \n  `tour_sessions`   Sessions de tournée GPS en cours (+ compteurs reprise)   ✅ user_id  \n  `tour_recovery_events`   Journal des événements de reprise de tournée (modal, auto-finalize, erreurs, toasts)   ✅ user_id + admin/viewer"
  },
  {
    "origin": "backend",
    "heading": "Calendrier",
    "body": "Table   Description   RLS  \n --- --- --- \n  `calendar_connections`   Connexions Google/Outlook Calendar (tokens OAuth)   ✅ user_id  \n  `calendar_connection_attempts`   Journal des tentatives de connexion/synchronisation calendrier (Google, Outlook, ICS)   ✅ user_id + admin"
  },
  {
    "origin": "backend",
    "heading": "Partage & Export",
    "body": "Table   Description   RLS  \n --- --- --- \n  `share_events`   Événements de partage de rapport   ✅ user_id  \n  `report_shares`   Rapports HTML partagés (liens temporaires)   ✅ via Edge Function  \n  `download_clicks`   Clics sur le bouton télécharger   ✅ user_id"
  },
  {
    "origin": "backend",
    "heading": "Blog & CMS",
    "body": "Table   Description   RLS  \n --- --- --- \n  `blog_posts`   Articles de blog (titre, slug, contenu, statut)   ✅ lecture publique, écriture admin  \n  `blog_api_keys`   Clés API pour le CMS headless (avec quota mensuel : `monthly_quota`, `usage_current_month`, `usage_reset_at`)   ✅ admin  \n  `page_contents`   Contenu dynamique des pages marketing   ✅ lecture publique"
  },
  {
    "origin": "backend",
    "heading": "Admin & Analytics",
    "body": "Table   Description   RLS  \n --- --- --- \n  `user_roles`   Rôles (admin, viewer, user)   ✅ admin  \n  `marketing_analytics`   Événements analytics (page_view, cta_click, etc.)   ✅ insert public, lecture admin  \n  `request_logs`   Logs de requêtes HTTP (via Worker)   ✅ admin  \n  `api_usage_logs`   Logs d'utilisation des APIs (coûts, tokens)   ✅ admin  \n  `api_access_logs`   Logs d'accès à l'API blog   ✅ admin  \n  `api_audit_logs`   Audit trail des modifications API   ✅ admin  \n  `error_logs`   Erreurs applicatives   ✅ admin  \n  `autopilot_events`   Événements autopilote (monitoring)   ✅ admin  \n  `excluded_ips`   IPs exclues des analytics   ✅ admin  \n  `feedback`   Messages de feedback utilisateur   ✅ user_id  \n  `referral_sources`   Sources de découverte (questionnaire)   ✅ user_id"
  },
  {
    "origin": "backend",
    "heading": "SEO & Config",
    "body": "Table   Description   RLS  \n --- --- --- \n  `site_config`   Configuration globale du site (JSON)   ✅ admin  \n  `site_seo_config`   Config SEO (robots.txt, llms.txt dynamiques)   ✅ admin  \n  `seo_redirects`   Redirections SEO configurables   ✅ lecture publique  \n  `code_injections`   Injections de code (tracking, scripts)   ✅ admin"
  },
  {
    "origin": "backend",
    "heading": "Affiliation & Surveys",
    "body": "Table   Description   RLS  \n --- --- --- \n  `affiliate_codes`   Codes d'affiliation   ✅ admin  \n  `affiliate_uses`   Utilisations de codes   ✅ admin  \n  `surveys`   Sondages in-app   ✅ admin  \n  `survey_variants`   Variantes A/B des sondages   ✅ admin  \n  `survey_responses`   Réponses aux sondages   ✅ user_id  \n  `survey_impressions`   Impressions des sondages   ✅ user_id"
  },
  {
    "origin": "backend",
    "heading": "Divers",
    "body": "Table   Description   RLS  \n --- --- --- \n  `vehicle_cache`   Cache des données véhicule (plaque → marque/modèle)   ✅ authenticated only  \n  `takeout_import_attempts`   Tentatives d'import Google Takeout   ✅ user_id"
  },
  {
    "origin": "backend",
    "heading": "Partenaires & SSO (intégrations B2B)",
    "body": "Table   Description   RLS  \n --- --- --- \n  `partner_api_keys`   Clés API partenaires (hash + JWT secret + scopes + quota mensuel). **Colonnes sensibles `jwt_secret`/`key_hash` réservées admin** (column-level GRANT).   ✅ admin (full) / viewer (colonnes safe uniquement)  \n  `partner_api_keys_safe` *(vue)*   Projection sans secrets (`jwt_secret`, `key_hash` exclus). À utiliser depuis le frontend pour les viewers.   ✅ authenticated  \n  `partner_users`   Mapping `external_user_id` (partenaire) → `iktracker_user_id`   ✅ admin  \n  `partner_request_logs`   Logs des appels Partner API (path, status, temps, partenaire)   ✅ admin  \n  `partner_webhooks`   Webhooks sortants partenaires (URL, secret HMAC, événements)   ✅ admin"
  },
  {
    "origin": "backend",
    "heading": "Fonctions d'accès aux rôles",
    "body": "Fonction   Description  \n --- --- \n  `has_role(_user_id, _role)`   Vérifie si un user a un rôle (SECURITY DEFINER)  \n  `has_admin_or_viewer_role(_user_id)`   Vérifie admin OU viewer"
  },
  {
    "origin": "backend",
    "heading": "Fonctions admin — Statistiques",
    "body": "Fonction   Description  \n --- --- \n  `get_admin_stats(start_date, end_date)`   Stats globales (users, trips, km, IK)  \n  `get_monthly_stats(months_back)`   Stats mensuelles  \n  `get_daily_active_users(days_back)`   DAU par jour  \n  `get_rolling_active_users(days_back, window_size)`   Utilisateurs actifs glissants  \n  `get_registrations_by_day(days_back)`   Inscriptions par jour  \n  `get_top_users(sort_by, limit_count)`   Top users par trips/km/IK  \n  `get_user_stats(_user_id)`   Stats détaillées d'un utilisateur  \n  `search_users(search_term, limit_count)`   Recherche d'utilisateurs  \n  `get_recent_signups(limit_count)`   Dernières inscriptions  \n  `get_total_tours_count(start_date, end_date)`   Nombre total de tournées  \n  `get_tour_mode_stats(days_back)`   Compteurs Mode Tournée (totales, manuel/auto, abandonnées, moyennes, uniques 7j)  \n  `get_tour_mode_daily(days_back)`   Série journalière : tournées créées + utilisateurs uniques 7j glissants  \n  `get_tour_mode_personas(days_back)`   Répartition par persona des utilisateurs Mode Tournée"
  },
  {
    "origin": "backend",
    "heading": "Fonctions admin — Marketing & Coûts",
    "body": "Fonction   Description  \n --- --- \n  `get_marketing_stats(days_back)`   Stats marketing (vues, CTA, simulations)  \n  `get_marketing_stats_by_page(days_back)`   Stats par page  \n  `get_signup_funnel(days_back)`   Funnel signup (vues → OAuth/form → erreurs → comptes créés) + répartition par provider et top erreurs. Admin/viewer uniquement. Filtre symétrique : vues ET `new_users` excluent admins + IPs de `excluded_ips` (via events liés à `auth.users.id`).  \n  `get_marketing_views_by_day(days_back)`   Vues marketing par jour  \n  `get_signup_clicks_by_day(start, end)`   Clics signup par jour  \n  `get_bareme_simulations_by_day(days_back)`   Simulations barème par jour  \n  `get_download_stats()`   Stats de téléchargement  \n  `get_download_clicks_by_day(days_back)`   Téléchargements par jour  \n  `get_share_stats()`   Stats de partage  \n  `get_shares_by_day(days_back)`   Partages par jour  \n  `get_takeout_import_stats()`   Stats d'import Takeout  \n  `get_api_cost_stats(days_back)`   Coûts API globaux  \n  `get_api_cost_by_day(days_back)`   Coûts API par jour  \n  `get_api_cost_by_function(days_back)`   Coûts par fonction  \n  `get_api_cost_by_model(days_back)`   Coûts par modèle IA"
  },
  {
    "origin": "backend",
    "heading": "Fonctions utilitaires",
    "body": "Fonction   Description  \n --- --- \n  `cleanup_expired_shares()`   Supprime les rapports expirés  \n  `cleanup_old_phone_numbers()`   Anonymise les téléphones > 7 jours  \n  `update_updated_at_column()`   Trigger pour auto-update updated_at  \n\n---"
  },
  {
    "origin": "backend",
    "heading": "Volumétrie globale (avril 2026)",
    "body": "Périmètre   Lignes  \n --- --- \n  **Backend total**   **~13 300**  \n  ├─ Edge Functions (`supabase/functions/`)   7 103  \n  └─ Migrations SQL (`supabase/migrations/`)   6 204  \n  Cloudflare Worker + scripts (`scripts/`, `cloudflare-worker/`)   459  \n  Frontend (`src/`, à titre de comparaison)   54 512  \n\nLe backend pèse ≈ 20 % du codebase total (~68 k lignes)."
  },
  {
    "origin": "backend",
    "heading": "Vue d'ensemble (18 fonctions)",
    "body": "Fonction   Lignes   Auth   Méthode   Rôle  \n --- --- --- --- --- \n  `partner-api`   1 002   API Key partenaire (+ JWT signé pour SSO)   GET/POST   API B2B (vehicle, IK, trips, stats, SSO)  \n  `blog-api`   902   API Key   GET/POST/PUT/DELETE   CMS headless CRUD (+ blacklist + corbeille)  \n  `meta-renderer`   826   Non   GET   Pré-rendu HTML pour bots & moteurs IA  \n  `sync-calendar-trips`   705   JWT   POST   Synchronisation calendrier → trajets  \n  `docs`   668   JWT (admin/viewer)   GET   Documentation backend (markdown/HTML)  \n  `parse-takeout`   496   JWT   POST   Import Google Takeout  \n  `calendar-debug`   495   JWT   GET/POST   Debug des connexions calendrier  \n  `vehicle-lookup`   421   JWT   POST   Recherche véhicule par plaque  \n  `view-report`   387   Non   GET   Affichage rapport partagé  \n  `recalculate-distances`   374   JWT   POST   Recalcul des distances via Google Maps  \n  `google-calendar-auth`   196   Non   GET   OAuth Google Calendar  \n  `outlook-calendar-auth`   173   Non   GET   OAuth Outlook Calendar  \n  `convert-blog-images`   172   JWT (admin)   POST   Conversion d'images blog  \n  `sitemap`   138   Non   GET   Génération sitemap XML dynamique  \n  `wavespeed`   ~150   JWT (**admin uniquement**)   ANY   Proxy générique Wavespeed.ai (crédits projet — accès strictement réservé)  \n  `track-event`   ~120   Public (JWT optionnel)   POST   Ingestion `marketing_analytics` avec IP capturée server-side (headers CF), filtre bots + admins. CORS restreint à `iktracker.fr`, `lovable.app`, `lovableproject.com`. Cron `purge-marketing-analytics-daily` (03:15 UTC) supp"
  },
  {
    "origin": "backend",
    "heading": "`docs` — Documentation backend",
    "body": "- **Auth** : JWT utilisateur + rôle `admin` ou `viewer`\n- **Endpoint** : `GET ?format=markdown html`\n- **Logique** : Sert le contenu de `docs/BACKEND.md` en Markdown brut ou converti en HTML\n- **Formats** : `markdown` (défaut) retourne le fichier brut, `html` retourne une page HTML stylisée\n- **Secrets** : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`"
  },
  {
    "origin": "backend",
    "heading": "`blog-api` — CMS Headless",
    "body": "- **Auth** : Clé API via header `x-api-key` (validée contre `blog_api_keys`)\n- **Endpoints** :\n  - `GET /posts` — Liste des articles publiés uniquement (défaut). Params : `status=published draft archived deleted all`, `all=true` (alias de `status=all` — inclut la corbeille), `limit`, `offset`\n  - `GET /posts/:slug` — Lire un article publié (404 si non publié)\n  - `POST /posts` — Créer ou mettre à jour un article (upsert par slug). Refus 409 si slug en corbeille (`slug_in_trash`) ou en blacklist (`slug_blacklisted`). Body : `title*, slug*, content, status (draft published archived), force` (booléen pour écraser un slug existant)\n  - `PUT /posts/:slug` — Modifier un article. Pour **archiver** : `status=archived`. Pour **restaurer** depuis la corbeille ou les archives : `status=published` (ou `draft`)\n  - `DELETE /posts/:slug` — **Soft-delete** par défaut : passe `status='deleted'` et `deleted_at=now()`. Réversible via `PUT`\n  - `DELETE /posts/:slug?hard=true` — **Purge définitive** (irréversible, à utiliser avec prudence)\n  - `GET /pages/:key` — Lire le contenu d'une page\n  - `PUT /pages/:key` — Modifier le contenu d'une page (voir clés dynamiques ci-dessous)\n- **Statuts d'article** : `draft` (brouillon), `published` (visible publiquement), `archived` (masqué de la liste mais conservé), `deleted` (corbeille — masqué partout, restaurable)\n- **Secrets** : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`\n- **Audit** : Chaque modification est enregistrée dans `api_audit_logs` (actions : `create`, `update`, `soft_delete`, `purge`, `blocked`)\n\n##### Clés dynamiques `page_contents` — Pag"
  },
  {
    "origin": "backend",
    "heading": "`meta-renderer` — Pré-rendu SEO/GEO",
    "body": "- **Auth** : Aucune (appelé par le Worker Cloudflare)\n- **Endpoint** : `GET ?path=/chemin`\n- **Logique** : Génère un HTML complet avec contenu statique, JSON-LD, Open Graph\n- **Pages supportées** : ~20 pages marketing + tous les articles de blog\n- **Extracteurs blog SSR** (mirror de `src/lib/blog-schema-extractors.ts`) :\n  - `FAQPage` JSON-LD auto-extrait depuis `## Questions fréquentes` / `## FAQ` (Q en H3 ou **gras**, R en dessous)\n  - `HowTo` JSON-LD auto-extrait depuis `## Étapes` / `## Procédure` / `## Déroulé` (liste numérotée ou H3)\n  - `Article.author` enrichi en `Person` avec `sameAs` (LinkedIn + page fondateur) lorsqu'il s'agit de \"Rédaction IKtracker\" → résolu vers Adrien de Volontat\n  - `BreadcrumbList` JSON-LD injecté côté serveur\n  - Version texte du CTA segmenté (Salarié/Particulier vs Commercial/Libéral) rendue pour les bots qui n'exécutent pas JS (GPTBot, PerplexityBot, ClaudeBot)\n- **Secrets** : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`"
  },
  {
    "origin": "backend",
    "heading": "`sync-calendar-trips` — Synchronisation calendrier",
    "body": "- **Auth** : JWT utilisateur OU header `x-cron-secret: $SYNC_CRON_TOKEN` (cron horaire via `pg_cron` + `pg_net`)\n- **Endpoint** : `POST` avec body `{ connectionId, syncDays }` (ou aucun body en mode cron → sync de toutes les connexions actives)\n- **Sources supportées** :\n  - `google` : OAuth Google Calendar API (refresh token stocké dans `calendar_connections`)\n  - `outlook` : OAuth Microsoft Graph\n  - `ics` : lien public ICS (Outlook perso/pro sans OAuth, Apple Calendar, tout fournisseur exposant un `.ics`). L'URL est stockée dans `calendar_connections.ics_url`. La fonction fetch le flux, parse les blocs `VEVENT` (avec gestion du RFC 5545 line folding, unescape des caractères, expansion des `RRULE` DAILY/WEEKLY/MONTHLY/YEARLY sur la fenêtre `syncDays`) et route chaque événement dans le même pipeline `createTripFromEvent` que Google/Outlook (déduplication par `calendar_event_id`, extraction d'adresse, calcul de distance, statut `pending_location` si aucune adresse détectable).\n- **Logique** : Lit les événements, extrait les adresses, calcule les distances, crée les trajets (`source = google_calendar`   `outlook_calendar` selon la connexion). Deux modes d'import pilotés par `user_preferences.calendar_import_mode` :\n  - `individual` (défaut) : 1 événement calendrier = 1 trajet aller-retour depuis le domicile.\n  - `tour` : tous les rendez-vous d'une même journée (≥ 2 avec adresse résolue) sont regroupés en une seule tournée `domicile → RDV₁ → … → RDV_N → domicile` — 1 seul `trip` avec `tour_stops` JSON, distance = somme des segments Distance Matrix, IK calculé une fois via le "
  },
  {
    "origin": "backend",
    "heading": "`vehicle-lookup` — Recherche par plaque",
    "body": "- **Auth** : JWT utilisateur\n- **Endpoint** : `POST` avec body `{ licensePlate }`\n- **Sources** : DrivePieces API, Earlweb API (fallback)\n- **Cache** : Résultats stockés dans `vehicle_cache`\n- **Secrets** : `IMMATRICULATION_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`"
  },
  {
    "origin": "backend",
    "heading": "`sitemap` — Sitemap XML dynamique",
    "body": "- **Auth** : Aucune\n- **Endpoint** : `GET`\n- **Logique** : 18 pages statiques + articles blog (paginated)\n- **Cache** : `max-age=300` (5 minutes)\n- **Proxy** : Servi via le Worker Cloudflare sur `/sitemap.xml`"
  },
  {
    "origin": "backend",
    "heading": "`view-report` — Rapports partagés",
    "body": "- **Auth** : Aucune (accès par UUID)\n- **Endpoint** : `GET ?id=uuid`\n- **Logique** : Lit `report_shares` via service role, incrémente le compteur d'accès\n- **Sécurité** : Proxy via Edge Function pour éviter l'énumération directe de la table\n- **Rendu public** : un accès navigateur direct à `/functions/v1/view-report?id=...` redirige vers `https://iktracker.fr/temporaryreport/:id`, qui réutilise le conteneur de preview existant. Le HTML brut est réservé au fetch interne avec `raw=1`."
  },
  {
    "origin": "backend",
    "heading": "`google-calendar-auth` / `outlook-calendar-auth` — OAuth",
    "body": "- **Auth** : Aucune (callbacks OAuth)\n- **Logique** : Échange le code OAuth contre un token, stocke dans `calendar_connections`\n- **Observabilité** : Chaque callback OAuth (succès ou échec) est journalisé dans `calendar_connection_attempts` avec le provider (`google`/`outlook`), le statut et le message d'erreur éventuel.\n- **Sécurité** : Validation des redirect URLs contre une whitelist\n- **Secrets** : `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`"
  },
  {
    "origin": "backend",
    "heading": "`marina-analyze` — Analyse IA",
    "body": "- **Auth** : JWT utilisateur\n- **Endpoint** : `POST` (soumettre un document), `GET ?job_id=` (poll le statut)\n- **Secrets** : `MARINA_API_KEY`"
  },
  {
    "origin": "backend",
    "heading": "`linkedin-profile` — Profil LinkedIn vérifié (E-E-A-T)",
    "body": "- **Auth** : Publique (`verify_jwt = false`) — servi à la page `/blog/auteur/adrien-de-volontat`\n- **Endpoint** : `GET` — renvoie `{ name, given_name, family_name, picture, locale, verified, profile_url }`\n- **Gateway** : `https://connector-gateway.lovable.dev/linkedin/v2/userinfo`\n- **Secrets** : `LOVABLE_API_KEY`, `LINKEDIN_API_KEY`\n- **Cache** : `Cache-Control: public, max-age=3600, s-maxage=3600`"
  },
  {
    "origin": "backend",
    "heading": "`linkedin-weekly-post` — Publication LinkedIn automatisée (mensuelle)",
    "body": "> Nom historique conservé pour ne pas casser l'URL invoke ; le rythme est **mensuel** depuis juillet 2026.\n\n- **Auth** : En-tête `x-cron-secret` (CRON_SECRET ou SYNC_CRON_TOKEN) ou JWT admin (`has_role(user, 'admin')`)\n- **Cron** : job `linkedin-monthly-post`, planification `0 7 1-7 * *` + garde SQL `extract(dow) = 3` → strictement le 1<sup>er</sup> mercredi du mois, 07:00 UTC. (L'ancienne expression `0 7 1-7 * 3` déclenchait chaque mercredi, `pg_cron` faisant un OU entre jour-du-mois et jour-de-semaine.)\n- **Rotation** : 13 topics étiquetés par `format` (`video` / `carousel`) et par `mediaSource` (`browserless` / `wavespeed`). Sélection : `(année × 12 + mois) mod N`.\n- **Précision éditoriale** : chaque topic possède une entrée dans `TOPIC_FACTS` (faits techniques : seuils, logique métier, personas, scénarios). Ces faits sont injectés dans le prompt pour forcer une description concrète d'une fonctionnalité réelle plutôt qu'un discours marketing.\n- **Ancrage sur la documentation technique** : `supabase/functions/linkedin-weekly-post/docs-context.ts` est **généré** depuis `docs/BACKEND.md` + `docs/FRONTEND.md` par `scripts/generate-linkedin-docs-context.cjs` (108 sections, blocs de code retirés, 1 600 signes max par section). À l'exécution, `docContextForTopic()` sélectionne les 4 sections les plus pertinentes par score de mots-clés (titre pondéré ×3, table `DOC_KEYWORDS` par slug) et les injecte, plafonnées à 4 500 signes, dans le prompt texte et dans le prompt de plan de carrousel (2 500 signes). Le prompt interdit explicitement de citer des noms de tables, de fonctions ou "
  },
  {
    "origin": "backend",
    "heading": "`linkedin-post-audit` — Boucle qualité post-publication",
    "body": "Seconde fonction de la boucle d'automatisation : elle relit le post **réellement publié** environ 5 minutes après sa mise en ligne et le corrige s'il ne respecte pas les règles de rédaction.\n\n- **Auth** : `x-cron-secret` (CRON_SECRET / SYNC_CRON_TOKEN) ou JWT admin.\n- **Cron** : job `linkedin-post-audit-5min`, planification `*/5 * * * *`. Chaque exécution traite au plus un post : le dernier run `success` publié il y a plus de 5 min, moins de 24 h, avec `audit_status IS NULL`.\n- **Lecture du post** : `GET /rest/posts/{urn}` (repli `GET /v2/ugcPosts/{urn}`), repli final sur `post_text` journalisé. Engagement précoce lu via `/v2/socialActions/{urn}` (réactions + commentaires — les impressions brutes ne sont exposées que pour les pages entreprise, l'engagement sert de proxy).\n- **Contrôles déterministes** (`runDeterministicChecks`) : longueur 1000–1500 signes, caractères interdits, tirets d'incise, aération (≥ 6 paragraphes, aucun > 300 signes), hook isolé ≤ 220 signes.\n- **Audit LLM** : Mistral (Wavespeed) avec fallback Gemini 2.5 Flash, sortie JSON stricte `{ hook_score, impressions_score, content_score, verdict, issues[], hook_analysis, improved_text }`. Le prompt met la priorité sur le **hook** (première ligne autoportante, factuelle, sans question rhétorique) et le **potentiel d'impressions** (3 premières lignes avant la coupure « voir plus », pas de lien ni de hashtag en tête, aération forte).\n- **Score composite /100** (`computeCompositeScore`, calculé côté serveur, jamais par le LLM) : 40 pts déterministes — longueur 10, caractères interdits + tirets 10, aération 10, fo"
  },
  {
    "origin": "backend",
    "heading": "`gsc-analytics` — Google Search Console",
    "body": "- **Auth** : JWT utilisateur + rôle `admin`/`viewer`\n- **Actions** : `sites`, `summary`, `query` (dimensions/days/rowLimit configurables)\n- **Gateway** : `https://connector-gateway.lovable.dev/google_search_console`\n- **Secrets** : `LOVABLE_API_KEY`, `GOOGLE_SEARCH_CONSOLE_API_KEY`"
  },
  {
    "origin": "backend",
    "heading": "Configuration (supabase/config.toml)",
    "body": "Toutes les Edge Functions utilisent `verify_jwt = false` — la validation JWT est faite dans le code de chaque fonction.\n\n---"
  },
  {
    "origin": "backend",
    "heading": "Flow d'authentification",
    "body": "1. **Signup** : Email + mot de passe (confirmation email requise)\n2. **Login** : Email/mot de passe ou Google OAuth\n3. **Session** : JWT géré par le client Supabase (`supabase.auth`)"
  },
  {
    "origin": "backend",
    "heading": "Scopes OAuth au sign-in",
    "body": "Lors de l'inscription/connexion via un provider OAuth, les scopes calendrier sont demandés dès le premier sign-in :\n\n  Provider   Scopes demandés  \n --- --- \n  Google   `https://www.googleapis.com/auth/calendar.readonly`  \n  Azure (Microsoft)   `email offline_access Calendars.Read`  \n\nLe token obtenu est automatiquement stocké dans `calendar_connections` avec `is_active = true`. L'utilisateur peut ensuite désactiver la synchronisation (`is_active = false`) sans perdre sa session d'authentification — seul le flux de données calendrier est interrompu."
  },
  {
    "origin": "backend",
    "heading": "Rôles",
    "body": "Rôle   Enum   Accès  \n --- --- --- \n  `admin`   `app_role`   Accès complet (stats, users, config, blog)  \n  `viewer`   `app_role`   Lecture des stats admin uniquement  \n  `user`   `app_role`   Accès à ses propres données"
  },
  {
    "origin": "backend",
    "heading": "Cloudflare Worker (`iktracker-bot-router`)",
    "body": "**Rôle** : Intercepte toutes les requêtes sur iktracker.fr et route en fonction du contexte.\n\n**User-Agents détectés** (30+) :\n- Moteurs de recherche : Googlebot, Bingbot, Yandex, DuckDuckBot, Applebot\n- Réseaux sociaux : Facebook, Twitter, LinkedIn, WhatsApp, Telegram, Discord, Pinterest\n- IA : GPTBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Amazonbot\n- Audit : crawlers.fr, Screaming Frog, Ahrefs, Semrush\n\n**Logique de routage** :\n1. `www.iktracker.fr` / `www.iktracker.com` / `iktracker.com` → 301 → apex `iktracker.fr` (sauf robots.txt/llms.txt proxiés depuis .com)\n2. Slug présent dans `LEGACY_REDIRECTS` → 301 vers slug moderne\n3. `/sitemap.xml` → Proxy vers Edge Function (fallback fichier statique)\n4. Assets statiques → Passthrough + cache headers\n5. Routes privées (`/app/*`, `/auth`, `/sso`, etc.) → Passthrough\n6. Bot détecté → Edge Function `meta-renderer`\n7. Utilisateur normal → Origin SPA\n\n**Headers de diagnostic** :\n- `X-Rendered-By: cloudflare-worker`\n- `X-Sitemap-Source: edge-function   static-fallback   error`\n\n**Déploiement** : le Worker n'est **pas** déployé automatiquement depuis le repo. Utiliser Wrangler :\n\nConfig : `cloudflare-worker/wrangler.toml` (routes multi-zones apex + www, .fr + .com). Voir `cloudflare-worker/README.md` pour l'authentification (`wrangler login`) et le rollback. Ne jamais éditer le Worker dans le dashboard **et** en local en parallèle — le prochain `wrangler deploy` écrase."
  },
  {
    "origin": "backend",
    "heading": "Sitemap (architecture hybride v2)",
    "body": "Source   Rôle   Quand  \n --- --- --- \n  Edge Function `sitemap`   Source primaire dynamique   Chaque requête (cache 5 min)  \n  Cloudflare Worker   Proxy transparent   Intercepte `/sitemap.xml`  \n  `public/sitemap.xml`   Fallback statique   Seulement si Edge Function down  \n  `scripts/generate-sitemap.cjs`   Génère le fallback   Chaque build (prebuild)  \n  `scripts/validate-sitemap-sync.cjs`   Validation CI   Compare les 2 sources  \n\n**Contenu** : ~17 pages statiques + ~45 articles de blog ≈ 62 URLs — toutes en `https://iktracker.fr/*`.\n\n**Priorités & changefreq notables** (alignées entre l'Edge Function et le script statique) :\n- `/` : `priority 1.0`, `weekly`\n- `/meilleure-application-indemnites-kilometriques` : `priority 1.0`, `weekly`\n- `/bareme-ik-2026` : `priority 0.9`, `monthly`\n- `/signup` : `priority 0.5` (utilitaire, dépriorisé)\n- Utilitaires exclus : `/unsubscribe`, `/marina`, `/temporaryreport/*`, `/sso`, `/offline`, `/debug/*`, `/auth`, `/app/*`, `/admin`"
  },
  {
    "origin": "backend",
    "heading": "Meta-renderer",
    "body": "Sert un HTML complet avec :\n- Contenu textuel (paragraphes, features, FAQ, tableaux)\n- JSON-LD (Organization, WebApplication, Article, BreadcrumbList, FAQPage)\n- Open Graph + Twitter Cards\n- Liens internes pour la profondeur de crawl"
  },
  {
    "origin": "backend",
    "heading": "robots.txt",
    "body": "Tous les crawlers IA sont explicitement autorisés (`GPTBot`, `Claude-Web`, `PerplexityBot`, etc.). `/admin` est bloqué explicitement bien que déjà gated côté app, pour éviter tout crawl accidentel.\n\n---"
  },
  {
    "origin": "backend",
    "heading": "Google Calendar",
    "body": "Aspect   Détail  \n --- --- \n  OAuth   Authorization Code Flow  \n  Scopes   `calendar.readonly`, `calendar.events.readonly`  \n  Edge Functions   `google-calendar-auth` (OAuth callback), `sync-calendar-trips` (sync), `calendar-debug` (debug)  \n  Secrets   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`  \n  Données   Tokens stockés dans `calendar_connections`"
  },
  {
    "origin": "backend",
    "heading": "Outlook Calendar",
    "body": "Aspect   Détail  \n --- --- \n  OAuth   Authorization Code Flow (Microsoft Identity Platform)  \n  Scopes   `Calendars.Read`  \n  Edge Function   `outlook-calendar-auth`  \n  Secrets   `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`"
  },
  {
    "origin": "backend",
    "heading": "ICS (lien public)",
    "body": "Aspect   Détail  \n --- --- \n  Auth   Aucune — URL publique `.ics` collée par l'utilisateur  \n  Fournisseurs   Outlook perso/pro (tenants sans consent OAuth), Apple Calendar, tout provider RFC 5545  \n  Parsing   `sync-calendar-trips` : fetch HTTP, unfold RFC 5545, unescape (`\\,` `\\;` `\\n`), expansion `RRULE` (DAILY/WEEKLY/MONTHLY/YEARLY) sur `syncDays`  \n  Stockage   `calendar_connections.ics_url` + `provider = 'ics'`  \n  Fallback   Événements sans adresse détectable → trajet `pending_location` à compléter côté front"
  },
  {
    "origin": "backend",
    "heading": "API Véhicules (immatriculation)",
    "body": "Aspect   Détail  \n --- --- \n  Sources   DrivePieces API (primaire), Earlweb/Moove-France (fallback)  \n  Edge Function   `vehicle-lookup`  \n  Secret   `IMMATRICULATION_API_KEY`  \n  Cache   Résultats en DB (`vehicle_cache`)  \n  Données   Marque, modèle, CV fiscaux, année, énergie"
  },
  {
    "origin": "backend",
    "heading": "Google Maps",
    "body": "Aspect   Détail  \n --- --- \n  Usage   Calcul de distances, géocodage, autocomplete  \n  Edge Function   `google-maps-key` (fournit la clé au client)  \n  Secret   Clé servie depuis les secrets Supabase"
  },
  {
    "origin": "backend",
    "heading": "Marina (Analyse IA)",
    "body": "Aspect   Détail  \n --- --- \n  Usage   Analyse de documents (justificatifs kilométriques)  \n  Edge Function   `marina-analyze`  \n  Secret   `MARINA_API_KEY`  \n  Workflow   Asynchrone (POST → job_id → GET polling)"
  },
  {
    "origin": "backend",
    "heading": "Blog API (CMS Headless)",
    "body": "Aspect   Détail  \n --- --- \n  Auth   Clés API (table `blog_api_keys`)  \n  Edge Function   `blog-api` (902 lignes)  \n  CRUD   Articles (`blog_posts`) + Pages (`page_contents`)  \n  Audit   Toute modification loggée dans `api_audit_logs`  \n  Webhook   `BLOG_WEBHOOK_TOKEN` pour notifications  \n\n---"
  },
  {
    "origin": "backend",
    "heading": "Tables de monitoring",
    "body": "Table   Contenu  \n --- --- \n  `api_usage_logs`   Appels API (fonction, modèle, tokens, coût en €)  \n  `error_logs`   Erreurs applicatives (type, message, source, metadata)  \n  `request_logs`   Requêtes HTTP (path, status, bot, country)  \n  `marketing_analytics`   Événements marketing (page_view, cta_click, signup_click)  \n  `autopilot_events`   Événements de monitoring (severity, resolved). Détection automatique d'anomalies via trigger : `anomaly_mass_delete` (>10 deletes/h), `anomaly_burst` (>50 actions/h), `critical_page_modified` (modif sur `/`, `/tarifs`), `quota_exceeded` (quota mensuel atteint)."
  },
  {
    "origin": "backend",
    "heading": "Quota & détection d'anomalies (Autopilot — P1)",
    "body": "- **Quota mensuel** sur `blog_api_keys` : `monthly_quota` (défaut 10 000 écritures), `usage_current_month`, `usage_reset_at`. Compté uniquement sur les opérations d'écriture (POST/PUT/PATCH/DELETE), incrémenté via `increment_blog_api_usage(_api_key_name)`. Réponse `429` si dépassé + event `quota_exceeded` (severity=critical).\n- **Trigger DB** `trg_detect_autopilot_anomalies` sur `api_audit_logs` (AFTER INSERT) → fonction `detect_autopilot_anomalies()` qui crée automatiquement les events ci-dessus.\n- **Pages critiques surveillées** : `/`, `/tarifs`, `index`, `tarifs`, `home`.\n- **Filtre UI par `api_key_name`** (P2) : dropdown dans `AdminAutopilot` pour isoler l'activité d'une clé spécifique (ex. Parménion vs autre crawler). S'applique aux audit logs, événements, compteurs et health dashboard. Préférence persistée dans `localStorage` (`autopilot:apiKeyFilter`).\n- **Groupement par session** (P2) : composant `AuditSessionGroup` (`src/components/admin/AuditSessionGroup.tsx`). Regroupe les `api_audit_logs` consécutifs partageant la même `api_key_name` avec un écart < 5 minutes. En-tête de session affiche : début → fin, durée, nb d'actions, répartition par action (create/update/delete) et par resource_type. Collapse/expand par session, première session ouverte par défaut. Toggle UI \"Grouper par session\" persisté dans `localStorage` (`autopilot:groupBySession`).\n- **Vue détaillée de session** (P2) : composant `SessionDetailSheet` (`src/components/admin/SessionDetailSheet.tsx`). Bouton \"Détails\" sur chaque en-tête de session ouvre un Sheet latéral avec : 4 KPIs (actions / ressources"
  },
  {
    "origin": "backend",
    "heading": "Secrets configurés (16)",
    "body": "Secret   Usage  \n --- --- \n  `SUPABASE_URL`   URL du projet (auto)  \n  `SUPABASE_ANON_KEY`   Clé publique (auto)  \n  `SUPABASE_SERVICE_ROLE_KEY`   Clé service (auto)  \n  `SUPABASE_PUBLISHABLE_KEY`   Clé publiable (auto)  \n  `SUPABASE_DB_URL`   URL de connexion DB (auto)  \n  `SUPABASE_JWKS`   JWKS pour vérification JWT (auto)  \n  `GOOGLE_CLIENT_ID`   OAuth Google Calendar  \n  `GOOGLE_CLIENT_SECRET`   OAuth Google Calendar  \n  `MICROSOFT_CLIENT_ID`   OAuth Outlook  \n  `MICROSOFT_CLIENT_SECRET`   OAuth Outlook  \n  `IMMATRICULATION_API_KEY`   API recherche véhicule  \n  `MARINA_API_KEY`   API analyse IA  \n  `RAPIDAPI_KEY`   (legacy)  \n  `BLOG_API`   (legacy)  \n  `BLOG_WEBHOOK_TOKEN`   Webhook de notification blog  \n  `LOVABLE_API_KEY`   API Lovable AI Gateway"
  },
  {
    "origin": "backend",
    "heading": "Storage Buckets",
    "body": "Bucket   Public   Usage  \n --- --- --- \n  `feedback-images`   ✅   Images jointes aux feedbacks  \n  `blog-images`   ✅   Images des articles de blog  \n  `survey-screenshots`   ❌   Screenshots des sondages  \n\n---"
  },
  {
    "origin": "backend",
    "heading": "Vue d'ensemble",
    "body": "API B2B permettant à des partenaires (ex: Dictadevi) d'intégrer IKtracker dans leur produit : provisioning automatique d'utilisateurs, calcul d'IK, création de trajets, lecture de stats et SSO transparent vers l'app IKtracker.\n\n- **Edge Function** : `partner-api`\n- **Base URL** : `https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/partner-api`\n- **Modèle** : Gratuit (quota mensuel configurable par clé)"
  },
  {
    "origin": "backend",
    "heading": "Authentification",
    "body": "Header   Usage  \n --- --- \n  `x-api-key`   Clé partenaire (préfixe `pk_live_…`). Hashée en SHA-256 et matchée sur `partner_api_keys.key_hash`  \n  `Authorization: Bearer <jwt>`   (Optionnel, pour SSO standard) JWT signé par le partenaire avec son `jwt_secret`  \n\nValidation via la fonction SQL `validate_partner_key(_key_hash)` (SECURITY DEFINER) qui retourne le partenaire, ses scopes et le quota restant."
  },
  {
    "origin": "backend",
    "heading": "Scopes disponibles",
    "body": "Scope   Usage  \n --- --- \n  `vehicle:lookup`   Recherche véhicule par plaque  \n  `ik:calculate`   Calcul d'indemnité kilométrique  \n  `trips:write`   Création de trajets  \n  `stats:read`   Lecture des stats utilisateur  \n  `sso`   Génération de magic links SSO"
  },
  {
    "origin": "backend",
    "heading": "Endpoints",
    "body": "Méthode   Path   Scope   Description  \n --- --- --- --- \n  `POST`   `/vehicle/lookup`   `vehicle:lookup`   Lookup par plaque (`plate` ou `license_plate`) → marque, modèle, CV fiscaux  \n  `POST`   `/ik/calculate`   `ik:calculate`   Calcule l'IK pour un trajet (`fiscal_power`, `trip_km`/`annual_km`, `is_electric`)  \n  `POST`   `/trips`   `trips:write`   Crée un trajet pour un user partenaire (provisioning auto si inexistant). `source` doit commencer par `partner:`  \n  `GET`   `/stats`   `stats:read`   Stats annuelles de l'utilisateur (km, IK, palier en cours)  \n  `GET`   `/dashboard?months=12`   `stats:read`   **🆕 Compteurs annuels + breakdown mensuel (1-24 mois) — alimente directement un BarChart**  \n  `GET`   `/reports/:id/pdf`   `reports` / `trips:read`   Rendu PDF binaire (Browserless) d'un rapport partagé  \n  `POST`   `/reports/generate`   `reports` / `trips:read`   Crée un `report_share` (HTML + URL publique 7j)  \n  `POST`   `/reports/send-email`   `reports`   Envoi du rapport par email (Resend)  \n  `POST`   `/sso/magic-link`   `sso`   Génère un magic link signé (JWT partenaire requis dans `Authorization`)  \n  `POST`   `/sso/dev`   `sso`   **Dev only** — génère un magic link sans JWT, à partir de `external_user_id` + `external_email`  \n  `GET`   `/preferences`   `preferences:read` / `read`   Retourne `calendar_import_mode`, `ik_rate_override`, `ik_rate_override_options`, `has_home_address` pour l'utilisateur lié  \n  `PUT` \\  `PATCH`   `/preferences`   `preferences:write` / `write`   Met à jour `calendar_import_mode` et/ou `ik_rate_override`. Déclenche le webhook `prefe"
  },
  {
    "origin": "backend",
    "heading": "Endpoint `/preferences` — détail",
    "body": "Exposé pour permettre aux partenaires (ex. Dictadevi) d'offrir à leurs utilisateurs le pilotage des deux réglages clés du calcul IK sans quitter leur plateforme :\n- **`calendar_import_mode`** : `individual` (un trajet par événement) ou `tour` (regroupe les événements d'un même jour et d'un même calendrier en tournée). `tour` exige une adresse `Maison` dans `locations`.\n- **`ik_rate_override`** : `auto` (barème officiel tiered), `tier1` (≤ 5 000 km/an), `tier2` (5 001–20 000 km/an) ou `tier3` (> 20 000 km/an). Fige le taux appliqué à chaque km — utile pour les indépendants qui se remboursent mensuellement et veulent un taux stable toute l'année.\n\n**Résolution utilisateur** : header `x-external-user-id` obligatoire → mapping `partner_users` → `iktracker_user_id`. Renvoie `404` si l'utilisateur n'est pas encore provisionné (appeler `/sso/magic-link` au préalable pour créer le mapping).\n\n**`GET /preferences`** — réponse :\n\n`has_home_address` reflète l'existence d'une entrée `locations` avec `label = 'Maison'` (case-insensitive). `note = \"home_address_missing\"` est renvoyé si le mode courant est `tour` sans Maison définie : dans ce cas `sync-calendar-trips` retombe silencieusement en trajets individuels.\n\n**`PUT /preferences`** (ou `PATCH`) — body accepte un ou les deux champs :\n\nUpsert sur `user_preferences (user_id, calendar_import_mode, ik_rate_override)`. Codes :\n- `200` : préférences enregistrées, renvoie `{ success, calendar_import_mode, ik_rate_override }`.\n- `400` : valeur invalide, ou aucun champ fourni.\n- `403` : scope manquant (`preferences:write` ou fallback `write`)"
  },
  {
    "origin": "backend",
    "heading": "Endpoint `/vehicles/:id` — détail",
    "body": "Permet à un partenaire (ex. Dictadevi) de mettre à jour un véhicule côté IKtracker sans double-saisie et de contrôler explicitement la rétroactivité du recalcul IK.\n\n**Body (PATCH ou PUT)** — tous les champs sont optionnels sauf au moins un :\n\n- **`update_past_trips`** (booléen, défaut `false`) — sémantique identique à la case à cocher exposée dans l'app IKtracker (« Mettre à jour les trajets passés ») :\n  - `true` + changement de `fiscal_power` ou `is_electric` → recalcule immédiatement `ik_amount` sur tous les `trips` non supprimés liés à ce véhicule (barème officiel tiered + bonus 20 % électrique, ordre chronologique, cumul annuel reconstitué).\n  - `false` (ou aucun changement de barème) → seuls les trajets créés après la modification bénéficient du nouveau barème ; les trajets passés conservent leur `ik_amount` d'origine.\n\n**Réponse `200`** :\n\n**Codes d'erreur** : `400` (aucun champ fourni), `403` (scope `vehicles:write` manquant), `404` (véhicule inexistant ou n'appartenant pas à l'utilisateur lié).\n\n**Webhook `vehicle.updated`** (si abonné) :"
  },
  {
    "origin": "backend",
    "heading": "Provisioning automatique",
    "body": "À chaque appel impliquant un utilisateur (`/trips`, `/stats`, `/sso/*`), la fonction `findOrCreateIktrackerUser(partnerId, external_user_id, external_email, metadata)` :\n\n1. Cherche un mapping existant dans `partner_users` (par `partner_id` + `external_user_id`)\n2. Si absent : crée un compte Supabase Auth (email confirmé), insère un mapping\n3. Met à jour `last_sso_at` et le `metadata` partenaire\n4. Retourne l'`iktracker_user_id` (UUID)"
  },
  {
    "origin": "backend",
    "heading": "Quotas & Logs",
    "body": "- Compteur incrémenté via `increment_partner_usage(_partner_id)` à chaque requête\n- Reset mensuel automatique (`usage_reset_at`)\n- Tous les appels sont loggés dans `partner_request_logs` (path, status, durée, partenaire, user externe)"
  },
  {
    "origin": "backend",
    "heading": "Webhooks sortants",
    "body": "Table `partner_webhooks` : URL + secret HMAC + liste d'événements abonnés. Permet de notifier le partenaire (ex: trajet créé, palier IK franchi). Signature `X-IKTracker-Signature: sha256=…`. La clé est lue dans `partner_webhooks.hmac_secret`, avec fallback sur la variable d'environnement `IKTRACKER_WEBHOOK_SECRET`."
  },
  {
    "origin": "backend",
    "heading": "Contrainte trips",
    "body": "La contrainte `trips_source_check` accepte les valeurs `manual`, `google_calendar`, `outlook_calendar`, `tour`, `takeout`, ainsi que toute valeur préfixée par `partner:` (ex: `partner:dictadevi`)."
  },
  {
    "origin": "backend",
    "heading": "Scopes disponibles",
    "body": "Scope   Endpoints couverts  \n ------- -------------------- \n  `vehicle:read` / `vehicle:lookup`   Lecture véhicules + lookup plaque  \n  `ik:calculate`   Calcul barème IK  \n  `trips:write`   `POST /trips`  \n  `trips:read` / `read`   Lecture trajets  \n  `reports` (ou `trips:read`/`read`)   `POST /reports/generate`, `POST /reports/send-email`, `GET /reports/{id}/pdf`  \n  `stats:read`   Stats agrégées partenaire  \n  `sso`   Magic links one-shot  \n\n⚠️ Pour qu'un partenaire puisse générer/télécharger les rapports IK PDF, sa clé doit avoir l'un des scopes `reports`, `trips:read` ou `read`. Sinon `partner-api` renvoie `403 \"Missing reports / trips:read scope\"`."
  },
  {
    "origin": "backend",
    "heading": "Admin UI",
    "body": "Le dashboard `/app/admin/partners` (réservé `admin`) permet de :\n- Créer/révoquer des clés partenaires\n- Définir les scopes et le quota mensuel\n- Visualiser l'usage et les logs récents\n- Gérer les webhooks\n\n---"
  },
  {
    "origin": "backend",
    "heading": "Liste noire de slugs blog (anti-recréation par API)",
    "body": "**Table** : `blog_slug_blacklist`\n- `slug_pattern` (text, unique) : slug exact ou motif `LIKE` (`%` = wildcard).\n- `is_pattern` (bool) : si vrai, comparaison via `LIKE`, sinon égalité stricte.\n- `reason` (text) : note interne admin.\n- RLS : admins (lecture/écriture), viewers (lecture seule).\n\n**Fonction** : `public.is_slug_blacklisted(_slug text) returns boolean` (`SECURITY DEFINER`, `search_path=public`). Appelée par l'edge function `blog-api` lors d'un `POST /posts`.\n\n**Comportement API** : si le slug envoyé matche, l'edge function retourne :\n- HTTP `409`\n- `{ \"success\": false, \"error\": \"slug_blacklisted\", \"message\": \"Non, ce contenu existe déjà…\", \"slug\": \"...\" }`\n- Audit log : action `blocked` sur `resource_type=post`.\n\n**UI admin** : onglet **Liste noire** dans `/admin/blog`.\n\n**Docs agents externes**\n- `docs/CRAWLERS_SLUG_PERSISTENCE_PROMPT.md` — spécification côté IKtracker des codes de retour (`409 slug_blacklisted`, `200 _skipped`, `201`) et des règles de persistance attendues (mémoire locale, anti-variations, cooldown 7 jours).\n- `docs/LOVABLE_PROMPT_CRAWLERS_SLUG_MEMORY.md` — prompt opérationnel à coller dans le chat Lovable des projets `Crawlers` et `Parménion` pour qu'ils implémentent : table `iktracker_slug_memory`, module `iktracker-slug-memory.ts` (normalisation + Levenshtein ≤ 3 + hash de contenu), garde-fou avant `POST /posts`, page admin `/slug-memory`, tests Vitest.\n\n---"
  },
  {
    "origin": "backend",
    "heading": "Corbeille blog (soft-delete des articles)",
    "body": "**Schéma**\n- Enum `blog_post_status` étendu avec la valeur `deleted`.\n- Colonne `blog_posts.deleted_at` (timestamptz, nullable, indexée).\n\n**Comportement API (`blog-api`)**\n- `DELETE /posts/:slug` → soft-delete par défaut : `status='deleted'`, `deleted_at=now()`. Audit log `soft_delete`.\n- `DELETE /posts/:slug?hard=true` → purge définitive (admin uniquement). Audit log `purge`.\n- `POST /posts` avec un slug actuellement en `deleted` → `409 slug_in_trash` (refus de recréation).\n- `GET /posts` (auth) sans paramètre → exclut la corbeille (`status='published'` par défaut).\n- `GET /posts?status=deleted` → liste explicite de la corbeille.\n- `GET /posts?status=all` ou `?all=true` → inclut la corbeille (admin/viewer).\n- `GET /posts` (public, anonyme) → uniquement `published` (inchangé).\n\n**Visibilité publique**\nLa policy RLS publique reste `status = 'published'`, donc les articles `deleted` ne sont jamais exposés au front public, au sitemap, ni au meta-renderer.\n\n**UI admin**\nOnglet **Corbeille** dans `/admin/blog` (compteur, restauration en `draft`, purge définitive avec confirmation). La suppression depuis le listing principal envoie désormais l'article dans la corbeille au lieu de le détruire.\n\n---"
  },
  {
    "origin": "backend",
    "heading": "Détection & purge des trajets en doublon",
    "body": "**Problème** : avec deux sources d'import automatique (Google/Outlook Calendar via `sync-calendar-trips` et partenaires comme Dictadevi via `partner-api`), un même trajet réel peut générer plusieurs lignes dans `trips` (event ID différent ou source différente).\n\n**Stratégie de dédup (stricte)**\nClé unique logique : `user_id` + `date` + destination normalisée (`end_location` minuscule, sans diacritiques, espaces compactés). Englobe les trajets archivés (`deleted_at IS NOT NULL`) afin de ne pas re-créer un trajet que l'utilisateur a explicitement supprimé.\n\n**Couches de protection**\n\n1. **`partner-api` `POST /trips`** : avant insertion, appelle `findDuplicateTrip(userId, date, end_location)`. Si match :\n   - Retourne `200 { success: false, duplicate: true, reason: \"duplicate_active\"   \"duplicate_archived\", existing_trip_id }`.\n   - Aucune insertion, aucun webhook `trip.created` envoyé.\n\n2. **`sync-calendar-trips`** : conserve la double garde existante :\n   - `tripExistsForEvent` (match exact par `calendar_event_id`).\n   - `similarTripExists` (match souple date + destination, archivés inclus).\n   - Pour les trajets `pending_location`, la garde compare aussi `date + destination normalisée + intitulé d'événement normalisé`, afin d'éviter les doublons quand un même rendez-vous arrive avec deux variantes d'adresse de départ (`Chemin` / `Chem.`, accents, ponctuation, `France`).\n\n3. **`purge-duplicate-trips`** (nouvelle edge function) :\n   - Auth : utilisateur admin via JWT, ou cron interne via header `x-cron-secret` égal au service role key.\n   - Body : `{ \"dry_run\": true false (de"
  },
  {
    "origin": "backend",
    "heading": "Trajets récurrents (juin 2026)",
    "body": "- **Table** `recurring_trips` : modèle de trajet (vehicle_id, start/end_location JSONB, distance, round_trip, purpose, `days_of_week SMALLINT[]` (0=Dim..6=Sam), `weeks_duration INT?`, `active_months SMALLINT[]?` (1..12), is_active, last_generated_date). RLS scopée `auth.uid() = user_id`.\n- **Edge function** `generate-recurring-trips` : insère un trip dans `trips` (source='recurring') pour chaque récurrence active dont `days_of_week` contient le jour courant (UTC), filtrée par `active_months` et la fenêtre `weeks_duration` depuis `created_at`. Calcule `ik_amount` via le barème embarqué + bonus 20% EV. **Auth obligatoire** : Bearer = `SUPABASE_SERVICE_ROLE_KEY` ou `RECURRING_TRIPS_CRON_TOKEN`, ou header `x-cron-secret` = `CRON_SECRET`/`RECURRING_TRIPS_CRON_TOKEN`.\n- **Cron** `generate-recurring-trips-daily` (pg_cron) : exécution quotidienne à 05:00 UTC via `net.http_post`, en envoyant le service role key (lu depuis `vault.decrypted_secrets`) en Authorization Bearer.\n- Source `'recurring'` ajoutée à la contrainte `trips_source_check`.\n- **RPC** `get_recurring_trips_stats()` (SECURITY DEFINER) : total + créations par jour sur 7 jours. Accès `admin`/`viewer`. Utilisé par la card \"Trajets récurrents\" dans Admin → Statistiques."
  },
  {
    "origin": "backend",
    "heading": "Durcissement sécurité (juin 2026)",
    "body": "Correctifs appliqués suite au scan sécurité :\n\n- **Auth gates sur edge functions sensibles** : `convert-blog-images` exige un JWT admin (vérifie `has_role(_, 'admin')`). `generate-recurring-trips`, `sync-calendar-trips`, `recalculate-distances` n'acceptent plus que le service role key (Bearer), un token cron dédié (`RECURRING_TRIPS_CRON_TOKEN`) ou un `x-cron-secret` valide.\n- **Ownership check** sur `recalculate-distances` : un utilisateur authentifié ne peut déclencher le recalcul que pour ses propres trajets.\n- **HMAC-signed OAuth state** : `google-calendar-auth` et `outlook-calendar-auth` signent maintenant `state` (HMAC-SHA256 sur `user_id nonce exp` avec `SUPABASE_SERVICE_ROLE_KEY` comme clé) et vérifient signature + expiration au callback. Empêche la forgery de `user_id` dans le flux OAuth.\n- **XSS reports** : helper `esc()` dans `src/lib/print-utils.ts`. Toutes les données utilisateur interpolées dans le HTML/JS du rapport sont échappées (titres, adresses, motifs, plaques).\n- **Storage `feedback-images`** : policy INSERT scopée au préfixe `<auth.uid()>/...` — un user ne peut uploader que dans son propre dossier.\n- **Audit `report_shares`** : policy SELECT admin ajoutée pour permettre l'audit des liens partagés sans casser l'accès public via service role.\n- **Dépendances** : `html2pdf.js` et `vitest` mis à jour pour corriger les vulnérabilités critiques remontées par le scan.\n\nSecrets associés (Supabase Vault / env edge) : `CRON_SECRET`, `RECURRING_TRIPS_CRON_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`."
  },
  {
    "origin": "backend",
    "heading": "Partenaires sortants (juin 2026)",
    "body": "Système d'affiliation **sortante** (IKtracker → partenaires type Qonto, Indy), distinct des codes affiliés entrants (`affiliate_codes`).\n\n- **Table** `outbound_partners` : catalogue (slug, name, logo_url, tagline, description, `category` enum, `target_url`, `commission_amount`, `commission_model` enum cpa/cps/cpc, is_active, priority, `target_personas` text[], `target_pages` text[]). RLS : `SELECT` public sur `is_active = true`, `ALL` réservé admin.\n- **Table** `partner_clicks` : tracking serveur des clics (partner_id, user_id?, session_id, page, placement, persona, referrer, user_agent, ip_address). INSERT public autorisé, SELECT réservé admin/viewer.\n- **Edge function** `partner-redirect` (publique, no JWT) : `GET /functions/v1/partner-redirect?slug=qonto&page=/&placement=inline_card&sid=...` → enregistre un clic puis 302 redirect vers `target_url` avec UTM auto-injectés (`utm_source=iktracker`, `utm_medium=partner_card`, `utm_content=<placement>`, `utm_campaign=<page>`).\n- **RPC** `get_partner_stats(days_back)` : total_clicks, unique_sessions, estimated_revenue (clics × commission × 4% conversion), top_page, last_click_at — filtre admins/IPs exclues. Accès admin/viewer.\n- **RPC** `get_partner_clicks_by_day(_partner_id?, days_back)` : courbe clics/jour pour graphiques admin.\n- **Frontend** : composants `<PartnerCard />` (bloc inline, max 1/page) et `<PartnerStrip />` (bandeau footer multi-logos). Hook `usePartners({ page, persona, limit })` avec ciblage `target_pages` + `target_personas`. Liens toujours `rel=\"sponsored nofollow noopener\"`. Onglet Admin → Coûts → Partenair"
  },
  {
    "origin": "backend",
    "heading": "Emails — Envoi via Resend (novembre 2026)",
    "body": "Bascule du système d'envoi d'emails de l'infra Lovable Emails vers **Resend** (via connector gateway Lovable) pour supporter les **pièces jointes PDF**.\n\n- **Lovable Emails désactivés** : `email_domain--toggle_project_emails(enabled=false)`. Le sous-domaine `notify.iktracker.fr` reste délégué (NS `ns3/ns4.lovable.cloud`) tant que l'utilisateur n'a pas retiré les enregistrements chez son registrar.\n- **Connector Resend** lié au projet — secrets injectés : `RESEND_API_KEY` (managed), utilisé via gateway `https://connector-gateway.lovable.dev/resend` avec `Authorization: Bearer $LOVABLE_API_KEY` + `X-Connection-Api-Key: $RESEND_API_KEY`.\n- **Domaine expéditeur** : `iktracker.fr` (racine) — `FROM_EMAIL = \"IKtracker <releves@iktracker.fr>\"`, `reply_to = contact@iktracker.fr`. Nécessite validation SPF/DKIM/DMARC de `iktracker.fr` côté Resend (indépendant du sous-domaine `notify` délégué à Lovable).\n- **Edge function** `send-accountant-report` réécrite :\n  - Génère le HTML des relevés (période + cumul annuel).\n  - Rend chaque relevé en **PDF** via **Browserless** (`POST https://production-sfo.browserless.io/pdf`, A4 avec `printBackground: true` et marges 18/14mm).\n  - Envoie l'email via Resend avec les **2 PDF en pièces jointes** (base64) + liens sécurisés `https://iktracker.fr/temporaryreport/:id` (TTL 7j) en secours.\n  - Header `Idempotency-Key: accountant-<user_id>-<period_start>` pour éviter les doublons.\n- **Dépendances supprimées** : plus d'appel à `send-transactional-email`, plus de queue pgmq pour ce flux.\n- **Cron** inchangé : `send-accountant-report-daily` (7h UTC)."
  },
  {
    "origin": "backend",
    "heading": "Relevé mensuel automatique à l'utilisateur (juillet 2026)",
    "body": "Envoi automatique du relevé kilométrique **à l'utilisateur lui-même** (distinct de l'envoi comptable).\n\n- **Nouvelles colonnes `user_preferences`** :\n  - `user_monthly_report_enabled boolean NOT NULL DEFAULT true` — opt-out par utilisateur.\n  - `user_monthly_report_last_sent_at timestamptz` — anti-doublon (25 j min entre deux envois).\n- **Edge function** `send-user-monthly-report` :\n  - Récupère les users avec `user_monthly_report_enabled = true`.\n  - Génère 2 relevés HTML → PDF (Browserless) : **mois précédent** + **cumul année civile en cours**.\n  - Injecte un bloc **Profil véhicule** en tête de PDF (immatriculation, marque/modèle, motorisation, puissance fiscale, barème appliqué — bonus 20 % pour 100 % électrique).\n  - Envoie via Resend (`releves@iktracker.fr`) avec 2 PDF en pièces jointes + 2 liens publics `https://iktracker.fr/temporaryreport/:id` appuyés par `report_shares` (TTL 7 j).\n  - Idempotency key : `user-monthly-<user_id>-<year>-<month>`.\n  - Endpoint POST accepte `{ user_id, dry_run?, override_email? }` pour test on-demand (bypass des filtres date/anti-doublon).\n- **Cron** `send-user-monthly-report` : `0 7 15 * *` (**15 du mois, 07:00 UTC**), token lu depuis `vault.decrypted_secrets.email_queue_service_role_key`.\n- **UI** : toggle « Relevé mensuel automatique » dans Préférences (activé par défaut)."
  },
  {
    "origin": "backend",
    "heading": "Extension utilisateurs API partenaire (juillet 2026)",
    "body": "Les utilisateurs provisionnés via `partner-api` (`findOrCreateIktrackerUser`) bénéficient désormais du relevé mensuel automatique :\n\n- **Provisioning** : après création du mapping `partner_users`, `partner-api` fait un `upsert` sur `user_preferences (user_id)` — les défauts (`user_monthly_report_enabled = true`) s'appliquent. Backfill effectué pour les utilisateurs existants.\n- **Nouveau webhook `monthly_report.sent`** émis par `send-user-monthly-report` après chaque envoi réussi. Payload :\n  \n  Signé HMAC-SHA256 (`X-IKtracker-Signature: sha256=<hex>`). La clé est lue dans l'ordre suivant : `partner_webhooks.hmac_secret`, puis la variable d'environnement `IKTRACKER_WEBHOOK_SECRET` comme fallback. Fired uniquement pour les partenaires ayant `monthly_report.sent` dans leur array `events`. Dictadevi (et autres partenaires) doivent l'ajouter côté enregistrement du webhook pour être notifiés — c'est un pull côté partenaire vers `month_url`/`ytd_url` (liens sécurisés 7 j) plutôt qu'un push de données binaires."
  },
  {
    "origin": "backend",
    "heading": "Filtres calendrier \"événements personnels\" (juillet 2026 — Niveau 1)",
    "body": "Pour éviter que des événements personnels (anniversaires, rappels, tâches, événements récurrents sans lieu) génèrent des trajets parasites, `sync-calendar-trips` applique une fonction déterministe `shouldSkipEvent(event)` avant `createTripFromEvent`. Basée sur des signaux **RFC 5545 / Google Calendar API / Microsoft Graph** explicites — aucun ML, aucun matching de mots-clés :\n\n  Signal   Source   Comportement  \n --- --- --- \n  `transparency = TRANSPARENT` (Google/ICS) ou `showAs = free` (Outlook)   RFC 5545 `TRANSP`   Skip — l'utilisateur est marqué \"disponible\", ce n'est pas un déplacement pro  \n  `eventType = birthday` / `fromGmail` / `outOfOffice` / `focusTime` / `workingLocation`   Google Calendar API `eventType`   Skip — types explicitement non-professionnels  \n  `categories` contient `Birthday` / `Anniversaire` / `Holiday`   ICS `CATEGORIES`   Skip  \n  Événement all-day (`DTSTART;VALUE=DATE`) sans `LOCATION`   RFC 5545   Skip — anniversaire, fête, jour férié  \n  Récurrent all-day (`RRULE` + all-day)   RFC 5545   Skip — patterns anniversaires annuels  \n\nLes événements horaires **sans lieu** sont conservés (créés en `pending_location`) car ils peuvent correspondre à un vrai rendez-vous à compléter manuellement. Extension possible en Niveau 2 (opt-out par calendrier utilisateur) documentée dans la mémoire projet."
  },
  {
    "origin": "backend",
    "heading": "Intégrations d'agents (MCP — juillet 2026)",
    "body": "Serveur MCP OAuth 2.1 exposant les données IKtracker à ChatGPT / Claude / Cursor via le protocole Model Context Protocol.\n\n- **Entrée** : `src/lib/mcp/index.ts` (`defineMcp` + `auth.oauth.issuer`, issuer construit depuis `VITE_SUPABASE_PROJECT_ID`, audience `authenticated`).\n- **Outils** (`src/lib/mcp/tools/`) :\n  - `list_vehicles` — véhicules de l'utilisateur (immat, marque/modèle, motorisation, CV).\n  - `list_trips` — trajets filtrables (date, statut, véhicule).\n  - `get_ytd_summary` — cumul année en cours (km, IK, nombre de trajets).\n  - `create_trip` — création d'un trajet (`needsApproval = true`).\n- **Edge Function** : `supabase/functions/mcp/index.ts` — auto-générée par `@lovable.dev/mcp-js/stacks/supabase/vite` à chaque build Vite. **Ne pas éditer à la main**. Déployée avec `verify_jwt = false` (la vérification OAuth est faite par mcp-js contre l'issuer Supabase direct).\n- **OAuth 2.1** : Supabase Auth agit comme Authorization Server (DCR activé via `supabase--configure_oauth_server`). Chaque connexion se fait au nom de l'utilisateur — RLS s'applique.\n- **Page de consentement** : `/.lovable/oauth/consent` (`src/pages/OAuthConsent.tsx`) — affiche le nom du client, boutons Approuver/Refuser, redirige vers l'auth si non connecté (préserve `next=`).\n- **URL publique du serveur MCP** : `https://<project-ref>.supabase.co/functions/v1/mcp` — à coller dans ChatGPT/Claude \"Add MCP server\".\n- **Manifest** : `.lovable/mcp/manifest.json` — régénéré à chaque modification via `app_mcp_server--extract_mcp_manifest`."
  },
  {
    "origin": "backend",
    "heading": "Changelog",
    "body": "- **3.4** (30 juillet 2026) — Boucle d'amélioration itérative LinkedIn : score composite /100 calculé côté serveur (40 pts déterministes + 60 pts éditoriaux pondérés hook ×3 / impressions ×2 / contenu ×1). Chaque correction relance un cycle d'audit jusqu'à `score ≥ 85` et `hook_score ≥ 8`. Garde-fous : 3 itérations max, détection de plateau (< 3 pts de gain), rejet d'un texte réécrit non conforme. Nouveaux statuts `max_attempts`, `plateau`, `fix_invalid`.\n- **3.3** (30 juillet 2026) — Boucle qualité LinkedIn : nouvelle Edge Function `linkedin-post-audit` (cron `*/5 * * * *`) qui relit chaque post publié ~5 min après, l'audite (hook, potentiel d'impressions, contrôles déterministes de forme) et déclenche automatiquement une republication corrigée via `?mode=repost` en conservant le média. Nouvelles colonnes d'audit sur `linkedin_post_log`.\n- **3.2** (27 juillet 2026) — Recalcul IK opt-in : la modif d'un véhicule (CV fiscaux, statut électrique) ne recalcule plus systématiquement les trajets passés. Nouvelle case « Mettre à jour les trajets passés » dans `VehicleForm` (côté app) et paramètre `update_past_trips` dans `PATCH /vehicles/:id` de l'API partenaire. Par défaut, seuls les trajets à venir utilisent le nouveau barème. Nouveau endpoint `GET /vehicles` (liste), webhook `vehicle.updated` enrichi (`changed[]`, `update_past_trips`, `recalculated_trips`).\n- **3.1** (27 juillet 2026) — Renforcement anti-doublons des trajets à compléter : normalisation partagée en base (`normalize_trip_dedupe_text`), purge rétroactive par `date + destination + intitulé`, et trigger comptes liés "
  },
  {
    "origin": "frontend",
    "heading": "Table des matières",
    "body": "1. [Stack & Architecture](#1-stack--architecture)\n2. [Pages & Routing](#2-pages--routing)\n3. [Composants](#3-composants)\n4. [Hooks](#4-hooks)\n5. [Librairies utilitaires](#5-librairies-utilitaires)\n6. [Design System](#6-design-system)\n7. [Performance](#7-performance)\n\n---"
  },
  {
    "origin": "frontend",
    "heading": "Technologies",
    "body": "Technologie   Version   Rôle  \n --- --- --- \n  React   18   UI framework  \n  TypeScript   5   Typage statique  \n  Vite   5   Bundler & dev server  \n  Tailwind CSS   3   Utility-first CSS  \n  shadcn/ui   -   Composants UI (Radix-based)  \n  React Router   6   Routing SPA  \n  TanStack Query   5   Data fetching & cache  \n  Framer Motion   -   Animations  \n  Helmet Async   -   SEO meta tags  \n  Lucide React   -   Icônes  \n  Recharts   -   Graphiques (lazy)"
  },
  {
    "origin": "frontend",
    "heading": "Routes publiques (marketing/SEO)",
    "body": "Route   Page   Description  \n --- --- --- \n  `/`   `Landing`   Page d'accueil (smart redirect si auth)  \n  `/auth`   `Auth`   Connexion (smart redirect si auth)  \n  `/signup`   `Signup`   Inscription (smart redirect si auth)  \n  `/blog`   `Blog`   Liste des articles  \n  `/blog/:slug`   `BlogPost`   Article de blog  \n  `/blog/auteur/:slug`   `AuthorPage`   Page auteur  \n  `/privacy`   `Privacy`   Politique de confidentialité  \n  `/terms`   `Terms`   CGVU (Conditions Générales de Vente et d'Utilisation)  \n  `/mentions-legales`   `MentionsLegales`   Mentions légales  \n  `/rgpd`   `Rgpd`   Conformité RGPD (droits, sécurité, hébergement)  \n  `/contact`   `Contact`   Page contact  \n  `/installer`   `Install`   Guide d'installation PWA  \n  `/expert-comptable`   `ExpertComptable`   Landing expert-comptable  \n  `/mode-tournee`   `ModeTournee`   Landing mode tournée  \n  `/calendrier`   `Calendrier`   Landing sync calendrier  \n  `/bareme-ik-2026`   `BaremeIK2026`   Simulateur barème IK  \n  `/frais-reels`   `FraisReels`   Guide frais réels  \n  `/lexique`   `Lexique`   Lexique IK  \n  `/comparatif-izika`   `ComparatifIzika`   Comparatif vs Izika  \n  `/comparatif-driversnote`   `ComparatifDriversNote`   Comparatif vs Driver's Note  \n  `/marina`   `MarinaAnalyze`   Analyse IA documents  \n  `/offline`   `Offline`   Page hors-ligne  \n  `/temporaryreport/:id`   `TemporaryReport`   Rapport partagé (public)"
  },
  {
    "origin": "frontend",
    "heading": "Routes protégées (`/app/*`)",
    "body": "Route   Page   Description  \n --- --- --- \n  `/app`   `Index`   Dashboard principal (ajout trajet)  \n  `/app/mestrajets`   `MesTrajets`   Historique des trajets  \n  `/app/profile`   `Profile`   Profil utilisateur  \n  `/app/admin`   `Admin`   Dashboard admin  \n  `/app/admin/blog`   `BlogAdmin`   Gestion articles blog (onglets : Articles, Brouillons, **Corbeille**, Journal API, **Liste noire**). Sélection multiple par checkbox + actions groupées (publier, dépublier, mettre à la corbeille, restaurer, supprimer définitivement) sur les onglets Articles et Corbeille.  \n  `/app/admin/blog/edit/:id?`   `BlogEditor`   Éditeur d'article  \n  `/app/blog/edit/:id?`   `BlogEditor`   Éditeur (alias)  \n  `/app/theme-onboarding`   `ThemeOnboarding`   Choix du thème  \n  `/app/recovery`   `RecoveryWizard`   Récupération tournée"
  },
  {
    "origin": "frontend",
    "heading": "Redirections (anciennes URLs)",
    "body": "Ancien path   Nouveau path  \n --- --- \n  `/mestrajets`   `/app/mestrajets`  \n  `/report`   `/app/mestrajets`  \n  `/profile`   `/app/profile`  \n  `/admin`   `/app/admin`  \n  `/admin/blog`   `/app/admin/blog`  \n  `/recovery`   `/app/recovery`  \n  `/theme-onboarding`   `/app/theme-onboarding`  \n  `/install`   `/installer`"
  },
  {
    "origin": "frontend",
    "heading": "Guards & Smart Components",
    "body": "Composant   Rôle  \n --- --- \n  `ProtectedRoute`   Redirige vers `/auth` si non authentifié  \n  `SmartLanding`   Redirige les users auth vers `/app` (sauf `?from=app`)  \n  `SmartAuth`   Redirige les users auth vers `/app`  \n  `SmartSignup`   Redirige les users auth vers `/app`  \n\n---"
  },
  {
    "origin": "frontend",
    "heading": "Application core",
    "body": "Fichier   Rôle  \n --- --- \n  `AddressCard.tsx`   Carte d'adresse (domicile/travail)  \n  `AddressForm.tsx`   Formulaire d'ajout/édition d'adresse  \n  `AnalyticsTracker.tsx`   Tracking analytics (page views, events)  \n  `ArchivedTripsSection.tsx`   Section trajets archivés  \n  `AuthForm.tsx`   Formulaire connexion/inscription (inclut scopes calendrier au sign-in OAuth)  \n  `AuthLoadingScreen.tsx`   Écran de chargement auth  \n  `BodyEndInjections.tsx`   Injections de code (scripts tracking)  \n  `Breadcrumb.tsx`   Fil d'Ariane SEO  \n  `CalendarConnections.tsx`   Gestion connexions calendrier  \n  `CalendarSyncNotification.tsx`   Notification de sync calendrier  \n  `CompleteAddressSheet.tsx`   Sheet de complétion d'adresse  \n  `Counter.tsx`   Compteur animé  \n  `DesktopSidebar.tsx`   Sidebar desktop (navigation, véhicules, feedback, section « Par le même fondateur »)  \n  `ErrorBoundary.tsx`   Boundary d'erreur global  \n  `FeedbackForm.tsx`   Formulaire de feedback (avec image)  \n  `FloatingActionButton.tsx`   FAB mobile  \n  `FocusTourView.tsx`   Vue focus mode tournée (minimize, refresh km, signal GPS)  \n  `GeolocationBanner.tsx`   Bannière permission géolocalisation  \n  `GeolocationTutorialModal.tsx`   Tutoriel activation GPS  \n  `GlobalTourRecovery.tsx`   Récupération globale de tournée  \n  `InstallBanner.tsx`   Bannière installation PWA  \n  `LocationPicker.tsx`   Sélecteur d'adresse (Google Places)  \n  `LogoutOverlay.tsx`   Overlay animé de déconnexion  \n  `NavLink.tsx`   Lien de navigation  \n  `NewTripSheet.tsx`   Sheet d'ajout de trajet  \n  `OnboardingTutorial.tsx`   Tutorie"
  },
  {
    "origin": "frontend",
    "heading": "Composants Admin (`components/admin/`)",
    "body": "Fichier   Rôle  \n --- --- \n  `AdaptiveChart.tsx`   Graphique adaptatif (responsive)  \n  `AdminAffiliation.tsx`   Gestion des codes d'affiliation  \n  `AdminAutopilot.tsx`   Monitoring autopilot  \n  `AdminCosts.tsx`   Dashboard coûts API  \n  `AdminDocumentation.tsx`   Documentation technique intégrée  \n  `AdminMonitoring.tsx`   Monitoring erreurs & logs  \n  `AdminSurveys.tsx`   Gestion des sondages A/B  \n  `AutopilotCounters.tsx`   Compteurs autopilot  \n  `DraggableMarketingCards.tsx`   Cards marketing (drag & drop)  \n  `DraggableStatsSection.tsx`   Section stats (drag & drop)  \n  `UserKPISheet.tsx`   KPI détaillés par utilisateur"
  },
  {
    "origin": "frontend",
    "heading": "Composants Blog (`components/blog/`)",
    "body": "Fichier   Rôle  \n --- --- \n  `ArticleSummary.tsx`   Résumé automatique d'article  \n  `BlogContentWithRelated.tsx`   Contenu blog avec articles liés  \n  `BlogKpiDashboard.tsx`   KPI du blog (admin)  \n  `ContentBlockEditor.tsx`   Éditeur de blocs (drag & drop)  \n  `ContentEditor.tsx`   Éditeur Markdown (images, liens)  \n  `RelatedArticle.tsx`   Carte article lié  \n  `RelatedArticleMarker.tsx`   Marqueur position article lié"
  },
  {
    "origin": "frontend",
    "heading": "Composants Marketing (`components/marketing/`)",
    "body": "Fichier   Rôle  \n --- --- \n  `AnimatedPhoneMockup.tsx`   Mockup téléphone animé  \n  `AppCarousel.tsx`   Carrousel de screenshots  \n  `CalendarSyncDemo.tsx`   Démo sync calendrier  \n  `CrawlersBanner.tsx`   Bannière crawlers IA  \n  `EnhancedMarketingFooter.tsx`   Footer marketing enrichi  \n  `MarketingFooter.tsx`   Footer marketing simple  \n  `MarketingNav.tsx`   Navigation marketing  \n  `MarketingPWANotification.tsx`   Notification PWA marketing  \n  `TestimonialsCarousel.tsx`   Carrousel témoignages  \n  `TourModeDemo.tsx`   Démo mode tournée  \n  `TourModeMockup.tsx`   Mockup mode tournée"
  },
  {
    "origin": "frontend",
    "heading": "Composants Charts (`components/charts/`)",
    "body": "Fichier   Rôle  \n --- --- \n  `LazyCharts.tsx`   Wrapper lazy-load Recharts  \n  `ProfileKmChart.tsx`   Graphique km mensuels (profil)"
  },
  {
    "origin": "frontend",
    "heading": "Composants UI (shadcn/ui — 35 primitives)",
    "body": "`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `button`, `calendar`, `card`, `checkbox`, `dialog`, `drawer`, `dropdown-menu`, `form`, `input`, `label`, `optimized-image`, `popover`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `sheet`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`, `toggle-group`, `tooltip`\n\nCustom UI : `optimized-image.tsx` (chargement lazy avec blurhash).\n\n---"
  },
  {
    "origin": "frontend",
    "heading": "Hooks d'authentification & autorisation",
    "body": "Hook   Rôle  \n --- --- \n  `useAuth.ts`   Auth state (user, loading, signOut, requiresAuth)  \n  `useAuthLazy.ts`   Auth lazy-loaded (pour composants non critiques)  \n  `useAdmin.ts`   Vérifie rôle admin (via `has_role`)  \n  `useAdminLazy.ts`   Admin check lazy-loaded"
  },
  {
    "origin": "frontend",
    "heading": "Hooks de données",
    "body": "Hook   Rôle  \n --- --- \n  `useTrips.ts`   CRUD trajets (Supabase + React Query)  \n  `usePreferences.ts`   Préférences utilisateur  \n  `useFeedback.ts`   Envoi/lecture feedback  \n  `useCalendarConnections.ts`   Connexions calendrier  \n  `useDistanceCache.ts`   Cache des distances"
  },
  {
    "origin": "frontend",
    "heading": "Hooks d'UI & UX",
    "body": "Hook   Rôle  \n --- --- \n  `use-mobile.tsx`   Détection mobile (media query)  \n  `use-toast.ts`   Système de toasts (shadcn)  \n  `useTheme.ts`   Thème clair/sombre  \n  `useNightMode.ts`   Mode nuit automatique  \n  `useContainerWidth.ts`   Largeur du container (responsive charts)  \n  `useScrollAnimation.ts`   Animations au scroll  \n  `useTutorial.ts`   État du tutoriel onboarding"
  },
  {
    "origin": "frontend",
    "heading": "Hooks techniques",
    "body": "Hook   Rôle  \n --- --- \n  `useGoogleMaps.ts`   Chargement Google Maps SDK  \n  `useGeolocation.ts`   Position GPS  \n  `useGeolocationPermission.ts`   Permission géolocalisation  \n  `useOnlineStatus.ts`   Détection connectivité  \n  `useWakeLock.ts`   Wake Lock API (écran allumé)  \n  `useMarketingTracker.ts`   Tracking événements marketing. Délègue à l'edge function `track-event` (IP captée server-side via headers Cloudflare — plus de dépendance à `api.ipify.org`, bloqué par uBlock/Brave/Pi-hole). Filtre bots + admins (double filtre client+serveur, cache session sur `is_admin_user`). Session/device/admin helpers factorisés dans `src/lib/tracking-shared.ts`.  \n  `signup-tracking.ts` (lib)   Événements funnel signup (`signup_view`, `signup_oauth_start`, `signup_form_submit`, `signup_error`, `signup_success`). Passe par `track-event`. Déduplication de `signup_view` par session via `sessionStorage` (un rechargement de `/signup` ne compte plus double).  \n  `tracking-shared.ts` (lib)   Helpers communs `getSessionId()`, `getDeviceType()`, `checkIsAdmin()` (cache session) partagés entre `useMarketingTracker` et `signup-tracking`."
  },
  {
    "origin": "frontend",
    "heading": "Hooks mode tournée",
    "body": "Hook   Rôle  \n --- --- \n  `useTourTracker.ts`   Logique principale de tournée GPS. Gap-filling sérialisé (pas de double comptage). Expose `forceRefreshDistance()` pour mise à jour manuelle du compteur  \n  `useTourSessionDB.ts`   Persistence sessions tournée (Supabase)  \n  `useTourSessionRecovery.ts`   Récupération de session interrompue"
  },
  {
    "origin": "frontend",
    "heading": "Minimisation / Restauration",
    "body": "- `Index.tsx` gère un état `tourMinimized` : quand activé, `FocusTourView` est masqué et remplacé par un pill flottant orange (icône `Car` + distance) en haut à droite\n- Cliquer sur le pill restaure la vue focus. La tournée continue en arrière-plan (GPS tracking actif)"
  },
  {
    "origin": "frontend",
    "heading": "Anti double-comptage (fix mai 2026)",
    "body": "- Le `visibilitychange` handler dans `useTourTracker` est **sérialisé** : `watchPosition` ne redémarre qu'**après** la fin du gap-filling (`getCurrentPosition`) et la mise à jour de `lastPositionRef.current`\n- Le listener redondant dans `Index.tsx` a été supprimé — `useTourTracker` est la source unique de vérité pour la récupération de distance foreground/background"
  },
  {
    "origin": "frontend",
    "heading": "Rafraîchissement manuel",
    "body": "- Bouton `RotateCw` dans `FocusTourView` : appelle `forceRefreshDistance()` qui récupère la position GPS courante et met à jour le compteur"
  },
  {
    "origin": "frontend",
    "heading": "Estimation IK en fin de tournée",
    "body": "- `handleConvertToTrips` utilise la Distance Matrix API (route réelle) entre les stops pour le calcul final IK, indépendamment du compteur GPS temps réel\n\n---"
  },
  {
    "origin": "frontend",
    "heading": "5. Librairies utilitaires",
    "body": "Fichier   Rôle  \n --- --- \n  `lib/utils.ts`   `cn()` (clsx + tailwind-merge), helpers divers  \n  `lib/distance.ts`   Calcul de distances, barème IK  \n  `lib/geocoding.ts`   Géocodage (Google Maps API)  \n  `lib/idle-callback.ts`   `deferTask()`, `whenInteractive()`, `preloadModule()`  \n  `lib/image-transform.ts`   Conversion images (WebP)  \n  `lib/image-utils.ts`   Helpers images  \n  `lib/pdf-utils.ts`   Génération PDF (html2pdf)  \n  `lib/print-utils.ts`   Impression (window.print)  \n  `lib/sounds.ts`   Sons UI (feedback sonore)  \n  `lib/ssr-utils.ts`   Helpers SSR (détection server/client)  \n\n---"
  },
  {
    "origin": "frontend",
    "heading": "Tailwind Config",
    "body": "- `tailwind.config.ts` : mapping des tokens CSS vers les classes Tailwind\n- Base color : `slate`\n- Prefix : aucun\n- Plugins : `tailwindcss-animate`"
  },
  {
    "origin": "frontend",
    "heading": "Composants shadcn/ui",
    "body": "- Config : `components.json` (style `default`, `rsc: false`)\n- Aliases : `@/components`, `@/lib`, `@/hooks`, `@/components/ui`\n\n---"
  },
  {
    "origin": "frontend",
    "heading": "Lazy loading",
    "body": "- **Toutes les pages** sont lazy-loaded via `React.lazy()` + `Suspense`\n- Les composants UI non critiques (`Toaster`, `Sonner`, `TooltipProvider`) sont lazy\n- `Recharts` est lazy via `LazyCharts.tsx`\n- `ProfileKmChart` est lazy dans `Profile.tsx`"
  },
  {
    "origin": "frontend",
    "heading": "Optimisations",
    "body": "Technique   Détail  \n --- --- \n  React Query   staleTime 5min, retry 2, pas de refetch on focus  \n  Code splitting   Chaque page = chunk séparé  \n  Image lazy   `OptimizedImage` avec loading lazy  \n  Wake Lock   Écran allumé en mode tournée  \n  Idle callback   Tâches non critiques différées  \n  Fallback `null`   `PageLoader = () => null` (pas de flash)"
  },
  {
    "origin": "frontend",
    "heading": "Fichiers de test",
    "body": "Fichier   Cible  \n --- --- \n  `components/AuthForm.test.tsx`   AuthForm  \n  `components/ThresholdAlert.test.tsx`   ThresholdAlert  \n  `components/VehicleCard.test.tsx`   VehicleCard  \n  `types/trip.test.ts`   Types Trip  \n  `test/setup.ts`   Config Vitest  \n\n---"
  },
  {
    "origin": "frontend",
    "heading": "Trajets récurrents (UI)",
    "body": "- `src/components/NewTripSheet.tsx` : toggle **Récurrent** sous le motif, expose checkboxes jours, durée en semaines, mois actifs. Mode `recurringOnly` pour création directe d'une récurrence sans trip ponctuel.\n- `src/components/RecurringTripsModal.tsx` : liste/édition/suppression des récurrences (jours, `weeks_duration`, `active_months`). Bouton **+** ouvrant `NewTripSheet` en mode `recurringOnly`.\n- `src/hooks/useRecurringTrips.ts` : CRUD via React Query sur `recurring_trips`.\n- `src/pages/MesTrajets.tsx` : footer 3 colonnes (Adresses / Récurrents / Nouveau), bouton \"Récurrents\" icône seule sur mobile. Support `?tab=RECURRENT` pour auto-ouvrir la modal.\n- `src/pages/MesTrajetsLanding.tsx` : landing SEO/GEO `/mes-trajets` avec JSON-LD `FAQPage` + `HowTo` + `SoftwareApplication`.\n- `src/components/marketing/IKSimulator.tsx` : simulateur IK réutilisable (lead magnet) embarqué sur `Landing.tsx` et `BaremeIK2026.tsx`."
  },
  {
    "origin": "frontend",
    "heading": "Sécurité front (juin 2026)",
    "body": "- `src/lib/print-utils.ts` : helper `esc()` pour échapper toutes les données utilisateur dans le HTML/JS des rapports imprimables (XSS).\n- `useAuth` : nettoyage explicite du token Supabase en `localStorage` au signOut pour éviter les sessions fantômes après 403 serveur."
  },
  {
    "origin": "frontend",
    "heading": "Partenaires sortants (UI)",
    "body": "- `src/hooks/usePartners.ts` : React Query, filtre `is_active`, ciblage `target_pages` + `target_personas`. Helper `buildPartnerRedirectUrl()` qui construit l'URL via `partner-redirect` edge function avec UTM auto.\n- `src/components/marketing/PartnerCard.tsx` : bloc inline (variant `inline`/`compact`). Retourne `null` si aucun partenaire actif ne match → invisible par défaut.\n- `src/components/marketing/PartnerStrip.tsx` : bandeau multi-logos placé en bas des landings (`/`, `/frais-reels`, `/tarifs`).\n- `src/components/admin/AdminPartners.tsx` : CRUD admin (onglet **Admin → Coûts → Partenaires**) avec KPIs (clics, sessions uniques, revenu estimé, courbe 7j).\n- Intégrations actuelles : `Landing.tsx` (sous `<IKSimulator />` + footer strip), `FraisReels.tsx` (strip), `Tarifs.tsx` (strip).\n- Tous les liens sortants : `target=\"_blank\"` + `rel=\"sponsored nofollow noopener\"`."
  },
  {
    "origin": "frontend",
    "heading": "Tournées — étapes horodatées & audit (juillet 2026)",
    "body": "- `src/types/trip.ts` : `TourStopData.timestamp` (Date d'arrivée à l'étape) — source de vérité pour l'audit, alimentée par les 3 origines de tournée (GPS live, import Calendar mode `tour`, regroupement manuel).\n- `src/components/TripCard.tsx` : détection tournée unifiée sur `tourStops.length >= 2` (indépendante du `purpose`). Sur desktop, boutons **édition** (crayon) et **suppression** (croix) toujours montés mais révélés au survol/focus clavier via `group-hover` + `group-focus-within` (`opacity-0 → opacity-100`), évitant le layout shift et préservant l'accessibilité clavier. Sur mobile, comportement inchangé (sélection multi).\n- `src/lib/print-utils.ts` : rapport PDF affiche pour chaque tournée le détail des étapes avec heure d'arrivée (`Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' })`), fallback explicite `(heure non enregistrée)` si absent, suffixe `· heures Europe/Paris` dans l'en-tête pour lever toute ambiguïté d'audit. Trip parent + détail regroupés dans un `<tbody style=\"page-break-inside: avoid\">` pour empêcher l'orphelinage lors des sauts de page."
  },
  {
    "origin": "frontend",
    "heading": "Modale « Compléter le trajet » — centrage & pré-remplissage (juillet 2026)",
    "body": "- `src/components/CompleteAddressSheet.tsx` : passage de `Sheet` (bottom-aimanté) à `Dialog` (centré, `max-h-[90vh]` avec `overflow-y-auto`) — meilleur ergonomie desktop et évite le masquage par le clavier mobile.\n- **Pré-remplissage** : helper `isGenericAddress()` (détecte `\"Maison\"`, `\"Domicile\"`, chaînes vides) — l'`useEffect` de pré-remplissage priorise désormais `trip.start_location` / `trip.end_location` réels et ne retombe sur la Maison courante que si l'adresse stockée est générique. Corrige le bug où une adresse Châteaurenard devenait Auriac-sur-Vendinelle après ouverture de la modale."
  },
  {
    "origin": "frontend",
    "heading": "Intégrations d'agents (MCP) — Frontend (juillet 2026)",
    "body": "- `src/pages/OAuthConsent.tsx` (route `/.lovable/oauth/consent`) — écran de consentement OAuth 2.1 pour les clients MCP (ChatGPT, Claude, Cursor). Utilise `supabase.auth.oauth.{getAuthorizationDetails,approveAuthorization,denyAuthorization}` (namespace beta).\n- **Redirection auth** : `src/components/AuthForm.tsx` consomme `?next=` sur sign-in, sign-up (`emailRedirectTo`) **et** OAuth social (`redirect_uri`) pour renvoyer l'utilisateur vers la page de consentement après authentification — sans quoi le connecteur \"Add to Lovable\" retombe silencieusement sur `/`.\n- **Serveur MCP** : défini dans `src/lib/mcp/` (voir doc backend), 4 outils exposés : `list_vehicles`, `list_trips`, `get_ytd_summary`, `create_trip`.\n- **Vite plugin** : `mcpPlugin()` dans `vite.config.ts` — régénère `supabase/functions/mcp/index.ts` à chaque build."
  },
  {
    "origin": "frontend",
    "heading": "Changelog",
    "body": "- **1.4** (24 juillet 2026) — Modale « Compléter le trajet » centrée + pré-remplissage adresses réelles. Ajout page OAuthConsent et intégration MCP.\n- **1.3** (4 mai 2026) — Tournées, étapes horodatées et audit PDF."
  }
];
