# IKTracker — Documentation Technique Backend

> Version 2.3 — 23 avril 2026

## Table des matières

1. [Architecture globale](#1-architecture-globale)
2. [Base de données](#2-base-de-données)
3. [Edge Functions](#3-edge-functions)
4. [Authentification & Rôles](#4-authentification--rôles)
5. [SEO & Bot-routing](#5-seo--bot-routing)
6. [Intégrations externes](#6-intégrations-externes)
7. [Monitoring & Coûts](#7-monitoring--coûts)

---

## 1. Architecture globale

### Hébergement

| Composant | Service | Détail |
|---|---|---|
| Frontend | Lovable Publish | SPA React déployée automatiquement |
| Backend | Lovable Cloud (Supabase) | PostgreSQL + Edge Functions (Deno) |
| DNS & Edge | Cloudflare | Proxy, Workers, SSL (mode Full) |
| Domaine principal | iktracker.fr | Apex, toute autorité SEO consolidée ici |
| Domaine secondaire | iktracker.com | Redirigé 301 vers .fr via Worker |

### Flux de requête

```
Utilisateur → Cloudflare DNS (proxied)
  → Cloudflare Worker (iktracker-bot-router)
    ├─ Bot détecté → Edge Function meta-renderer → HTML pré-rendu
    ├─ /sitemap.xml → Edge Function sitemap (fallback: fichier statique)
    ├─ Asset statique → Origin + cache headers
    ├─ Route privée (/app/*) → Origin passthrough
    └─ Utilisateur normal → Origin (SPA React)
```

### Domaines & Redirections

- `www.iktracker.fr` → 301 → `iktracker.fr`
- `iktracker.com` → 301 → `iktracker.fr`
- `www.iktracker.com` → 301 → `iktracker.fr`
- Exception : `/robots.txt` et `/llms.txt` sur .com sont servis par proxy depuis .fr

---

## 2. Base de données

### Tables principales (~30 tables)

#### Données utilisateur

| Table | Description | RLS |
|---|---|---|
| `trips` | Trajets enregistrés (distance, IK, date, véhicule) | ✅ user_id |
| `vehicles` | Véhicules de l'utilisateur (CV fiscaux, plaque) | ✅ user_id |
| `locations` | Adresses enregistrées (domicile, travail) | ✅ user_id |
| `frequent_destinations` | Destinations fréquentes (mot-clé → adresse) | ✅ user_id |
| `distance_cache` | Cache des distances calculées | ✅ user_id |
| `user_preferences` | Préférences (persona, comptable, visites) | ✅ user_id |
| `tour_sessions` | Sessions de tournée GPS en cours (+ compteurs reprise) | ✅ user_id |
| `tour_recovery_events` | Journal des événements de reprise de tournée (modal, auto-finalize, erreurs, toasts) | ✅ user_id + admin/viewer |

#### Calendrier

| Table | Description | RLS |
|---|---|---|
| `calendar_connections` | Connexions Google/Outlook Calendar (tokens OAuth) | ✅ user_id |

#### Partage & Export

| Table | Description | RLS |
|---|---|---|
| `share_events` | Événements de partage de rapport | ✅ user_id |
| `report_shares` | Rapports HTML partagés (liens temporaires) | ✅ via Edge Function |
| `download_clicks` | Clics sur le bouton télécharger | ✅ user_id |

#### Blog & CMS

| Table | Description | RLS |
|---|---|---|
| `blog_posts` | Articles de blog (titre, slug, contenu, statut) | ✅ lecture publique, écriture admin |
| `blog_api_keys` | Clés API pour le CMS headless | ✅ admin |
| `page_contents` | Contenu dynamique des pages marketing | ✅ lecture publique |

#### Admin & Analytics

| Table | Description | RLS |
|---|---|---|
| `user_roles` | Rôles (admin, viewer, user) | ✅ admin |
| `marketing_analytics` | Événements analytics (page_view, cta_click, etc.) | ✅ insert public, lecture admin |
| `request_logs` | Logs de requêtes HTTP (via Worker) | ✅ admin |
| `api_usage_logs` | Logs d'utilisation des APIs (coûts, tokens) | ✅ admin |
| `api_access_logs` | Logs d'accès à l'API blog | ✅ admin |
| `api_audit_logs` | Audit trail des modifications API | ✅ admin |
| `error_logs` | Erreurs applicatives | ✅ admin |
| `autopilot_events` | Événements autopilote (monitoring) | ✅ admin |
| `excluded_ips` | IPs exclues des analytics | ✅ admin |
| `feedback` | Messages de feedback utilisateur | ✅ user_id |
| `referral_sources` | Sources de découverte (questionnaire) | ✅ user_id |

#### SEO & Config

| Table | Description | RLS |
|---|---|---|
| `site_config` | Configuration globale du site (JSON) | ✅ admin |
| `site_seo_config` | Config SEO (robots.txt, llms.txt dynamiques) | ✅ admin |
| `seo_redirects` | Redirections SEO configurables | ✅ lecture publique |
| `code_injections` | Injections de code (tracking, scripts) | ✅ admin |

#### Affiliation & Surveys

| Table | Description | RLS |
|---|---|---|
| `affiliate_codes` | Codes d'affiliation | ✅ admin |
| `affiliate_uses` | Utilisations de codes | ✅ admin |
| `surveys` | Sondages in-app | ✅ admin |
| `survey_variants` | Variantes A/B des sondages | ✅ admin |
| `survey_responses` | Réponses aux sondages | ✅ user_id |
| `survey_impressions` | Impressions des sondages | ✅ user_id |

#### Divers

| Table | Description | RLS |
|---|---|---|
| `vehicle_cache` | Cache des données véhicule (plaque → marque/modèle) | ✅ lecture publique |
| `takeout_import_attempts` | Tentatives d'import Google Takeout | ✅ user_id |

### Fonctions de base de données (24 fonctions)

#### Fonctions d'accès aux rôles

| Fonction | Description |
|---|---|
| `has_role(_user_id, _role)` | Vérifie si un user a un rôle (SECURITY DEFINER) |
| `has_admin_or_viewer_role(_user_id)` | Vérifie admin OU viewer |

#### Fonctions admin — Statistiques

| Fonction | Description |
|---|---|
| `get_admin_stats(start_date, end_date)` | Stats globales (users, trips, km, IK) |
| `get_monthly_stats(months_back)` | Stats mensuelles |
| `get_daily_active_users(days_back)` | DAU par jour |
| `get_rolling_active_users(days_back, window_size)` | Utilisateurs actifs glissants |
| `get_registrations_by_day(days_back)` | Inscriptions par jour |
| `get_top_users(sort_by, limit_count)` | Top users par trips/km/IK |
| `get_user_stats(_user_id)` | Stats détaillées d'un utilisateur |
| `search_users(search_term, limit_count)` | Recherche d'utilisateurs |
| `get_recent_signups(limit_count)` | Dernières inscriptions |
| `get_total_tours_count(start_date, end_date)` | Nombre total de tournées |

#### Fonctions admin — Marketing & Coûts

| Fonction | Description |
|---|---|
| `get_marketing_stats(days_back)` | Stats marketing (vues, CTA, simulations) |
| `get_marketing_stats_by_page(days_back)` | Stats par page |
| `get_marketing_views_by_day(days_back)` | Vues marketing par jour |
| `get_signup_clicks_by_day(start, end)` | Clics signup par jour |
| `get_bareme_simulations_by_day(days_back)` | Simulations barème par jour |
| `get_download_stats()` | Stats de téléchargement |
| `get_download_clicks_by_day(days_back)` | Téléchargements par jour |
| `get_share_stats()` | Stats de partage |
| `get_shares_by_day(days_back)` | Partages par jour |
| `get_takeout_import_stats()` | Stats d'import Takeout |
| `get_api_cost_stats(days_back)` | Coûts API globaux |
| `get_api_cost_by_day(days_back)` | Coûts API par jour |
| `get_api_cost_by_function(days_back)` | Coûts par fonction |
| `get_api_cost_by_model(days_back)` | Coûts par modèle IA |

#### Fonctions utilitaires

| Fonction | Description |
|---|---|
| `cleanup_expired_shares()` | Supprime les rapports expirés |
| `cleanup_old_phone_numbers()` | Anonymise les téléphones > 7 jours |
| `update_updated_at_column()` | Trigger pour auto-update updated_at |

---

## 3. Edge Functions

### Vue d'ensemble (14 fonctions)

| Fonction | Lignes | Auth | Méthode | Rôle |
|---|---|---|---|---|
| `blog-api` | 831 | API Key | GET/POST/PUT/DELETE | CMS headless CRUD |
| `meta-renderer` | 826 | Non | GET | Pré-rendu HTML pour bots |
| `sync-calendar-trips` | 705 | JWT | POST | Synchronisation calendrier → trajets |
| `calendar-debug` | 495 | JWT | GET/POST | Debug des connexions calendrier |
| `parse-takeout` | 496 | JWT | POST | Import Google Takeout |
| `vehicle-lookup` | 421 | JWT | POST | Recherche véhicule par plaque |
| `view-report` | 387 | Non | GET | Affichage rapport partagé |
| `recalculate-distances` | 374 | JWT | POST | Recalcul des distances via Google Maps |
| `google-calendar-auth` | 196 | Non | GET | OAuth Google Calendar |
| `outlook-calendar-auth` | 173 | Non | GET | OAuth Outlook Calendar |
| `convert-blog-images` | 172 | JWT (admin) | POST | Conversion d'images blog |
| `sitemap` | 138 | Non | GET | Génération sitemap XML dynamique |
| `marina-analyze` | 86 | JWT | GET/POST | Analyse IA de documents (Marina) |
| `google-maps-key` | 62 | JWT | GET | Fournit la clé Google Maps au client |

### Détail par fonction

#### `blog-api` — CMS Headless

- **Auth** : Clé API via header `x-api-key` (validée contre `blog_api_keys`)
- **Endpoints** :
  - `GET /posts` — Liste des articles. Params : `status=published|draft|archived|all` (défaut: `published`), `all=true` (alias de `status=all`), `limit`, `offset`
  - `POST /posts` — Créer un article
  - `PUT /posts/:id` — Modifier un article
  - `DELETE /posts/:id` — Supprimer un article
  - `GET /pages/:key` — Lire le contenu d'une page
  - `PUT /pages/:key` — Modifier le contenu d'une page
- **Secrets** : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Audit** : Chaque modification est enregistrée dans `api_audit_logs`

#### `meta-renderer` — Pré-rendu SEO/GEO

- **Auth** : Aucune (appelé par le Worker Cloudflare)
- **Endpoint** : `GET ?path=/chemin`
- **Logique** : Génère un HTML complet avec contenu statique, JSON-LD, Open Graph
- **Pages supportées** : ~20 pages marketing + tous les articles de blog
- **Secrets** : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

#### `sync-calendar-trips` — Synchronisation calendrier

- **Auth** : JWT utilisateur
- **Endpoint** : `POST` avec body `{ connectionId, syncDays }`
- **Logique** : Lit les événements Google/Outlook, extrait les adresses, calcule les distances, crée les trajets
- **Secrets** : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

#### `vehicle-lookup` — Recherche par plaque

- **Auth** : JWT utilisateur
- **Endpoint** : `POST` avec body `{ licensePlate }`
- **Sources** : DrivePieces API, Earlweb API (fallback)
- **Cache** : Résultats stockés dans `vehicle_cache`
- **Secrets** : `IMMATRICULATION_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

#### `sitemap` — Sitemap XML dynamique

- **Auth** : Aucune
- **Endpoint** : `GET`
- **Logique** : 17 pages statiques + articles blog (paginated)
- **Cache** : `max-age=300` (5 minutes)
- **Proxy** : Servi via le Worker Cloudflare sur `/sitemap.xml`

#### `view-report` — Rapports partagés

- **Auth** : Aucune (accès par UUID)
- **Endpoint** : `GET ?id=uuid`
- **Logique** : Lit `report_shares` via service role, incrémente le compteur d'accès
- **Sécurité** : Proxy via Edge Function pour éviter l'énumération directe de la table

#### `google-calendar-auth` / `outlook-calendar-auth` — OAuth

- **Auth** : Aucune (callbacks OAuth)
- **Logique** : Échange le code OAuth contre un token, stocke dans `calendar_connections`
- **Sécurité** : Validation des redirect URLs contre une whitelist
- **Secrets** : `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`

#### `marina-analyze` — Analyse IA

- **Auth** : JWT utilisateur
- **Endpoint** : `POST` (soumettre un document), `GET ?job_id=` (poll le statut)
- **Secrets** : `MARINA_API_KEY`

### Configuration (supabase/config.toml)

Toutes les Edge Functions utilisent `verify_jwt = false` — la validation JWT est faite dans le code de chaque fonction.

---

## 4. Authentification & Rôles

### Flow d'authentification

1. **Signup** : Email + mot de passe (confirmation email requise)
2. **Login** : Email/mot de passe ou Google OAuth
3. **Session** : JWT géré par le client Supabase (`supabase.auth`)

### Scopes OAuth au sign-in

Lors de l'inscription/connexion via un provider OAuth, les scopes calendrier sont demandés dès le premier sign-in :

| Provider | Scopes demandés |
|---|---|
| Google | `https://www.googleapis.com/auth/calendar.readonly` |
| Azure (Microsoft) | `email offline_access Calendars.Read` |

Le token obtenu est automatiquement stocké dans `calendar_connections` avec `is_active = true`. L'utilisateur peut ensuite désactiver la synchronisation (`is_active = false`) sans perdre sa session d'authentification — seul le flux de données calendrier est interrompu.

### Rôles

| Rôle | Enum | Accès |
|---|---|---|
| `admin` | `app_role` | Accès complet (stats, users, config, blog) |
| `viewer` | `app_role` | Lecture des stats admin uniquement |
| `user` | `app_role` | Accès à ses propres données |

### Table `user_roles`

```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
```

### Fonctions de vérification

```sql
-- Vérifie un rôle spécifique (SECURITY DEFINER, pas de récursion RLS)
public.has_role(_user_id UUID, _role app_role) → boolean

-- Vérifie admin OU viewer
public.has_admin_or_viewer_role(_user_id UUID) → boolean
```

### RLS Pattern

Toutes les tables utilisateur suivent ce pattern :
```sql
-- Lecture : l'utilisateur voit ses propres données
CREATE POLICY "Users can view own data" ON public.table_name
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Écriture : l'utilisateur modifie ses propres données
CREATE POLICY "Users can manage own data" ON public.table_name
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);
```

---

## 5. SEO & Bot-routing

### Cloudflare Worker (`iktracker-bot-router`)

**Rôle** : Intercepte toutes les requêtes sur iktracker.fr et route en fonction du contexte.

**User-Agents détectés** (30+) :
- Moteurs de recherche : Googlebot, Bingbot, Yandex, DuckDuckBot, Applebot
- Réseaux sociaux : Facebook, Twitter, LinkedIn, WhatsApp, Telegram, Discord, Pinterest
- IA : GPTBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Amazonbot
- Audit : crawlers.fr, Screaming Frog, Ahrefs, Semrush

**Logique de routage** :
1. `www.iktracker.fr` → 301 → apex
2. `iktracker.com` → 301 → `.fr` (sauf robots.txt/llms.txt proxiés)
3. `/sitemap.xml` → Proxy vers Edge Function (fallback fichier statique)
4. Assets statiques → Passthrough + cache headers
5. Routes privées → Passthrough
6. Bot détecté → Edge Function `meta-renderer`
7. Utilisateur normal → Origin SPA

**Headers de diagnostic** :
- `X-Rendered-By: cloudflare-worker`
- `X-Sitemap-Source: edge-function | static-fallback | error`

### Sitemap (architecture hybride v2)

| Source | Rôle | Quand |
|---|---|---|
| Edge Function `sitemap` | Source primaire dynamique | Chaque requête (cache 5 min) |
| Cloudflare Worker | Proxy transparent | Intercepte `/sitemap.xml` |
| `public/sitemap.xml` | Fallback statique | Seulement si Edge Function down |
| `scripts/generate-sitemap.cjs` | Génère le fallback | Chaque build (prebuild) |
| `scripts/validate-sitemap-sync.cjs` | Validation CI | Compare les 2 sources |

**Contenu** : 17 pages statiques + ~45 articles de blog ≈ 62 URLs

### Meta-renderer

Sert un HTML complet avec :
- Contenu textuel (paragraphes, features, FAQ, tableaux)
- JSON-LD (Organization, WebApplication, Article, BreadcrumbList, FAQPage)
- Open Graph + Twitter Cards
- Liens internes pour la profondeur de crawl

### robots.txt

```
Sitemap: https://iktracker.fr/sitemap.xml
User-agent: * → Allow: /
```

Tous les crawlers IA sont explicitement autorisés (`GPTBot`, `Claude-Web`, `PerplexityBot`, etc.).

---

## 6. Intégrations externes

### Google Calendar

| Aspect | Détail |
|---|---|
| OAuth | Authorization Code Flow |
| Scopes | `calendar.readonly`, `calendar.events.readonly` |
| Edge Functions | `google-calendar-auth` (OAuth callback), `sync-calendar-trips` (sync), `calendar-debug` (debug) |
| Secrets | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Données | Tokens stockés dans `calendar_connections` |

### Outlook Calendar

| Aspect | Détail |
|---|---|
| OAuth | Authorization Code Flow (Microsoft Identity Platform) |
| Scopes | `Calendars.Read` |
| Edge Function | `outlook-calendar-auth` |
| Secrets | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |

### API Véhicules (immatriculation)

| Aspect | Détail |
|---|---|
| Sources | DrivePieces API (primaire), Earlweb/Moove-France (fallback) |
| Edge Function | `vehicle-lookup` |
| Secret | `IMMATRICULATION_API_KEY` |
| Cache | Résultats en DB (`vehicle_cache`) |
| Données | Marque, modèle, CV fiscaux, année, énergie |

### Google Maps

| Aspect | Détail |
|---|---|
| Usage | Calcul de distances, géocodage, autocomplete |
| Edge Function | `google-maps-key` (fournit la clé au client) |
| Secret | Clé servie depuis les secrets Supabase |

### Marina (Analyse IA)

| Aspect | Détail |
|---|---|
| Usage | Analyse de documents (justificatifs kilométriques) |
| Edge Function | `marina-analyze` |
| Secret | `MARINA_API_KEY` |
| Workflow | Asynchrone (POST → job_id → GET polling) |

### Blog API (CMS Headless)

| Aspect | Détail |
|---|---|
| Auth | Clés API (table `blog_api_keys`) |
| Edge Function | `blog-api` (831 lignes) |
| CRUD | Articles (`blog_posts`) + Pages (`page_contents`) |
| Audit | Toute modification loggée dans `api_audit_logs` |
| Webhook | `BLOG_WEBHOOK_TOKEN` pour notifications |

---

## 7. Monitoring & Coûts

### Tables de monitoring

| Table | Contenu |
|---|---|
| `api_usage_logs` | Appels API (fonction, modèle, tokens, coût en €) |
| `error_logs` | Erreurs applicatives (type, message, source, metadata) |
| `request_logs` | Requêtes HTTP (path, status, bot, country) |
| `marketing_analytics` | Événements marketing (page_view, cta_click, signup_click) |
| `autopilot_events` | Événements de monitoring (severity, resolved) |

### Secrets configurés (15)

| Secret | Usage |
|---|---|
| `SUPABASE_URL` | URL du projet (auto) |
| `SUPABASE_ANON_KEY` | Clé publique (auto) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (auto) |
| `SUPABASE_PUBLISHABLE_KEY` | Clé publiable (auto) |
| `SUPABASE_DB_URL` | URL de connexion DB (auto) |
| `GOOGLE_CLIENT_ID` | OAuth Google Calendar |
| `GOOGLE_CLIENT_SECRET` | OAuth Google Calendar |
| `MICROSOFT_CLIENT_ID` | OAuth Outlook |
| `MICROSOFT_CLIENT_SECRET` | OAuth Outlook |
| `IMMATRICULATION_API_KEY` | API recherche véhicule |
| `MARINA_API_KEY` | API analyse IA |
| `RAPIDAPI_KEY` | (legacy) |
| `BLOG_API` | (legacy) |
| `BLOG_WEBHOOK_TOKEN` | Webhook de notification blog |
| `LOVABLE_API_KEY` | API Lovable AI Gateway |

### Storage Buckets

| Bucket | Public | Usage |
|---|---|---|
| `feedback-images` | ✅ | Images jointes aux feedbacks |
| `blog-images` | ✅ | Images des articles de blog |
| `survey-screenshots` | ❌ | Screenshots des sondages |

---

## Annexe — Commandes utiles

```bash
# Valider la synchronisation des sources sitemap
node scripts/validate-sitemap-sync.cjs

# Générer le sitemap statique (fallback)
node scripts/generate-sitemap.cjs

# Vérifier la source du sitemap en production
curl -sI https://iktracker.fr/sitemap.xml | grep X-Sitemap-Source

# Tester le meta-renderer
curl -s "https://iktracker.fr/" -H "User-Agent: Googlebot" | head -50
```
