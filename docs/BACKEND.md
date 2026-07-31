# IKTracker — Documentation Technique Backend

> Version 3.5 — 30 juillet 2026

## Table des matières

1. [Architecture globale](#1-architecture-globale)
2. [Base de données](#2-base-de-données)
3. [Edge Functions](#3-edge-functions)
4. [Authentification & Rôles](#4-authentification--rôles)
5. [SEO & Bot-routing](#5-seo--bot-routing)
6. [Intégrations externes](#6-intégrations-externes)
7. [Monitoring & Coûts](#7-monitoring--coûts)
8. [Partner API & SSO](#8-partner-api--sso)

---

## 1. Architecture globale

### Hébergement

| Composant | Service | Détail |
|---|---|---|
| Frontend | Lovable Publish | SPA React déployée automatiquement |
| Backend | Lovable Cloud (Supabase) | PostgreSQL + Edge Functions (Deno) |
| DNS & Edge | Cloudflare | Proxy, Workers, SSL (mode Full) |
| Domaine canonique | **iktracker.fr** (apex) | Hôte SEO/GEO — Worker Cloudflare actif, pre-rendering bots |
| Sous-domaine www | www.iktracker.fr | 301 → apex via Cloudflare Redirect Rule |
| Domaine secondaire | iktracker.com / www.iktracker.com | 301 → apex via Worker |

### Flux de requête

```
Utilisateur → Cloudflare DNS (proxied)
  → Cloudflare Worker (iktracker-bot-router)
    ├─ www.* / .com → 301 → apex iktracker.fr
    ├─ Bot détecté → Edge Function meta-renderer → HTML pré-rendu
    ├─ /sitemap.xml → Edge Function sitemap (fallback: fichier statique)
    ├─ Slug legacy (LEGACY_REDIRECTS) → 301 vers slug moderne
    ├─ Asset statique → Origin + cache headers
    ├─ Route privée (/app/*) → Origin passthrough
    └─ Utilisateur normal → Origin (SPA React)
```

### Domaines & Redirections

- Hôte canonique : **iktracker.fr** (apex) — canonicals, og:url, sitemap, JSON-LD, robots pointent tous vers l'apex.
- `www.iktracker.fr` → 301 → `https://iktracker.fr` (Cloudflare Redirect Rule + fallback Worker).
- `iktracker.com` / `www.iktracker.com` → 301 → `https://iktracker.fr` via Worker.
- Exception : `/robots.txt` et `/llms.txt` sur .com sont servis par proxy depuis iktracker.fr.
- **Redirections legacy 301** (map `LEGACY_REDIRECTS` dans le Worker) : `/install → /installer`, `/mestrajets → /mes-trajets`, `/experts-comptables → /expert-comptable`, `/nos-offres → /tarifs`, `/simulateur → /bareme-ik-2026`, `/guide-complet-indemnites-kilometriques-frais-reels → /blog/indemnites-kilometriques-2026-guide-complet`, `/fonctionnalites/suivi-kilometrique-automatique → /mode-tournee`, etc. Ajouter une entrée = éditer la map puis `wrangler deploy`.

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
| `user_preferences` | Préférences (persona, comptable, visites, didacticiel terminé, `calendar_import_mode` : `individual` ou `tour`, `ik_rate_override` : `auto` \| `tier2` \| `tier3` pour figer le taux IK) | ✅ user_id |
| `tour_sessions` | Sessions de tournée GPS en cours (+ compteurs reprise) | ✅ user_id |
| `tour_recovery_events` | Journal des événements de reprise de tournée (modal, auto-finalize, erreurs, toasts) | ✅ user_id + admin/viewer |

#### Calendrier

| Table | Description | RLS |
|---|---|---|
| `calendar_connections` | Connexions Google/Outlook Calendar (tokens OAuth) | ✅ user_id |
| `calendar_connection_attempts` | Journal des tentatives de connexion/synchronisation calendrier (Google, Outlook, ICS) | ✅ user_id + admin |

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
| `blog_api_keys` | Clés API pour le CMS headless (avec quota mensuel : `monthly_quota`, `usage_current_month`, `usage_reset_at`) | ✅ admin |
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
| `vehicle_cache` | Cache des données véhicule (plaque → marque/modèle) | ✅ authenticated only |
| `takeout_import_attempts` | Tentatives d'import Google Takeout | ✅ user_id |

#### Partenaires & SSO (intégrations B2B)

| Table | Description | RLS |
|---|---|---|
| `partner_api_keys` | Clés API partenaires (hash + JWT secret + scopes + quota mensuel). **Colonnes sensibles `jwt_secret`/`key_hash` réservées admin** (column-level GRANT). | ✅ admin (full) / viewer (colonnes safe uniquement) |
| `partner_api_keys_safe` *(vue)* | Projection sans secrets (`jwt_secret`, `key_hash` exclus). À utiliser depuis le frontend pour les viewers. | ✅ authenticated |
| `partner_users` | Mapping `external_user_id` (partenaire) → `iktracker_user_id` | ✅ admin |
| `partner_request_logs` | Logs des appels Partner API (path, status, temps, partenaire) | ✅ admin |
| `partner_webhooks` | Webhooks sortants partenaires (URL, secret HMAC, événements) | ✅ admin |

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
| `get_tour_mode_stats(days_back)` | Compteurs Mode Tournée (totales, manuel/auto, abandonnées, moyennes, uniques 7j) |
| `get_tour_mode_daily(days_back)` | Série journalière : tournées créées + utilisateurs uniques 7j glissants |
| `get_tour_mode_personas(days_back)` | Répartition par persona des utilisateurs Mode Tournée |

#### Fonctions admin — Marketing & Coûts

| Fonction | Description |
|---|---|
| `get_marketing_stats(days_back)` | Stats marketing (vues, CTA, simulations) |
| `get_marketing_stats_by_page(days_back)` | Stats par page |
| `get_signup_funnel(days_back)` | Funnel signup (vues → OAuth/form → erreurs → comptes créés) + répartition par provider et top erreurs. Admin/viewer uniquement. Filtre symétrique : vues ET `new_users` excluent admins + IPs de `excluded_ips` (via events liés à `auth.users.id`). |
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

### Volumétrie globale (avril 2026)

| Périmètre | Lignes |
|---|---|
| **Backend total** | **~13 300** |
| ├─ Edge Functions (`supabase/functions/`) | 7 103 |
| └─ Migrations SQL (`supabase/migrations/`) | 6 204 |
| Cloudflare Worker + scripts (`scripts/`, `cloudflare-worker/`) | 459 |
| Frontend (`src/`, à titre de comparaison) | 54 512 |

Le backend pèse ≈ 20 % du codebase total (~68 k lignes).

### Vue d'ensemble (18 fonctions)

| Fonction | Lignes | Auth | Méthode | Rôle |
|---|---|---|---|---|
| `partner-api` | 1 002 | API Key partenaire (+ JWT signé pour SSO) | GET/POST | API B2B (vehicle, IK, trips, stats, SSO) |
| `blog-api` | 902 | API Key | GET/POST/PUT/DELETE | CMS headless CRUD (+ blacklist + corbeille) |
| `meta-renderer` | 826 | Non | GET | Pré-rendu HTML pour bots & moteurs IA |
| `sync-calendar-trips` | 705 | JWT | POST | Synchronisation calendrier → trajets |
| `docs` | 668 | JWT (admin/viewer) | GET | Documentation backend (markdown/HTML) |
| `parse-takeout` | 496 | JWT | POST | Import Google Takeout |
| `calendar-debug` | 495 | JWT | GET/POST | Debug des connexions calendrier |
| `vehicle-lookup` | 421 | JWT | POST | Recherche véhicule par plaque |
| `view-report` | 387 | Non | GET | Affichage rapport partagé |
| `recalculate-distances` | 374 | JWT | POST | Recalcul des distances via Google Maps |
| `google-calendar-auth` | 196 | Non | GET | OAuth Google Calendar |
| `outlook-calendar-auth` | 173 | Non | GET | OAuth Outlook Calendar |
| `convert-blog-images` | 172 | JWT (admin) | POST | Conversion d'images blog |
| `sitemap` | 138 | Non | GET | Génération sitemap XML dynamique |
| `wavespeed` | ~150 | JWT (**admin uniquement**) | ANY | Proxy générique Wavespeed.ai (crédits projet — accès strictement réservé) |
| `track-event` | ~120 | Public (JWT optionnel) | POST | Ingestion `marketing_analytics` avec IP capturée server-side (headers CF), filtre bots + admins. CORS restreint à `iktracker.fr`, `lovable.app`, `lovableproject.com`. Cron `purge-marketing-analytics-daily` (03:15 UTC) supprime les événements > 90 j via `purge_old_marketing_analytics()`. |
| `marina-analyze` | 86 | JWT | GET/POST | Analyse IA de documents (Marina) |
| `google-maps-key` | 62 | JWT | GET | Fournit la clé Google Maps au client |

### Détail par fonction

#### `docs` — Documentation backend

- **Auth** : JWT utilisateur + rôle `admin` ou `viewer`
- **Endpoint** : `GET ?format=markdown|html`
- **Logique** : Sert le contenu de `docs/BACKEND.md` en Markdown brut ou converti en HTML
- **Formats** : `markdown` (défaut) retourne le fichier brut, `html` retourne une page HTML stylisée
- **Secrets** : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

#### `blog-api` — CMS Headless

- **Auth** : Clé API via header `x-api-key` (validée contre `blog_api_keys`)
- **Endpoints** :
  - `GET /posts` — Liste des articles publiés uniquement (défaut). Params : `status=published|draft|archived|deleted|all`, `all=true` (alias de `status=all` — inclut la corbeille), `limit`, `offset`
  - `GET /posts/:slug` — Lire un article publié (404 si non publié)
  - `POST /posts` — Créer ou mettre à jour un article (upsert par slug). Refus 409 si slug en corbeille (`slug_in_trash`) ou en blacklist (`slug_blacklisted`). Body : `title*, slug*, content, status (draft|published|archived), force` (booléen pour écraser un slug existant)
  - `PUT /posts/:slug` — Modifier un article. Pour **archiver** : `status=archived`. Pour **restaurer** depuis la corbeille ou les archives : `status=published` (ou `draft`)
  - `DELETE /posts/:slug` — **Soft-delete** par défaut : passe `status='deleted'` et `deleted_at=now()`. Réversible via `PUT`
  - `DELETE /posts/:slug?hard=true` — **Purge définitive** (irréversible, à utiliser avec prudence)
  - `GET /pages/:key` — Lire le contenu d'une page
  - `PUT /pages/:key` — Modifier le contenu d'une page (voir clés dynamiques ci-dessous)
- **Statuts d'article** : `draft` (brouillon), `published` (visible publiquement), `archived` (masqué de la liste mais conservé), `deleted` (corbeille — masqué partout, restaurable)
- **Secrets** : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Audit** : Chaque modification est enregistrée dans `api_audit_logs` (actions : `create`, `update`, `soft_delete`, `purge`, `blocked`)

##### Clés dynamiques `page_contents` — Pages marketing

Le frontend lit le champ `content` (JSON) de la table `page_contents` via le hook `usePageContent(pageKey, fallback)`. Si une clé n'existe pas en base, la valeur en dur dans le code est affichée. Toute clé modifiée via `PUT /pages/:key` est immédiatement prise en compte (cache React Query : 1 h).

**`home`** — Page d'accueil (`Landing.tsx`)

| Clé JSON | Section | Élément |
|---|---|---|
| `hero_title` | Hero | H1 principal |
| `hero_highlight` | Hero | Texte coloré sous le H1 (ex: "Barème 2026") |
| `hero_subtitle` | Hero | Paragraphe descriptif sous le H1 |
| `pain_badge` | Pain point Excel | Badge au-dessus du H2 |
| `pain_title_prefix` | Pain point Excel | Début du H2 (avant le texte barré) |
| `pain_title_strike` | Pain point Excel | Texte barré dans le H2 |
| `pain_title_suffix` | Pain point Excel | Fin du H2 (après le texte barré) |
| `pain_subtitle` | Pain point Excel | Paragraphe sous le H2 |
| `stats_title` | Statistiques indépendants | H2 |
| `stats_subtitle` | Statistiques indépendants | Paragraphe sous le H2 |
| `features_title` | Grille fonctionnalités | H2 |
| `mobile_title` | App mobile | H2 |
| `mobile_subtitle` | App mobile | Paragraphe |
| `tour_title` | Mode Tournée | H2 |
| `tour_subtitle` | Mode Tournée | Paragraphe |
| `calendar_title` | Sync Calendriers | H2 |
| `calendar_subtitle` | Sync Calendriers | Paragraphe |
| `pdf_title` | Export PDF | H2 |
| `pdf_subtitle` | Export PDF | Paragraphe |
| `expertise_title` | Expertise fiscale | H2 |
| `expertise_subtitle` | Expertise fiscale | Paragraphe |
| `cta_title` | CTA final | H2 |
| `cta_subtitle` | CTA final | Paragraphe |
| `faq_title` | FAQ | H2 |
| `faq_subtitle` | FAQ | Paragraphe |

**Exemple d'appel Parménion :**

```bash
PUT /pages/home
x-api-key: <clé>
Content-Type: application/json

{
  "content": {
    "hero_title": "Nouveau titre",
    "cta_subtitle": "Nouveau sous-titre CTA"
  }
}
```

> Les clés non envoyées conservent leur valeur actuelle en base. Les clés inconnues du hook sont ignorées côté frontend.

#### `meta-renderer` — Pré-rendu SEO/GEO

- **Auth** : Aucune (appelé par le Worker Cloudflare)
- **Endpoint** : `GET ?path=/chemin`
- **Logique** : Génère un HTML complet avec contenu statique, JSON-LD, Open Graph
- **Pages supportées** : ~20 pages marketing + tous les articles de blog
- **Extracteurs blog SSR** (mirror de `src/lib/blog-schema-extractors.ts`) :
  - `FAQPage` JSON-LD auto-extrait depuis `## Questions fréquentes` / `## FAQ` (Q en H3 ou **gras**, R en dessous)
  - `HowTo` JSON-LD auto-extrait depuis `## Étapes` / `## Procédure` / `## Déroulé` (liste numérotée ou H3)
  - `Article.author` enrichi en `Person` avec `sameAs` (LinkedIn + page fondateur) lorsqu'il s'agit de "Rédaction IKtracker" → résolu vers Adrien de Volontat
  - `BreadcrumbList` JSON-LD injecté côté serveur
  - Version texte du CTA segmenté (Salarié/Particulier vs Commercial/Libéral) rendue pour les bots qui n'exécutent pas JS (GPTBot, PerplexityBot, ClaudeBot)
- **Secrets** : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`


#### `sync-calendar-trips` — Synchronisation calendrier

- **Auth** : JWT utilisateur OU header `x-cron-secret: $SYNC_CRON_TOKEN` (cron horaire via `pg_cron` + `pg_net`)
- **Endpoint** : `POST` avec body `{ connectionId, syncDays }` (ou aucun body en mode cron → sync de toutes les connexions actives)
- **Sources supportées** :
  - `google` : OAuth Google Calendar API (refresh token stocké dans `calendar_connections`)
  - `outlook` : OAuth Microsoft Graph
  - `ics` : lien public ICS (Outlook perso/pro sans OAuth, Apple Calendar, tout fournisseur exposant un `.ics`). L'URL est stockée dans `calendar_connections.ics_url`. La fonction fetch le flux, parse les blocs `VEVENT` (avec gestion du RFC 5545 line folding, unescape des caractères, expansion des `RRULE` DAILY/WEEKLY/MONTHLY/YEARLY sur la fenêtre `syncDays`) et route chaque événement dans le même pipeline `createTripFromEvent` que Google/Outlook (déduplication par `calendar_event_id`, extraction d'adresse, calcul de distance, statut `pending_location` si aucune adresse détectable).
- **Logique** : Lit les événements, extrait les adresses, calcule les distances, crée les trajets (`source = google_calendar` | `outlook_calendar` selon la connexion). Deux modes d'import pilotés par `user_preferences.calendar_import_mode` :
  - `individual` (défaut) : 1 événement calendrier = 1 trajet aller-retour depuis le domicile.
  - `tour` : tous les rendez-vous d'une même journée (≥ 2 avec adresse résolue) sont regroupés en une seule tournée `domicile → RDV₁ → … → RDV_N → domicile` — 1 seul `trip` avec `tour_stops` JSON, distance = somme des segments Distance Matrix, IK calculé une fois via le barème tiered (bonus EV 20% inchangé), `calendar_event_id = tour:YYYY-MM-DD:<source>` pour l'idempotence. Les jours avec 1 seul rendez-vous, sans adresse home configurée ou sans adresse d'événement retombent silencieusement sur le flux individuel.
  - Le calcul IK respecte `user_preferences.ik_rate_override` : `auto` (barème tiered), `tier2` (taux 5001–20000 forcé sur chaque km) ou `tier3` (taux >20000 forcé). Utile pour les utilisateurs qui se remboursent mensuellement et veulent un taux stable toute l'année.
- **Observabilité** : Chaque synchronisation ICS est journalisée dans `calendar_connection_attempts` avec le statut `success`/`failure`, le nombre d'événements récupérés, le nombre de trajets créés et le déclencheur (`cron` ou `manual`).
- **Secrets** : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `SYNC_CRON_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

#### `vehicle-lookup` — Recherche par plaque

- **Auth** : JWT utilisateur
- **Endpoint** : `POST` avec body `{ licensePlate }`
- **Sources** : DrivePieces API, Earlweb API (fallback)
- **Cache** : Résultats stockés dans `vehicle_cache`
- **Secrets** : `IMMATRICULATION_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

#### `sitemap` — Sitemap XML dynamique

- **Auth** : Aucune
- **Endpoint** : `GET`
- **Logique** : 18 pages statiques + articles blog (paginated)
- **Cache** : `max-age=300` (5 minutes)
- **Proxy** : Servi via le Worker Cloudflare sur `/sitemap.xml`

#### `view-report` — Rapports partagés

- **Auth** : Aucune (accès par UUID)
- **Endpoint** : `GET ?id=uuid`
- **Logique** : Lit `report_shares` via service role, incrémente le compteur d'accès
- **Sécurité** : Proxy via Edge Function pour éviter l'énumération directe de la table
- **Rendu public** : un accès navigateur direct à `/functions/v1/view-report?id=...` redirige vers `https://iktracker.fr/temporaryreport/:id`, qui réutilise le conteneur de preview existant. Le HTML brut est réservé au fetch interne avec `raw=1`.

#### `google-calendar-auth` / `outlook-calendar-auth` — OAuth

- **Auth** : Aucune (callbacks OAuth)
- **Logique** : Échange le code OAuth contre un token, stocke dans `calendar_connections`
- **Observabilité** : Chaque callback OAuth (succès ou échec) est journalisé dans `calendar_connection_attempts` avec le provider (`google`/`outlook`), le statut et le message d'erreur éventuel.
- **Sécurité** : Validation des redirect URLs contre une whitelist
- **Secrets** : `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`

#### `marina-analyze` — Analyse IA

- **Auth** : JWT utilisateur
- **Endpoint** : `POST` (soumettre un document), `GET ?job_id=` (poll le statut)
- **Secrets** : `MARINA_API_KEY`

#### `linkedin-profile` — Profil LinkedIn vérifié (E-E-A-T)

- **Auth** : Publique (`verify_jwt = false`) — servi à la page `/blog/auteur/adrien-de-volontat`
- **Endpoint** : `GET` — renvoie `{ name, given_name, family_name, picture, locale, verified, profile_url }`
- **Gateway** : `https://connector-gateway.lovable.dev/linkedin/v2/userinfo`
- **Secrets** : `LOVABLE_API_KEY`, `LINKEDIN_API_KEY`
- **Cache** : `Cache-Control: public, max-age=3600, s-maxage=3600`

#### `linkedin-weekly-post` — Publication LinkedIn automatisée (mensuelle)

> Nom historique conservé pour ne pas casser l'URL invoke ; le rythme est **mensuel** depuis juillet 2026.

- **Auth** : En-tête `x-cron-secret` (CRON_SECRET ou SYNC_CRON_TOKEN) ou JWT admin (`has_role(user, 'admin')`)
- **Cron** : job `linkedin-monthly-post`, planification `0 7 1-7 * *` + garde SQL `extract(dow) = 3` → strictement le 1<sup>er</sup> mercredi du mois, 07:00 UTC. (L'ancienne expression `0 7 1-7 * 3` déclenchait chaque mercredi, `pg_cron` faisant un OU entre jour-du-mois et jour-de-semaine.)
- **Rotation** : 13 topics étiquetés par `format` (`video` / `carousel`) et par `mediaSource` (`browserless` / `wavespeed`). Sélection : `(année × 12 + mois) mod N`.
- **Précision éditoriale** : chaque topic possède une entrée dans `TOPIC_FACTS` (faits techniques : seuils, logique métier, personas, scénarios). Ces faits sont injectés dans le prompt pour forcer une description concrète d'une fonctionnalité réelle plutôt qu'un discours marketing.
- **Ancrage sur la documentation technique** : `supabase/functions/linkedin-weekly-post/docs-context.ts` est **généré** depuis `docs/BACKEND.md` + `docs/FRONTEND.md` par `scripts/generate-linkedin-docs-context.cjs` (108 sections, blocs de code retirés, 1 600 signes max par section). À l'exécution, `docContextForTopic()` sélectionne les 4 sections les plus pertinentes par score de mots-clés (titre pondéré ×3, table `DOC_KEYWORDS` par slug) et les injecte, plafonnées à 4 500 signes, dans le prompt texte et dans le prompt de plan de carrousel (2 500 signes). Le prompt interdit explicitement de citer des noms de tables, de fonctions ou de fournisseurs d'infrastructure. **Relancer le script après toute évolution majeure de la doc.**
- **Capture guidée par la doc** : `deriveCaptureFocus(topic, postText)` demande au LLM 2 à 4 libellés visibles à l'écran, à partir du post généré et des extraits de doc du module (`captureHintsForTopic`). `recordScreencast(topic, focusLabels)` cadre ces zones via `scrollIntoView` sur les titres/sections/boutons correspondants, avec repli automatique sur le scroll global si aucun libellé n'est trouvé. La vidéo montre donc la partie d'UI que le post décrit réellement.
- **Style d'écriture** : table `public.linkedin_style_samples` (`content`, `active`) — corpus de posts rédigés manuellement par le fondateur. Le profil de style (longueur, ratio de phrases courtes, ouvertures, bigrammes) est calculé à partir de ces exemples et injecté dans le prompt. L'API LinkedIn ne permettant pas de relire les publications passées avec les scopes disponibles, cette table est la **seule** source de style fiable. RLS : lecture/écriture réservées aux admins, lecture service_role pour l'edge function.
- **Texte** : Mistral hébergé sur Wavespeed (via `WAVESPEED_API_KEY`), avec **fallback silencieux** sur Gemini 2.5 Flash (Lovable AI Gateway).
- **Cohérence texte ↔ média** : le média n'est pas produit à partir du seul `topic.visualPrompt`. Après génération du texte :
  - le **plan de carrousel** est dérivé du post généré (`generateSlidePlanFromText`) pour que les slides reprennent les mêmes arguments, avec repli sur le plan topic.
  - le **prompt visuel** (cover d'image ou scène vidéo) est dérivé du post généré (`deriveVisualPromptFromText`) pour que l'image/la vidéo illustre ce qui est réellement écrit, avec repli sur `topic.visualPrompt`.
  - les captures `browserless` restent liées au topic (UI réelle) et illustrent donc naturellement le module décrit.
- **Média** :
  - `mediaSource: 'browserless'` → **vraie vidéo MP4 de l'UI via PageBolt** (`capturePageboltVideo`, `POST https://pagebolt.dev/api/v1/video`, header `x-api-key: PAGEBOLT_API_KEY`). Steps : `navigate` sur l'URL du topic puis alternance `scroll` (positions absolues 700 / 1500 / 2400, plus fiables que les sélecteurs) et `wait { live: true }`, viewport 1280×720, 30 fps, curseur `highlight`, `response_type: 'json'` (MP4 base64, ~1,4 Mo / ~23 s). Coût : 3 requêtes de quota par vidéo. Le MP4 est publié en post VIDEO. Repli 1 : **carrousel PDF de vraies captures d'écran** (`captureUiFrames` + `renderScreenshotCarouselPdf`) — le runtime Browserless `/function` s'exécute côté navigateur (ni `fs`, ni `child_process`, ni `ffmpeg`, `page.screencast` indisponible), il navigue, réapplique le viewport 1200×1200 puis recharge, repère les ancres de focus dérivées du texte et renvoie 5 PNG assemblés en PDF publié en post DOCUMENT. Repli 2 : capture unique publiée en image.
  - `mediaSource: 'wavespeed'` → visuel IA :
    - `format: 'video'` → text-to-video via `wavespeed-ai/wan-2.1-t2v-720p`, à partir du prompt visuel dérivé du texte, MP4 téléchargé puis uploadé.
    - `format: 'carousel'` → cover générée via `wavespeed-ai/flux-dev` à partir du prompt visuel dérivé du texte, puis embarquée en fond du slide 1 (scrim ivoire) ; slides 2-5 en typographie pdf-lib pure, dont le contenu est extrait du post. Fallback silencieux sur le rendu typographique seul.
- **Aération du texte** : après nettoyage (`sanitizePostText`), `airifyPostText` reformate le post — hook seul sur la première ligne, puis paragraphes de 2 phrases maximum séparés par une ligne vide. Le prompt impose la même contrainte en amont.
- **Mention de la page IKtracker** : `resolveOrgUrn()` résout l'URN de la page entreprise (variable `LINKEDIN_ORG_URN` / `LINKEDIN_ORG_ID`, sinon lookup `/v2/organizationAcls?q=roleAssignee`). La mention est ajoutée en fin de post — syntaxe inline `@[IKtracker](urn)` sur `/rest/posts`, annotation `CompanyAttributedEntity` sur `/v2/ugcPosts`. Absence d'URN = post publié sans mention (non bloquant).
- **Média obligatoire (strict)** : chaîne de repli en cascade — (1) API REST moderne `/rest/videos` ou `/rest/documents` + `/rest/posts`, (2) API legacy `/v2/assets` + `/v2/ugcPosts`, (3) capture d'écran Browserless publiée en image. **Aucun repli texte seul** : si les trois voies échouent, la fonction lève une erreur, journalise `status: failed` et ne publie rien. Le flag `text_only` a été supprimé — il n'existe plus aucun chemin de publication sans visuel (y compris en republication, qui exige un `asset_urn` réutilisable).
- **Query params** : `?topic=<slug>` force le topic, `?format=video|carousel` force le format, `?dry_run=1` renvoie texte + slide_plan + derived_visual_prompt sans publier ni uploader.
- **Mode correction `?mode=repost`** (POST, admin uniquement) : `body = { post_id, text, asset_urn? }`. L'API LinkedIn ne permet pas d'éditer le texte d'un post publié via le connector (`/rest/posts` en PARTIAL_UPDATE renvoie 426 `NONEXISTENT_VERSION`, `/v2/ugcPosts` en lecture renvoie 403 faute de scope `r_member_social`). La fonction supprime donc le post (`DELETE /rest/posts/{urn}`, repli `DELETE /v2/ugcPosts/{urn}`) puis le republie avec le texte corrigé — assaini et aéré par `sanitizePostText` + `airifyPostText` — **en réutilisant l'asset média existant** (`linkedin_asset_urn` du run d'origine), donc sans nouvel upload ni changement de visuel. Le run est journalisé dans `linkedin_post_log`. Exposé dans l'admin (onglet LinkedIn) par le bouton « Corriger » de chaque run réussi. Les réactions et commentaires du post d'origine sont perdus.
- **Logs** : `public.linkedin_post_log` (colonnes `media_type`, `triggered_by`, `duration_ms`, `error_message`).
- **Admin UI** : onglet "LinkedIn" dans `/admin` (composant `AdminLinkedIn.tsx`) — sélecteur topic + format + toggle dry-run, **gestion du corpus de style** (ajout/suppression d'exemples), aperçu du prompt visuel dérivé, et historique des 15 derniers runs.
- **Secrets** : `LOVABLE_API_KEY`, `LINKEDIN_API_KEY`, `WAVESPEED_API_KEY`, `BROWSERLESS_API_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

#### `linkedin-post-audit` — Boucle qualité post-publication

Seconde fonction de la boucle d'automatisation : elle relit le post **réellement publié** environ 5 minutes après sa mise en ligne et le corrige s'il ne respecte pas les règles de rédaction.

- **Auth** : `x-cron-secret` (CRON_SECRET / SYNC_CRON_TOKEN) ou JWT admin.
- **Cron** : job `linkedin-post-audit-5min`, planification `*/5 * * * *`. Chaque exécution traite au plus un post : le dernier run `success` publié il y a plus de 5 min, moins de 24 h, avec `audit_status IS NULL`.
- **Lecture du post** : `GET /rest/posts/{urn}` (repli `GET /v2/ugcPosts/{urn}`), repli final sur `post_text` journalisé. Engagement précoce lu via `/v2/socialActions/{urn}` (réactions + commentaires — les impressions brutes ne sont exposées que pour les pages entreprise, l'engagement sert de proxy).
- **Contrôles déterministes** (`runDeterministicChecks`) : longueur 1000–1500 signes, caractères interdits, tirets d'incise, aération (≥ 6 paragraphes, aucun > 300 signes), hook isolé ≤ 220 signes.
- **Ancrage documentaire** : la fonction embarque une copie de `docs-context.ts` (générée par `scripts/generate-linkedin-docs-context.cjs`, écrite à la fois dans `linkedin-weekly-post/` et `linkedin-post-audit/`). `docContextForAudit()` sélectionne jusqu'à 5 sections (score mots-clés du slug, du titre et des mots longs du texte publié, plafond 4500 signes) et les injecte comme **source de vérité unique**.
- **Audit LLM** : Mistral (Wavespeed) avec fallback Gemini 2.5 Flash, sortie JSON stricte `{ hook_score, impressions_score, content_score, factual_score, unverified_claims[], verdict, issues[], hook_analysis, improved_text }`. Le prompt met la priorité sur le **hook**, le **potentiel d'impressions**, et la **vérifiabilité** : toute affirmation technique doit être retrouvée dans la doc injectée ou relever d'un fait fiscal public, sinon elle est listée mot pour mot dans `unverified_claims` et corrigée dans `improved_text`. Si aucune section pertinente n'est trouvée, `factual_score` est neutralisé à 10 pour ne pas pénaliser un module non documenté.
- **Score composite /100** (`computeCompositeScore`, calculé côté serveur, jamais par le LLM) : 40 pts déterministes — longueur 10, caractères interdits + tirets 10, aération 10, forme du hook 10 — et 60 pts éditoriaux — `hook_score ×3` (30), `impressions_score ×2` (20), `content_score ÷2` (5), `factual_score ÷2` (5). Détail persisté dans `audit_report.score_breakdown`.
- **Boucle itérative** : tant que le post n'atteint pas la cible, chaque correction relance un cycle. **Arrêt** dès que `score ≥ 85` ET `hook_score ≥ 8` ET `factual_score ≥ 8` ET aucun `hard_fail` (`passed`). Garde-fous : `MAX_ATTEMPTS = 3` (`max_attempts`), plateau si le gain de score entre deux itérations est `< 3` points (`plateau`) — **sauf** en cas d'échec factuel (`factual_score < 8` ou `unverified_claims` non vide), qui force une correction supplémentaire —, et refus de republier un `improved_text` qui échoue lui-même les contrôles déterministes (`fix_invalid`).
- **Chaînage** : après une republication réussie, le nouveau run est laissé avec `audit_status NULL` et hérite de `audit_attempts + 1` ainsi que de `previous_score` dans `audit_report` ; le cron suivant le ré-audite automatiquement.
- **Journalisation** : colonnes `audit_status` (`passed` | `corrected` | `max_attempts` | `plateau` | `fix_invalid` | `fix_failed` | `would_fix`), `audit_score`, `audit_hook_score`, `audit_attempts`, `audited_at`, `audit_report` (jsonb : breakdown, itération, gain, seuils, contrôles déterministes du texte audité et du texte réécrit) sur `public.linkedin_post_log`.

- **Query params** : `?post_id=<urn>` force l'audit d'un post précis, `?dry_run=1` audite sans republier (statut `would_fix`), `?min_age_min=N` ajuste l'âge minimum (défaut 5).
- **Admin UI** : bouton « Lancer l'audit maintenant » et bouton « Auditer » par run dans l'onglet LinkedIn ; le badge d'audit affiche statut, score et note du hook.
- **Secrets** : `LOVABLE_API_KEY`, `LINKEDIN_API_KEY`, `WAVESPEED_API_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`


#### `gsc-analytics` — Google Search Console

- **Auth** : JWT utilisateur + rôle `admin`/`viewer`
- **Actions** : `sites`, `summary`, `query` (dimensions/days/rowLimit configurables)
- **Gateway** : `https://connector-gateway.lovable.dev/google_search_console`
- **Secrets** : `LOVABLE_API_KEY`, `GOOGLE_SEARCH_CONSOLE_API_KEY`



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
1. `www.iktracker.fr` / `www.iktracker.com` / `iktracker.com` → 301 → apex `iktracker.fr` (sauf robots.txt/llms.txt proxiés depuis .com)
2. Slug présent dans `LEGACY_REDIRECTS` → 301 vers slug moderne
3. `/sitemap.xml` → Proxy vers Edge Function (fallback fichier statique)
4. Assets statiques → Passthrough + cache headers
5. Routes privées (`/app/*`, `/auth`, `/sso`, etc.) → Passthrough
6. Bot détecté → Edge Function `meta-renderer`
7. Utilisateur normal → Origin SPA

**Headers de diagnostic** :
- `X-Rendered-By: cloudflare-worker`
- `X-Sitemap-Source: edge-function | static-fallback | error`

**Déploiement** : le Worker n'est **pas** déployé automatiquement depuis le repo. Utiliser Wrangler :

```bash
cd cloudflare-worker
wrangler deploy   # push cloudflare-worker/iktracker-bot-router.js sur les 4 routes
```

Config : `cloudflare-worker/wrangler.toml` (routes multi-zones apex + www, .fr + .com). Voir `cloudflare-worker/README.md` pour l'authentification (`wrangler login`) et le rollback. Ne jamais éditer le Worker dans le dashboard **et** en local en parallèle — le prochain `wrangler deploy` écrase.

### Sitemap (architecture hybride v2)

| Source | Rôle | Quand |
|---|---|---|
| Edge Function `sitemap` | Source primaire dynamique | Chaque requête (cache 5 min) |
| Cloudflare Worker | Proxy transparent | Intercepte `/sitemap.xml` |
| `public/sitemap.xml` | Fallback statique | Seulement si Edge Function down |
| `scripts/generate-sitemap.cjs` | Génère le fallback | Chaque build (prebuild) |
| `scripts/validate-sitemap-sync.cjs` | Validation CI | Compare les 2 sources |

**Contenu** : ~17 pages statiques + ~45 articles de blog ≈ 62 URLs — toutes en `https://iktracker.fr/*`.

**Priorités & changefreq notables** (alignées entre l'Edge Function et le script statique) :
- `/` : `priority 1.0`, `weekly`
- `/meilleure-application-indemnites-kilometriques` : `priority 1.0`, `weekly`
- `/bareme-ik-2026` : `priority 0.9`, `monthly`
- `/signup` : `priority 0.5` (utilitaire, dépriorisé)
- Utilitaires exclus : `/unsubscribe`, `/marina`, `/temporaryreport/*`, `/sso`, `/offline`, `/debug/*`, `/auth`, `/app/*`, `/admin`

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
Disallow: /app/, /auth, /admin, /admin/, /unsubscribe, /temporaryreport/, /sso, /offline, /debug/, /.lovable/oauth/consent
```

Tous les crawlers IA sont explicitement autorisés (`GPTBot`, `Claude-Web`, `PerplexityBot`, etc.). `/admin` est bloqué explicitement bien que déjà gated côté app, pour éviter tout crawl accidentel.

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

### ICS (lien public)

| Aspect | Détail |
|---|---|
| Auth | Aucune — URL publique `.ics` collée par l'utilisateur |
| Fournisseurs | Outlook perso/pro (tenants sans consent OAuth), Apple Calendar, tout provider RFC 5545 |
| Parsing | `sync-calendar-trips` : fetch HTTP, unfold RFC 5545, unescape (`\,` `\;` `\n`), expansion `RRULE` (DAILY/WEEKLY/MONTHLY/YEARLY) sur `syncDays` |
| Stockage | `calendar_connections.ics_url` + `provider = 'ics'` |
| Fallback | Événements sans adresse détectable → trajet `pending_location` à compléter côté front |


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
| Edge Function | `blog-api` (902 lignes) |
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
| `autopilot_events` | Événements de monitoring (severity, resolved). Détection automatique d'anomalies via trigger : `anomaly_mass_delete` (>10 deletes/h), `anomaly_burst` (>50 actions/h), `critical_page_modified` (modif sur `/`, `/tarifs`), `quota_exceeded` (quota mensuel atteint). |

### Quota & détection d'anomalies (Autopilot — P1)

- **Quota mensuel** sur `blog_api_keys` : `monthly_quota` (défaut 10 000 écritures), `usage_current_month`, `usage_reset_at`. Compté uniquement sur les opérations d'écriture (POST/PUT/PATCH/DELETE), incrémenté via `increment_blog_api_usage(_api_key_name)`. Réponse `429` si dépassé + event `quota_exceeded` (severity=critical).
- **Trigger DB** `trg_detect_autopilot_anomalies` sur `api_audit_logs` (AFTER INSERT) → fonction `detect_autopilot_anomalies()` qui crée automatiquement les events ci-dessus.
- **Pages critiques surveillées** : `/`, `/tarifs`, `index`, `tarifs`, `home`.
- **Filtre UI par `api_key_name`** (P2) : dropdown dans `AdminAutopilot` pour isoler l'activité d'une clé spécifique (ex. Parménion vs autre crawler). S'applique aux audit logs, événements, compteurs et health dashboard. Préférence persistée dans `localStorage` (`autopilot:apiKeyFilter`).
- **Groupement par session** (P2) : composant `AuditSessionGroup` (`src/components/admin/AuditSessionGroup.tsx`). Regroupe les `api_audit_logs` consécutifs partageant la même `api_key_name` avec un écart < 5 minutes. En-tête de session affiche : début → fin, durée, nb d'actions, répartition par action (create/update/delete) et par resource_type. Collapse/expand par session, première session ouverte par défaut. Toggle UI "Grouper par session" persisté dans `localStorage` (`autopilot:groupBySession`).
- **Vue détaillée de session** (P2) : composant `SessionDetailSheet` (`src/components/admin/SessionDetailSheet.tsx`). Bouton "Détails" sur chaque en-tête de session ouvre un Sheet latéral avec : 4 KPIs (actions / ressources / événements / annulés), répartition par action et par type de ressource, liste complète des événements liés (warning/critical), chronologie verticale des actions avec écarts temporels (gaps > 30s annotés), et footer de synthèse (anomalies critiques / warnings / OK).
- **Realtime UI** (P2) : `api_audit_logs` et `autopilot_events` sont publiés dans la publication `supabase_realtime` (REPLICA IDENTITY FULL). Le composant `AdminAutopilot` souscrit à un channel `autopilot-realtime` qui invalide les queries TanStack à chaque INSERT/UPDATE/DELETE. Le polling de fallback est ramené de 30 s à 5 min. Un badge "Live" (vert pulsant) ou "Polling" (gris) dans le header indique l'état de la connexion ; tooltip avec timestamp du dernier événement reçu. **Sécurité** : RLS activée sur `realtime.messages`. Les souscriptions aux topics `api_audit_logs` et `autopilot_events` (et leurs sous-topics `…:%`) sont restreintes aux **administrateurs** via `has_role(auth.uid(), 'admin')`. Les autres canaux temps réel restent ouverts aux utilisateurs authentifiés.
- **Export CSV** (P3 — Tâche 8) : utilitaire pur `src/lib/autopilot-export.ts` (escaping RFC 4180, BOM UTF-8 pour Excel, helpers `auditLogsToCsv` / `eventsToCsv` / `downloadCsv`). Bouton « CSV » dans le header `AdminAutopilot` exporte la vue courante (logs ou événements selon l'onglet, filtres clé API + statut respectés). Bouton « CSV » dans `SessionDetailSheet` exporte les logs d'une session unique (nom de fichier : `session_<key>_<YYYY-MM-DD_HHMM>.csv`). Le bouton « Rapport » HTML/PDF reste disponible pour les vues synthétiques imprimables.

### Secrets configurés (16)

| Secret | Usage |
|---|---|
| `SUPABASE_URL` | URL du projet (auto) |
| `SUPABASE_ANON_KEY` | Clé publique (auto) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (auto) |
| `SUPABASE_PUBLISHABLE_KEY` | Clé publiable (auto) |
| `SUPABASE_DB_URL` | URL de connexion DB (auto) |
| `SUPABASE_JWKS` | JWKS pour vérification JWT (auto) |
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

## 8. Partner API & SSO

### Vue d'ensemble

API B2B permettant à des partenaires (ex: Dictadevi) d'intégrer IKtracker dans leur produit : provisioning automatique d'utilisateurs, calcul d'IK, création de trajets, lecture de stats et SSO transparent vers l'app IKtracker.

- **Edge Function** : `partner-api`
- **Base URL** : `https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/partner-api`
- **Modèle** : Gratuit (quota mensuel configurable par clé)

### Authentification

| Header | Usage |
|---|---|
| `x-api-key` | Clé partenaire (préfixe `pk_live_…`). Hashée en SHA-256 et matchée sur `partner_api_keys.key_hash` |
| `Authorization: Bearer <jwt>` | (Optionnel, pour SSO standard) JWT signé par le partenaire avec son `jwt_secret` |

Validation via la fonction SQL `validate_partner_key(_key_hash)` (SECURITY DEFINER) qui retourne le partenaire, ses scopes et le quota restant.

### Scopes disponibles

| Scope | Usage |
|---|---|
| `vehicle:lookup` | Recherche véhicule par plaque |
| `ik:calculate` | Calcul d'indemnité kilométrique |
| `trips:write` | Création de trajets |
| `stats:read` | Lecture des stats utilisateur |
| `sso` | Génération de magic links SSO |

### Endpoints

| Méthode | Path | Scope | Description |
|---|---|---|---|
| `POST` | `/vehicle/lookup` | `vehicle:lookup` | Lookup par plaque (`plate` ou `license_plate`) → marque, modèle, CV fiscaux |
| `POST` | `/ik/calculate` | `ik:calculate` | Calcule l'IK pour un trajet (`fiscal_power`, `trip_km`/`annual_km`, `is_electric`) |
| `POST` | `/trips` | `trips:write` | Crée un trajet/tournée pour un user partenaire (provisioning auto si inexistant). Champs : `date`, `start_location`, `end_location`, `distance`, `vehicle_id`, `purpose` (motif), `round_trip`, `tour_stops` (array d'étapes → tournée), `calendar_event_id`. `source` doit commencer par `partner:` |
| `GET` | `/trips?start_date&end_date&vehicle_id&limit` | `trips:read` | **🆕 Liste les trajets de l'utilisateur avec `purpose` (motif), `tour_stops`, `is_tour`, `stops_count`, `distance`, `ik_amount` |
| `PATCH`/`PUT` | `/trips/:id` | `trips:write` | **🆕 Met à jour le motif (`purpose`) d'un trajet ; déclenche le webhook `trip.updated` |
| `GET` | `/stats` | `stats:read` | Stats annuelles de l'utilisateur (km, IK, palier en cours) |
| `GET` | `/dashboard?months=12` | `stats:read` | **🆕 Compteurs annuels + breakdown mensuel (1-24 mois) — alimente directement un BarChart** |
| `GET` | `/reports/:id/pdf` | `reports` / `trips:read` | Rendu PDF binaire (Browserless) d'un rapport partagé |
| `POST` | `/reports/generate` | `reports` / `trips:read` | Crée un `report_share` (HTML + URL publique 7j) |
| `POST` | `/reports/send-email` | `reports` | Envoi du rapport par email (Resend) |
| `POST` | `/sso/magic-link` | `sso` | Génère un magic link signé (JWT partenaire requis dans `Authorization`) |
| `POST` | `/sso/dev` | `sso` | **Dev only** — génère un magic link sans JWT, à partir de `external_user_id` + `external_email` |
| `GET` | `/preferences` | `preferences:read` / `read` | Retourne `calendar_import_mode`, `ik_rate_override`, `ik_rate_override_options`, `has_home_address` pour l'utilisateur lié |
| `PUT` \| `PATCH` | `/preferences` | `preferences:write` / `write` | Met à jour `calendar_import_mode` et/ou `ik_rate_override`. Déclenche le webhook `preferences.updated` |
| `GET` | `/vehicles` | `read` | Liste les véhicules de l'utilisateur lié |
| `PATCH` \| `PUT` | `/vehicles/:id` | `vehicles:write` / `write` | Met à jour un véhicule (`fiscal_power`, `is_electric`, `make`, `model`, `year`, `license_plate`) et, si `update_past_trips: true`, recalcule immédiatement les IK de tous les trajets passés liés. Déclenche le webhook `vehicle.updated` |

### Endpoint `/preferences` — détail

Exposé pour permettre aux partenaires (ex. Dictadevi) d'offrir à leurs utilisateurs le pilotage des deux réglages clés du calcul IK sans quitter leur plateforme :
- **`calendar_import_mode`** : `individual` (un trajet par événement) ou `tour` (regroupe les événements d'un même jour et d'un même calendrier en tournée). `tour` exige une adresse `Maison` dans `locations`.
- **`ik_rate_override`** : `auto` (barème officiel tiered), `tier1` (≤ 5 000 km/an), `tier2` (5 001–20 000 km/an) ou `tier3` (> 20 000 km/an). Fige le taux appliqué à chaque km — utile pour les indépendants qui se remboursent mensuellement et veulent un taux stable toute l'année.

**Résolution utilisateur** : header `x-external-user-id` obligatoire → mapping `partner_users` → `iktracker_user_id`. Renvoie `404` si l'utilisateur n'est pas encore provisionné (appeler `/sso/magic-link` au préalable pour créer le mapping).

**`GET /preferences`** — réponse :
```json
{
  "calendar_import_mode": "individual",
  "ik_rate_override": "auto",
  "ik_rate_override_options": ["auto", "tier1", "tier2", "tier3"],
  "has_home_address": true,
  "note": null
}
```
`has_home_address` reflète l'existence d'une entrée `locations` avec `label = 'Maison'` (case-insensitive). `note = "home_address_missing"` est renvoyé si le mode courant est `tour` sans Maison définie : dans ce cas `sync-calendar-trips` retombe silencieusement en trajets individuels.

**`PUT /preferences`** (ou `PATCH`) — body accepte un ou les deux champs :
```json
{ "calendar_import_mode": "tour", "ik_rate_override": "tier2" }
```
Upsert sur `user_preferences (user_id, calendar_import_mode, ik_rate_override)`. Codes :
- `200` : préférences enregistrées, renvoie `{ success, calendar_import_mode, ik_rate_override }`.
- `400` : valeur invalide, ou aucun champ fourni.
- `403` : scope manquant (`preferences:write` ou fallback `write`).
- `404` : utilisateur externe non provisionné.
- `409` : `{ "error": "home_address_required" }` si activation `tour` sans Maison (bloquant : les préférences ne sont pas modifiées).

**Webhook** `preferences.updated` (si l'endpoint partenaire y est abonné) — émis à chaque update via l'API, signé `X-IKTracker-Signature: sha256=…` (HMAC-SHA256 du body avec `partner_webhooks.hmac_secret`) :
```json
{
  "event": "preferences.updated",
  "timestamp": "2026-07-27T09:12:00Z",
  "payload": {
    "external_user_id": "user-12345",
    "iktracker_user_id": "…",
    "calendar_import_mode": "tour",
    "ik_rate_override": "tier2",
    "changed": ["calendar_import_mode", "ik_rate_override"]
  }
}
```

`changed[]` liste les champs modifiés dans la requête — permet au partenaire de ne rafraîchir que ce qui a bougé.

> **Note synchro inverse** : les changements de préférences faits directement depuis l'app IKtracker ne déclenchent pas encore automatiquement le webhook (endpoint interne `/internal/preferences-changed` prêt mais fan-out DB non branché — limitation Cloud sur le stockage sécurisé du token interne). Tant que les writes passent par l'API partenaire, la synchro est temps réel. Sinon, prévoir un polling léger côté partenaire.

### Endpoint `/vehicles/:id` — détail

Permet à un partenaire (ex. Dictadevi) de mettre à jour un véhicule côté IKtracker sans double-saisie et de contrôler explicitement la rétroactivité du recalcul IK.

**Body (PATCH ou PUT)** — tous les champs sont optionnels sauf au moins un :
```json
{
  "fiscal_power": 6,
  "is_electric": true,
  "make": "Renault",
  "model": "Zoe",
  "year": 2024,
  "license_plate": "AB-123-CD",
  "update_past_trips": true
}
```

- **`update_past_trips`** (booléen, défaut `false`) — sémantique identique à la case à cocher exposée dans l'app IKtracker (« Mettre à jour les trajets passés ») :
  - `true` + changement de `fiscal_power` ou `is_electric` → recalcule immédiatement `ik_amount` sur tous les `trips` non supprimés liés à ce véhicule (barème officiel tiered + bonus 20 % électrique, ordre chronologique, cumul annuel reconstitué).
  - `false` (ou aucun changement de barème) → seuls les trajets créés après la modification bénéficient du nouveau barème ; les trajets passés conservent leur `ik_amount` d'origine.

**Réponse `200`** :
```json
{
  "success": true,
  "vehicle_id": "uuid",
  "changed": ["fiscal_power", "is_electric"],
  "update_past_trips": true,
  "recalculated_trips": 127
}
```

**Codes d'erreur** : `400` (aucun champ fourni), `403` (scope `vehicles:write` manquant), `404` (véhicule inexistant ou n'appartenant pas à l'utilisateur lié).

**Webhook `vehicle.updated`** (si abonné) :
```json
{
  "event": "vehicle.updated",
  "payload": {
    "external_user_id": "user-12345",
    "iktracker_user_id": "…",
    "vehicle_id": "…",
    "changed": ["fiscal_power", "is_electric"],
    "update_past_trips": true,
    "recalculated_trips": 127
  }
}
```






### Provisioning automatique

À chaque appel impliquant un utilisateur (`/trips`, `/stats`, `/sso/*`), la fonction `findOrCreateIktrackerUser(partnerId, external_user_id, external_email, metadata)` :

1. Cherche un mapping existant dans `partner_users` (par `partner_id` + `external_user_id`)
2. Si absent : crée un compte Supabase Auth (email confirmé), insère un mapping
3. Met à jour `last_sso_at` et le `metadata` partenaire
4. Retourne l'`iktracker_user_id` (UUID)

### Quotas & Logs

- Compteur incrémenté via `increment_partner_usage(_partner_id)` à chaque requête
- Reset mensuel automatique (`usage_reset_at`)
- Tous les appels sont loggés dans `partner_request_logs` (path, status, durée, partenaire, user externe)

### Webhooks sortants

Table `partner_webhooks` : URL + secret HMAC + liste d'événements abonnés. Permet de notifier le partenaire (ex: trajet créé, palier IK franchi). Signature `X-IKTracker-Signature: sha256=…`. La clé est lue dans `partner_webhooks.hmac_secret`, avec fallback sur la variable d'environnement `IKTRACKER_WEBHOOK_SECRET`.

### Contrainte trips

La contrainte `trips_source_check` accepte les valeurs `manual`, `google_calendar`, `outlook_calendar`, `tour`, `takeout`, ainsi que toute valeur préfixée par `partner:` (ex: `partner:dictadevi`).

### Scopes disponibles

| Scope | Endpoints couverts |
|-------|--------------------|
| `vehicle:read` / `vehicle:lookup` | Lecture véhicules + lookup plaque |
| `ik:calculate` | Calcul barème IK |
| `trips:write` | `POST /trips` |
| `trips:read` / `read` | Lecture trajets |
| `reports` (ou `trips:read`/`read`) | `POST /reports/generate`, `POST /reports/send-email`, `GET /reports/{id}/pdf` |
| `stats:read` | Stats agrégées partenaire |
| `sso` | Magic links one-shot |

⚠️ Pour qu'un partenaire puisse générer/télécharger les rapports IK PDF, sa clé doit avoir l'un des scopes `reports`, `trips:read` ou `read`. Sinon `partner-api` renvoie `403 "Missing reports / trips:read scope"`.

### Admin UI

Le dashboard `/app/admin/partners` (réservé `admin`) permet de :
- Créer/révoquer des clés partenaires
- Définir les scopes et le quota mensuel
- Visualiser l'usage et les logs récents
- Gérer les webhooks

---

## Annexe — Commandes utiles

```bash
# Valider la synchronisation des sources sitemap
node scripts/validate-sitemap-sync.cjs

# Générer le sitemap statique (fallback)
node scripts/generate-sitemap.cjs

# Vérifier la source du sitemap en production
curl -sI https://www.iktracker.fr/sitemap.xml | grep X-Sitemap-Source

# Tester le meta-renderer
curl -s "https://www.iktracker.fr/" -H "User-Agent: Googlebot" | head -50

# Tester la Partner API (lookup véhicule)
curl -X POST "https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/partner-api/vehicle/lookup" \
  -H "x-api-key: pk_live_xxx" -H "Content-Type: application/json" \
  -d '{"plate":"AB-123-CD"}'

# Générer un magic link de dev
curl -X POST "https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/partner-api/sso/dev" \
  -H "x-api-key: pk_live_xxx" -H "Content-Type: application/json" \
  -d '{"external_user_id":"u_42","external_email":"test@example.com"}'
```

---

## Liste noire de slugs blog (anti-recréation par API)

**Table** : `blog_slug_blacklist`
- `slug_pattern` (text, unique) : slug exact ou motif `LIKE` (`%` = wildcard).
- `is_pattern` (bool) : si vrai, comparaison via `LIKE`, sinon égalité stricte.
- `reason` (text) : note interne admin.
- RLS : admins (lecture/écriture), viewers (lecture seule).

**Fonction** : `public.is_slug_blacklisted(_slug text) returns boolean` (`SECURITY DEFINER`, `search_path=public`). Appelée par l'edge function `blog-api` lors d'un `POST /posts`.

**Comportement API** : si le slug envoyé matche, l'edge function retourne :
- HTTP `409`
- `{ "success": false, "error": "slug_blacklisted", "message": "Non, ce contenu existe déjà…", "slug": "..." }`
- Audit log : action `blocked` sur `resource_type=post`.

**UI admin** : onglet **Liste noire** dans `/admin/blog`.

**Docs agents externes**
- `docs/CRAWLERS_SLUG_PERSISTENCE_PROMPT.md` — spécification côté IKtracker des codes de retour (`409 slug_blacklisted`, `200 _skipped`, `201`) et des règles de persistance attendues (mémoire locale, anti-variations, cooldown 7 jours).
- `docs/LOVABLE_PROMPT_CRAWLERS_SLUG_MEMORY.md` — prompt opérationnel à coller dans le chat Lovable des projets `Crawlers` et `Parménion` pour qu'ils implémentent : table `iktracker_slug_memory`, module `iktracker-slug-memory.ts` (normalisation + Levenshtein ≤ 3 + hash de contenu), garde-fou avant `POST /posts`, page admin `/slug-memory`, tests Vitest.

---

## Corbeille blog (soft-delete des articles)

**Schéma**
- Enum `blog_post_status` étendu avec la valeur `deleted`.
- Colonne `blog_posts.deleted_at` (timestamptz, nullable, indexée).

**Comportement API (`blog-api`)**
- `DELETE /posts/:slug` → soft-delete par défaut : `status='deleted'`, `deleted_at=now()`. Audit log `soft_delete`.
- `DELETE /posts/:slug?hard=true` → purge définitive (admin uniquement). Audit log `purge`.
- `POST /posts` avec un slug actuellement en `deleted` → `409 slug_in_trash` (refus de recréation).
- `GET /posts` (auth) sans paramètre → exclut la corbeille (`status='published'` par défaut).
- `GET /posts?status=deleted` → liste explicite de la corbeille.
- `GET /posts?status=all` ou `?all=true` → inclut la corbeille (admin/viewer).
- `GET /posts` (public, anonyme) → uniquement `published` (inchangé).

**Visibilité publique**
La policy RLS publique reste `status = 'published'`, donc les articles `deleted` ne sont jamais exposés au front public, au sitemap, ni au meta-renderer.

**UI admin**
Onglet **Corbeille** dans `/admin/blog` (compteur, restauration en `draft`, purge définitive avec confirmation). La suppression depuis le listing principal envoie désormais l'article dans la corbeille au lieu de le détruire.

---

## Détection & purge des trajets en doublon

**Problème** : avec deux sources d'import automatique (Google/Outlook Calendar via `sync-calendar-trips` et partenaires comme Dictadevi via `partner-api`), un même trajet réel peut générer plusieurs lignes dans `trips` (event ID différent ou source différente).

**Stratégie de dédup (stricte)**
Clé unique logique : `user_id` + `date` + destination normalisée (`end_location` minuscule, sans diacritiques, espaces compactés). Englobe les trajets archivés (`deleted_at IS NOT NULL`) afin de ne pas re-créer un trajet que l'utilisateur a explicitement supprimé.

**Couches de protection**

1. **`partner-api` `POST /trips`** : avant insertion, appelle `findDuplicateTrip(userId, date, end_location)`. Si match :
   - Retourne `200 { success: false, duplicate: true, reason: "duplicate_active" | "duplicate_archived", existing_trip_id }`.
   - Aucune insertion, aucun webhook `trip.created` envoyé.

2. **`sync-calendar-trips`** : conserve la double garde existante :
   - `tripExistsForEvent` (match exact par `calendar_event_id`).
   - `similarTripExists` (match souple date + destination, archivés inclus).
   - Pour les trajets `pending_location`, la garde compare aussi `date + destination normalisée + intitulé d'événement normalisé`, afin d'éviter les doublons quand un même rendez-vous arrive avec deux variantes d'adresse de départ (`Chemin` / `Chem.`, accents, ponctuation, `France`).

3. **`purge-duplicate-trips`** (nouvelle edge function) :
   - Auth : utilisateur admin via JWT, ou cron interne via header `x-cron-secret` égal au service role key.
   - Body : `{ "dry_run": true|false (def true), "user_id"?: uuid, "days_back"?: int (def 365) }`.
   - Regroupe par clé stricte, conserve le plus ancien trajet actif, soft-delete les autres (`deleted_at = now()`).
   - Mode `dry_run` retourne la liste des groupes sans modifier la base.
   - Log dans `error_logs` (type `maintenance`) lors d'une exécution réelle.

**Tâche planifiée**
Cron `purge-duplicate-trips-daily` (`pg_cron`), tous les jours à **03:15 UTC**, exécute la purge réelle sur les **90 derniers jours**. Le secret cron est lu depuis `vault.decrypted_secrets`.

**Requalification des fausses tournées**
- Fonction SQL `public.demote_invalid_tours()` (SECURITY DEFINER, `search_path = public`, EXECUTE réservé au `service_role`) : tout trajet actif dont `tour_stops` contient **moins de 3 points** n'est pas une vraie tournée. La fonction récupère au besoin les adresses / coordonnées de départ et d'arrivée depuis le premier et le dernier point, puis met `tour_stops = NULL` (retour en trajet simple). Retourne le nombre de trajets requalifiés.
- Cron `demote-invalid-tours-daily` (`pg_cron`) : exécution quotidienne à **03:20 UTC**.
- Premier passage du 30 juillet 2026 : 26 trajets requalifiés.

**Garde-fou de cohérence des trajets (`trips-guard`)**
- Edge Function `trips-guard` (`verify_jwt = false`), authentifiée par `x-cron-secret` (`CRON_SECRET` ou `SYNC_CRON_TOKEN`), par le `service_role` en Bearer, ou par un utilisateur connecté (un admin scanne tout le parc, un utilisateur non-admin uniquement ses propres trajets).
- Body : `{ "dry_run"?: bool, "since_days"?: int (def 400) }`. Lecture paginée par blocs de 1000 lignes.
- Anomalies détectées et corrigées automatiquement :
  - `invalid_start_coords` / `invalid_end_coords` : coordonnées `0,0`, NaN ou hors bornes → remises à `NULL`.
  - `zero_distance` : distance nulle alors que départ et arrivée diffèrent → recalcul Google Distance Matrix (repli sur l'adresse domicile si le départ est générique type « Maison », « Position »).
  - `same_endpoints_nonzero` : départ et arrivée identiques avec une distance > 5 km → distance remise à 0.
  - `absurd_distance` : plus de 1200 km sur un aller simple → recalcul.
  - `distance_vs_coords_mismatch` : distance incohérente avec les coordonnées (> 2,5× le vol d'oiseau + 20 km, ou < 0,7×) → recalcul.
  - `ik_mismatch` / `ik_missing` : montant IK recalculé uniquement si la distance change ou si l'IK est nul alors que la distance et le véhicule existent, avec le cumul annuel réel lu en base et le bonus électrique de 20 %.
- Exclusions : trajets `pending_location` (trajets à compléter, normalement à 0 km) et tournées en boucle (`tour_stops` non vide).
- Plafond de **120 appels Google Distance Matrix** par exécution (maîtrise du coût), les trajets restants sont comptés en `skipped` et repris au passage suivant.
- Journalisation : table `public.trip_guard_runs` (`scanned`, `fixed`, `skipped`, `failed`, `details` jsonb, `triggered_by`), lecture réservée aux admins via `has_role`, écriture `service_role`.
- Cron `trips-guard-daily` (`pg_cron`) : tous les jours à **03:45 UTC**, `since_days = 400`.
- Premier passage du 30 juillet 2026 : 14 610 trajets scannés, 50 corrigés, 11 reportés, 0 échec.





**Comptes liés**
- `account_links` permet de synchroniser des trajets entre comptes autorisés.
- `trips.trip_group_id` regroupe les copies d'un même trajet réel entre comptes liés.
- Le trigger `sync_linked_trip_ins()` fusionne désormais les groupes existants au lieu de recréer une ligne lorsqu'il retrouve un `pending_location` avec la même date, la même destination et le même intitulé normalisés.
- La fonction `normalize_trip_dedupe_text(text)` centralise cette normalisation côté base (accents, casse, ponctuation, `Chemin`/`Chem.`, `Route`/`Rte`, `Avenue`/`Av`, suffixe `France`).
- Purge rétroactive appliquée : les doublons actifs de `pending_location` sont soft-deleted en conservant le plus ancien par utilisateur, date, destination et intitulé.

**Test manuel admin**
```bash
curl -X POST https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/purge-duplicate-trips \
  -H "Authorization: Bearer <user_jwt_admin>" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true, "days_back": 365}'
```

## Trajets récurrents (juin 2026)

- **Table** `recurring_trips` : modèle de trajet (vehicle_id, start/end_location JSONB, distance, round_trip, purpose, `days_of_week SMALLINT[]` (0=Dim..6=Sam), `weeks_duration INT?`, `active_months SMALLINT[]?` (1..12), is_active, last_generated_date). RLS scopée `auth.uid() = user_id`.
- **Edge function** `generate-recurring-trips` : insère un trip dans `trips` (source='recurring') pour chaque récurrence active dont `days_of_week` contient le jour courant (UTC), filtrée par `active_months` et la fenêtre `weeks_duration` depuis `created_at`. Calcule `ik_amount` via le barème embarqué + bonus 20% EV. **Auth obligatoire** : Bearer = `SUPABASE_SERVICE_ROLE_KEY` ou `RECURRING_TRIPS_CRON_TOKEN`, ou header `x-cron-secret` = `CRON_SECRET`/`RECURRING_TRIPS_CRON_TOKEN`.
- **Cron** `generate-recurring-trips-daily` (pg_cron) : exécution quotidienne à 05:00 UTC via `net.http_post`, en envoyant le service role key (lu depuis `vault.decrypted_secrets`) en Authorization Bearer.
- Source `'recurring'` ajoutée à la contrainte `trips_source_check`.
- **RPC** `get_recurring_trips_stats()` (SECURITY DEFINER) : total + créations par jour sur 7 jours. Accès `admin`/`viewer`. Utilisé par la card "Trajets récurrents" dans Admin → Statistiques.

## Durcissement sécurité (juin 2026)

Correctifs appliqués suite au scan sécurité :

- **Auth gates sur edge functions sensibles** : `convert-blog-images` exige un JWT admin (vérifie `has_role(_, 'admin')`). `generate-recurring-trips`, `sync-calendar-trips`, `recalculate-distances` n'acceptent plus que le service role key (Bearer), un token cron dédié (`RECURRING_TRIPS_CRON_TOKEN`) ou un `x-cron-secret` valide.
- **Ownership check** sur `recalculate-distances` : un utilisateur authentifié ne peut déclencher le recalcul que pour ses propres trajets. Le mode batch (sans `tripId`) est autorisé pour un utilisateur connecté mais filtré sur `user_id = auth.uid()` et `deleted_at is null` ; seul le cron/service role traite l'ensemble des utilisateurs.
- **HMAC-signed OAuth state** : `google-calendar-auth` et `outlook-calendar-auth` signent maintenant `state` (HMAC-SHA256 sur `user_id|nonce|exp` avec `SUPABASE_SERVICE_ROLE_KEY` comme clé) et vérifient signature + expiration au callback. Empêche la forgery de `user_id` dans le flux OAuth.
- **XSS reports** : helper `esc()` dans `src/lib/print-utils.ts`. Toutes les données utilisateur interpolées dans le HTML/JS du rapport sont échappées (titres, adresses, motifs, plaques).
- **Storage `feedback-images`** : policy INSERT scopée au préfixe `<auth.uid()>/...` — un user ne peut uploader que dans son propre dossier.
- **Audit `report_shares`** : policy SELECT admin ajoutée pour permettre l'audit des liens partagés sans casser l'accès public via service role.
- **Dépendances** : `html2pdf.js` et `vitest` mis à jour pour corriger les vulnérabilités critiques remontées par le scan.

Secrets associés (Supabase Vault / env edge) : `CRON_SECRET`, `RECURRING_TRIPS_CRON_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`.


## Partenaires sortants (juin 2026)

Système d'affiliation **sortante** (IKtracker → partenaires type Qonto, Indy), distinct des codes affiliés entrants (`affiliate_codes`).

- **Table** `outbound_partners` : catalogue (slug, name, logo_url, tagline, description, `category` enum, `target_url`, `commission_amount`, `commission_model` enum cpa/cps/cpc, is_active, priority, `target_personas` text[], `target_pages` text[]). RLS : `SELECT` public sur `is_active = true`, `ALL` réservé admin.
- **Table** `partner_clicks` : tracking serveur des clics (partner_id, user_id?, session_id, page, placement, persona, referrer, user_agent, ip_address). INSERT public autorisé, SELECT réservé admin/viewer.
- **Edge function** `partner-redirect` (publique, no JWT) : `GET /functions/v1/partner-redirect?slug=qonto&page=/&placement=inline_card&sid=...` → enregistre un clic puis 302 redirect vers `target_url` avec UTM auto-injectés (`utm_source=iktracker`, `utm_medium=partner_card`, `utm_content=<placement>`, `utm_campaign=<page>`).
- **RPC** `get_partner_stats(days_back)` : total_clicks, unique_sessions, estimated_revenue (clics × commission × 4% conversion), top_page, last_click_at — filtre admins/IPs exclues. Accès admin/viewer.
- **RPC** `get_partner_clicks_by_day(_partner_id?, days_back)` : courbe clics/jour pour graphiques admin.
- **Frontend** : composants `<PartnerCard />` (bloc inline, max 1/page) et `<PartnerStrip />` (bandeau footer multi-logos). Hook `usePartners({ page, persona, limit })` avec ciblage `target_pages` + `target_personas`. Liens toujours `rel="sponsored nofollow noopener"`. Onglet Admin → Coûts → Partenaires pour CRUD.
- **config.toml** : `[functions.partner-redirect] verify_jwt = false` (endpoint public — l'auth utilisateur est résolue best-effort via bearer optionnel).
- **Seeds** : Qonto + Indy insérés en `is_active = false` avec URLs placeholder. Aucun affichage public tant que l'admin n'a pas activé et renseigné les vraies URLs d'affiliation.



## Emails — Envoi via Resend (novembre 2026)

Bascule du système d'envoi d'emails de l'infra Lovable Emails vers **Resend** (via connector gateway Lovable) pour supporter les **pièces jointes PDF**.

- **Lovable Emails désactivés** : `email_domain--toggle_project_emails(enabled=false)`. Le sous-domaine `notify.iktracker.fr` reste délégué (NS `ns3/ns4.lovable.cloud`) tant que l'utilisateur n'a pas retiré les enregistrements chez son registrar.
- **Connector Resend** lié au projet — secrets injectés : `RESEND_API_KEY` (managed), utilisé via gateway `https://connector-gateway.lovable.dev/resend` avec `Authorization: Bearer $LOVABLE_API_KEY` + `X-Connection-Api-Key: $RESEND_API_KEY`.
- **Domaine expéditeur** : `iktracker.fr` (racine) — `FROM_EMAIL = "IKtracker <releves@iktracker.fr>"`, `reply_to = contact@iktracker.fr`. Nécessite validation SPF/DKIM/DMARC de `iktracker.fr` côté Resend (indépendant du sous-domaine `notify` délégué à Lovable).
- **Edge function** `send-accountant-report` réécrite :
  - Génère le HTML des relevés (période + cumul annuel).
  - Rend chaque relevé en **PDF** via **Browserless** (`POST https://production-sfo.browserless.io/pdf`, A4 avec `printBackground: true` et marges 18/14mm).
  - Envoie l'email via Resend avec les **2 PDF en pièces jointes** (base64) + liens sécurisés `https://iktracker.fr/temporaryreport/:id` (TTL 7j) en secours.
  - Header `Idempotency-Key: accountant-<user_id>-<period_start>` pour éviter les doublons.
- **Dépendances supprimées** : plus d'appel à `send-transactional-email`, plus de queue pgmq pour ce flux.
- **Cron** inchangé : `send-accountant-report-daily` (7h UTC).

## Relevé mensuel automatique à l'utilisateur (juillet 2026)

Envoi automatique du relevé kilométrique **à l'utilisateur lui-même** (distinct de l'envoi comptable).

- **Nouvelles colonnes `user_preferences`** :
  - `user_monthly_report_enabled boolean NOT NULL DEFAULT true` — opt-out par utilisateur.
  - `user_monthly_report_last_sent_at timestamptz` — anti-doublon (25 j min entre deux envois).
- **Edge function** `send-user-monthly-report` :
  - Récupère les users avec `user_monthly_report_enabled = true`.
  - Génère 2 relevés HTML → PDF (Browserless) : **mois précédent** + **cumul année civile en cours**.
  - Injecte un bloc **Profil véhicule** en tête de PDF (immatriculation, marque/modèle, motorisation, puissance fiscale, barème appliqué — bonus 20 % pour 100 % électrique).
  - Envoie via Resend (`releves@iktracker.fr`) avec 2 PDF en pièces jointes + 2 liens publics `https://iktracker.fr/temporaryreport/:id` appuyés par `report_shares` (TTL 7 j).
  - Idempotency key : `user-monthly-<user_id>-<year>-<month>`.
  - Endpoint POST accepte `{ user_id, dry_run?, override_email? }` pour test on-demand (bypass des filtres date/anti-doublon).
- **Cron** `send-user-monthly-report` : `0 7 15 * *` (**15 du mois, 07:00 UTC**), token lu depuis `vault.decrypted_secrets.email_queue_service_role_key`.
- **UI** : toggle « Relevé mensuel automatique » dans Préférences (activé par défaut).
- **Archivage durable** : après génération, le PDF mensuel est uploadé dans le bucket privé `report-archives` et indexé dans `report_archives` (helper partagé `supabase/functions/_shared/report-pdf.ts` → `archiveReportPdf`).

## Archive des relevés (`/app/archive`, juillet 2026)

- **Bucket privé** `report-archives` — chemin `{user_id}/{kind}/{period_start}-{slug}.pdf`. Aucune policy `storage.objects` : l'accès passe exclusivement par des URL signées (5 min) générées côté serveur avec la clé service role.
- **Table** `public.report_archives` : `user_id`, `kind` (`monthly` | `annual`), `period_label`, `period_start`, `period_end`, `storage_path`, `trip_count`, `total_km`, `total_ik`, `file_size`, unique sur `(user_id, kind, period_start, period_end)`. RLS : lecture et suppression réservées au propriétaire ; écriture réservée au service role.
- **Edge function** `report-archive` (JWT requis, tout scopé sur `auth.uid()`) :
  - `POST { action: 'signed_url', id }` → URL signée 5 min du PDF archivé.
  - `POST { action: 'generate_annual', period_start, period_end, label? }` → génère le relevé d'exercice (Browserless) et l'archive. Erreur 400 si aucun trajet sur la période.
- **Module partagé** `supabase/functions/_shared/report-pdf.ts` : `buildReportBody`, `wrapForPdf`, `renderPdf`, `archiveReportPdf` (mutualisé avec `send-user-monthly-report`), `send-accountant-report` et `report-archive`).

### Robustesse des relevés (Lot 3)

- **`supabase/functions/_shared/config.ts`** : source unique pour `FRONTEND_URL`, `BROWSERLESS_BASE`, `RESEND_GATEWAY`, `FROM_EMAIL`, `REPLY_TO`, `SHARE_TTL_DAYS`, `MAX_PDF_BYTES` (8 Mo), `MAX_PDF_TRIP_ROWS` (3000), `DB_PAGE_SIZE` (1000).
- **`fetchTripsForPeriod(admin, userId, start, end)`** (dans `report-pdf.ts`) : lecture paginée des trajets par pages de 1000 (`range`), utilisée par `report-archive`, `send-user-monthly-report` et `send-accountant-report`. Supprime la troncature silencieuse à 1000 lignes sur les relevés annuels.
- **Garde de taille PDF** : `renderPdf` échoue explicitement au-delà de `MAX_PDF_BYTES` ; au-delà de `MAX_PDF_TRIP_ROWS` le tableau est tronqué et une mention indique le nombre de trajets non détaillés (les totaux restent complets).
- **`partner-api`** : la résolution d'un utilisateur par e-mail utilise désormais une pagination réelle (`listUsers` par pages de 200, arrêt anticipé) au lieu d'un unique `perPage: 1000`.
- **Validation d'entrée** : `vehicle-lookup` et `test-bot-rendering` renvoient `400 {"error":"Invalid JSON body"}` sur corps vide ou JSON invalide (au lieu d'une 500).
- **`supabase/config.toml`** : `verify_jwt` déclaré explicitement pour toutes les fonctions (publiques : `meta-renderer`, `track-event`, en plus des existantes ; protégées : `report-archive`, `send-user-monthly-report`, `wavespeed`, `google-maps-key`, `gsc-analytics`, `marina-analyze`, `calendar-debug`, `generate-recurring-trips`, `purge-duplicate-trips`, `linkedin-weekly-post`, `linkedin-post-audit`, `test-bot-rendering`).
- **Frontend** : page desktop-only `/app/archive` (`src/pages/Archive.tsx`), entrée « Archive relevés » dans `DesktopSidebar`. Liste groupée par année, aperçu PDF en modale iframe, téléchargement, bouton « Générer le relevé annuel » sur le dernier exercice clos (dates dérivées de `fiscalYearStartMonth`/`fiscalYearStartDay`).
- **Rétroactif** : non — l'archive se remplit à partir des envois du 15 suivants.



## Extension utilisateurs API partenaire (juillet 2026)

Les utilisateurs provisionnés via `partner-api` (`findOrCreateIktrackerUser`) bénéficient désormais du relevé mensuel automatique :

- **Provisioning** : après création du mapping `partner_users`, `partner-api` fait un `upsert` sur `user_preferences (user_id)` — les défauts (`user_monthly_report_enabled = true`) s'appliquent. Backfill effectué pour les utilisateurs existants.
- **Nouveau webhook `monthly_report.sent`** émis par `send-user-monthly-report` après chaque envoi réussi. Payload :
  ```json
  {
    "event": "monthly_report.sent",
    "payload": {
      "iktracker_user_id": "...",
      "external_user_id": "...",
      "period_label": "octobre 2026",
      "ytd_label": "cumul 2026",
      "month_url": "https://iktracker.fr/temporaryreport/...",
      "ytd_url":   "https://iktracker.fr/temporaryreport/...",
      "month_trip_count": 12, "month_total_km": 340.5, "month_total_ik": 178.2,
      "ytd_trip_count": 128,  "ytd_total_km": 3820.1, "ytd_total_ik": 1994.4,
      "expires_at": "2026-11-22T07:00:00Z"
    },
    "timestamp": "2026-11-15T07:00:12Z"
  }
  ```
  Signé HMAC-SHA256 (`X-IKtracker-Signature: sha256=<hex>`). La clé est lue dans l'ordre suivant : `partner_webhooks.hmac_secret`, puis la variable d'environnement `IKTRACKER_WEBHOOK_SECRET` comme fallback. Fired uniquement pour les partenaires ayant `monthly_report.sent` dans leur array `events`. Dictadevi (et autres partenaires) doivent l'ajouter côté enregistrement du webhook pour être notifiés — c'est un pull côté partenaire vers `month_url`/`ytd_url` (liens sécurisés 7 j) plutôt qu'un push de données binaires.

## Filtres calendrier "événements personnels" (juillet 2026 — Niveau 1)

Pour éviter que des événements personnels (anniversaires, rappels, tâches, événements récurrents sans lieu) génèrent des trajets parasites, `sync-calendar-trips` applique une fonction déterministe `shouldSkipEvent(event)` avant `createTripFromEvent`. Basée sur des signaux **RFC 5545 / Google Calendar API / Microsoft Graph** explicites — aucun ML, aucun matching de mots-clés :

| Signal | Source | Comportement |
|---|---|---|
| `transparency = TRANSPARENT` (Google/ICS) ou `showAs = free` (Outlook) | RFC 5545 `TRANSP` | Skip — l'utilisateur est marqué "disponible", ce n'est pas un déplacement pro |
| `eventType = birthday` / `fromGmail` / `outOfOffice` / `focusTime` / `workingLocation` | Google Calendar API `eventType` | Skip — types explicitement non-professionnels |
| `categories` contient `Birthday` / `Anniversaire` / `Holiday` | ICS `CATEGORIES` | Skip |
| Événement all-day (`DTSTART;VALUE=DATE`) sans `LOCATION` | RFC 5545 | Skip — anniversaire, fête, jour férié |
| Récurrent all-day (`RRULE` + all-day) | RFC 5545 | Skip — patterns anniversaires annuels |

Les événements horaires **sans lieu** sont conservés (créés en `pending_location`) car ils peuvent correspondre à un vrai rendez-vous à compléter manuellement. Extension possible en Niveau 2 (opt-out par calendrier utilisateur) documentée dans la mémoire projet.

## Intégrations d'agents (MCP — juillet 2026)

Serveur MCP OAuth 2.1 exposant les données IKtracker à ChatGPT / Claude / Cursor via le protocole Model Context Protocol.

- **Entrée** : `src/lib/mcp/index.ts` (`defineMcp` + `auth.oauth.issuer`, issuer construit depuis `VITE_SUPABASE_PROJECT_ID`, audience `authenticated`).
- **Outils** (`src/lib/mcp/tools/`) :
  - `list_vehicles` — véhicules de l'utilisateur (immat, marque/modèle, motorisation, CV).
  - `list_trips` — trajets filtrables (date, statut, véhicule).
  - `get_ytd_summary` — cumul année en cours (km, IK, nombre de trajets).
  - `create_trip` — création d'un trajet (`needsApproval = true`).
- **Edge Function** : `supabase/functions/mcp/index.ts` — auto-générée par `@lovable.dev/mcp-js/stacks/supabase/vite` à chaque build Vite. **Ne pas éditer à la main**. Déployée avec `verify_jwt = false` (la vérification OAuth est faite par mcp-js contre l'issuer Supabase direct).
- **OAuth 2.1** : Supabase Auth agit comme Authorization Server (DCR activé via `supabase--configure_oauth_server`). Chaque connexion se fait au nom de l'utilisateur — RLS s'applique.
- **Page de consentement** : `/.lovable/oauth/consent` (`src/pages/OAuthConsent.tsx`) — affiche le nom du client, boutons Approuver/Refuser, redirige vers l'auth si non connecté (préserve `next=`).
- **URL publique du serveur MCP** : `https://<project-ref>.supabase.co/functions/v1/mcp` — à coller dans ChatGPT/Claude "Add MCP server".
- **Manifest** : `.lovable/mcp/manifest.json` — régénéré à chaque modification via `app_mcp_server--extract_mcp_manifest`.

## Changelog

- **3.5** (30 juillet 2026) — Audit LinkedIn ancré sur la doc technique : `linkedin-post-audit` embarque désormais sa propre copie de `docs-context.ts` (le générateur écrit dans les deux fonctions) et injecte jusqu'à 5 sections pertinentes comme source de vérité. Nouveau `factual_score` /10 avec liste `unverified_claims`, intégré au score composite (contenu 5 pts + vérifiabilité 5 pts) et bloquant pour la validation (`factual_score ≥ 8`) ; un échec factuel force une itération même en plateau.
- **3.4** (30 juillet 2026) — Boucle d'amélioration itérative LinkedIn : score composite /100 calculé côté serveur (40 pts déterministes + 60 pts éditoriaux pondérés hook ×3 / impressions ×2 / contenu ×1). Chaque correction relance un cycle d'audit jusqu'à `score ≥ 85` et `hook_score ≥ 8`. Garde-fous : 3 itérations max, détection de plateau (< 3 pts de gain), rejet d'un texte réécrit non conforme. Nouveaux statuts `max_attempts`, `plateau`, `fix_invalid`.
- **3.3** (30 juillet 2026) — Boucle qualité LinkedIn : nouvelle Edge Function `linkedin-post-audit` (cron `*/5 * * * *`) qui relit chaque post publié ~5 min après, l'audite (hook, potentiel d'impressions, contrôles déterministes de forme) et déclenche automatiquement une republication corrigée via `?mode=repost` en conservant le média. Nouvelles colonnes d'audit sur `linkedin_post_log`.
- **3.2** (27 juillet 2026) — Recalcul IK opt-in : la modif d'un véhicule (CV fiscaux, statut électrique) ne recalcule plus systématiquement les trajets passés. Nouvelle case « Mettre à jour les trajets passés » dans `VehicleForm` (côté app) et paramètre `update_past_trips` dans `PATCH /vehicles/:id` de l'API partenaire. Par défaut, seuls les trajets à venir utilisent le nouveau barème. Nouveau endpoint `GET /vehicles` (liste), webhook `vehicle.updated` enrichi (`changed[]`, `update_past_trips`, `recalculated_trips`).
- **3.1** (27 juillet 2026) — Renforcement anti-doublons des trajets à compléter : normalisation partagée en base (`normalize_trip_dedupe_text`), purge rétroactive par `date + destination + intitulé`, et trigger comptes liés (`sync_linked_trip_ins`) qui fusionne les variantes d'adresse au lieu de recréer un doublon. `sync-calendar-trips` applique la même garde avant insertion.
- **3.0** (27 juillet 2026) — API partenaire : endpoint `/preferences` étendu en lecture + écriture pour `calendar_import_mode` **et** `ik_rate_override` (`auto`|`tier1`|`tier2`|`tier3`). `PATCH` accepté en plus de `PUT`. Webhook `preferences.updated` enrichi (`ik_rate_override` + tableau `changed[]`). Filtrage rétroactif des doublons dans les trajets à compléter (`pending_location`) pour tous les utilisateurs.

- **2.9** (27 juillet 2026) — Consolidation domaine sur l'apex `iktracker.fr` (www + .com → 301 apex). Ajout du déploiement Wrangler du Worker Cloudflare (`cloudflare-worker/wrangler.toml` + README) et de la map `LEGACY_REDIRECTS` (8 slugs legacy → slugs modernes). Audit sitemap : `/marina` retiré, `/signup` dépriorisé à 0.5, `/meilleure-application-...` remonté à 1.0, `/bareme-ik-2026` passé en `monthly`. `robots.txt` : `/admin` et `/admin/` bloqués explicitement.

- **2.81** (24 juillet 2026) — Sitemap Edge Function : suppression des `lastmod` statiques non-page-specific conformément à la politique sitemap. `robots.txt` enrichi de `Disallow` explicites pour `/app/`, `/auth`, `/unsubscribe`, `/temporaryreport/`, `/sso`, `/offline`, `/debug/`, `/.lovable/oauth/consent`.
- **2.8** (24 juillet 2026) — Ajout Niveau 1 filtres calendrier (`shouldSkipEvent`) + section Intégrations d'agents (MCP OAuth). Documentation du fallback `IKTRACKER_WEBHOOK_SECRET` pour la signature HMAC des webhooks partenaires.
- **2.7** (24 juillet 2026) — Relevé mensuel automatique utilisateur (15 du mois) + webhook `monthly_report.sent` + auto-provisioning des `user_preferences` pour les users partenaires.
