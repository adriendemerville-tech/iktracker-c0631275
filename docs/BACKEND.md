# IKTracker — Documentation Technique Backend

> Version 2.6 — 22 juillet 2026

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
| Domaine canonique | www.iktracker.fr | Hôte SEO/GEO — Worker Cloudflare actif, pre-rendering bots |
| Apex | iktracker.fr | Sert le SPA aux humains (Worker bypassé par Lovable Publish cross-account) |
| Domaine secondaire | iktracker.com | Redirigé 301 vers www.iktracker.fr via Worker |

### Flux de requête

```
Utilisateur → Cloudflare DNS (proxied)
  → Cloudflare Worker (iktracker-bot-router) [www uniquement, apex bypassé]
    ├─ Bot détecté → Edge Function meta-renderer → HTML pré-rendu
    ├─ /sitemap.xml → Edge Function sitemap (fallback: fichier statique)
    ├─ Asset statique → Origin + cache headers
    ├─ Route privée (/app/*) → Origin passthrough
    └─ Utilisateur normal → Origin (SPA React)
```

### Domaines & Redirections

- Hôte canonique : **www.iktracker.fr** (canonicals, og:url, sitemap, JSON-LD, robots).
- `iktracker.fr` (apex) → sert le SPA directement (Worker non exécuté côté Lovable Publish) ; les canonicals pointent vers www pour consolider l'autorité SEO/GEO.
- `iktracker.com` / `www.iktracker.com` → 301 → `https://www.iktracker.fr`.
- Exception : `/robots.txt` et `/llms.txt` sur .com sont servis par proxy depuis www.iktracker.fr.

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
- **Cron** : `0 7 1-7 * 3` (1<sup>er</sup> mercredi du mois, 07:00 UTC ≈ 8h Paris hiver / 9h été)
- **Rotation** : 12 topics étiquetés par `format` (`video` / `carousel`) et par `mediaSource` (`browserless` / `wavespeed`). Sélection : `(année × 12 + mois) mod 12`.
- **Texte** : Mistral hébergé sur Wavespeed (`mistral/mistral-large-latest` via `WAVESPEED_API_KEY`), avec **fallback silencieux** sur Gemini 2.5 Flash (Lovable AI Gateway) en cas d'échec. Idem pour la génération du plan de slides des carrousels (`response_format: json_object`).
- **Média** :
  - `mediaSource: 'browserless'` → screencast MP4 d'une UI réelle du site (simulateur, mode tournée, sync calendrier, plaque, export PDF).
  - `mediaSource: 'wavespeed'` → visuel IA :
    - `format: 'video'` → text-to-video via `wavespeed-ai/wan-2.1-t2v-720p`, MP4 téléchargé puis uploadé.
    - `format: 'carousel'` → image de cover générée via `wavespeed-ai/flux-dev` puis embarquée en fond du slide 1 (scrim ivoire pour lisibilité) ; slides 2-5 restent en typographie pdf-lib pure. En cas d'échec Wavespeed, fallback silencieux sur le rendu typographique seul.
- **Upload LinkedIn** : `feedshare-video` → `shareMediaCategory: VIDEO` / `feedshare-document` → `shareMediaCategory: DOCUMENT`. Polling asset jusqu'à `AVAILABLE`, puis `POST /v2/ugcPosts`.
- **Query params** : `?topic=<slug>` force le topic, `?format=video|carousel` force le format, `?dry_run=1` renvoie texte + slide_plan sans publier ni uploader.
- **Logs** : `public.linkedin_post_log` (colonnes `media_type`, `triggered_by`, `duration_ms`, `error_message`).
- **Admin UI** : onglet "LinkedIn" dans `/admin` (composant `AdminLinkedIn.tsx`) — sélecteur topic + format + toggle dry-run + historique des 15 derniers runs.
- **Secrets** : `LOVABLE_API_KEY`, `LINKEDIN_API_KEY`, `WAVESPEED_API_KEY`, `BROWSERLESS_API_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

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
Sitemap: https://www.iktracker.fr/sitemap.xml
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
| `POST` | `/trips` | `trips:write` | Crée un trajet pour un user partenaire (provisioning auto si inexistant). `source` doit commencer par `partner:` |
| `GET` | `/stats` | `stats:read` | Stats annuelles de l'utilisateur (km, IK, palier en cours) |
| `GET` | `/dashboard?months=12` | `stats:read` | **🆕 Compteurs annuels + breakdown mensuel (1-24 mois) — alimente directement un BarChart** |
| `GET` | `/reports/:id/pdf` | `reports` / `trips:read` | Rendu PDF binaire (Browserless) d'un rapport partagé |
| `POST` | `/reports/generate` | `reports` / `trips:read` | Crée un `report_share` (HTML + URL publique 7j) |
| `POST` | `/reports/send-email` | `reports` | Envoi du rapport par email (Resend) |
| `POST` | `/sso/magic-link` | `sso` | Génère un magic link signé (JWT partenaire requis dans `Authorization`) |
| `POST` | `/sso/dev` | `sso` | **Dev only** — génère un magic link sans JWT, à partir de `external_user_id` + `external_email` |
| `GET` | `/preferences` | `preferences:read` / `read` | 🆕 Retourne `calendar_import_mode` (`individual` \| `tour`) et `has_home_address` pour l'utilisateur lié |
| `PUT` | `/preferences` | `preferences:write` / `write` | 🆕 Met à jour `calendar_import_mode`. Body : `{ "calendar_import_mode": "tour" }`. Déclenche le webhook `preferences.updated` |

### Endpoint `/preferences` — détail

Exposé pour permettre aux partenaires (ex. Dictadevi) d'offrir à leurs utilisateurs le choix du mode d'import calendrier sans quitter leur plateforme.

**Résolution utilisateur** : header `x-external-user-id` obligatoire → mapping `partner_users` → `iktracker_user_id`. Renvoie `404` si l'utilisateur n'est pas encore provisionné (appeler `/sso/magic-link` au préalable pour créer le mapping).

**`GET /preferences`** — réponse :
```json
{
  "calendar_import_mode": "individual" | "tour",
  "has_home_address": true,
  "note": null | "home_address_missing"
}
```
`has_home_address` reflète l'existence d'une entrée `locations` avec `label = 'Maison'` (case-insensitive). `note = "home_address_missing"` est renvoyé si le mode courant est `tour` sans Maison définie : dans ce cas `sync-calendar-trips` retombe silencieusement en trajets individuels.

**`PUT /preferences`** — body `{ "calendar_import_mode": "individual" | "tour" }`. Upsert sur `user_preferences (user_id, calendar_import_mode)`. Codes :
- `200` : préférence enregistrée, renvoie l'objet complet + `updated_at`.
- `400` : valeur invalide.
- `409` : `{ "error": "home_address_required" }` si activation `tour` sans Maison (bloquant : la préférence n'est pas modifiée).
- `403` : scope manquant (`preferences:write` ou fallback `write`).

**Webhook** `preferences.updated` (si l'endpoint partenaire y est abonné) :
```json
{
  "event": "preferences.updated",
  "timestamp": "2026-07-22T09:12:00Z",
  "payload": {
    "external_user_id": "user-12345",
    "calendar_import_mode": "tour"
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

Table `partner_webhooks` : URL + secret HMAC + liste d'événements abonnés. Permet de notifier le partenaire (ex: trajet créé, palier IK franchi). Signature `X-IKTracker-Signature: sha256=…`.

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

3. **`purge-duplicate-trips`** (nouvelle edge function) :
   - Auth : utilisateur admin via JWT, ou cron interne via header `x-cron-secret` égal au service role key.
   - Body : `{ "dry_run": true|false (def true), "user_id"?: uuid, "days_back"?: int (def 365) }`.
   - Regroupe par clé stricte, conserve le plus ancien trajet actif, soft-delete les autres (`deleted_at = now()`).
   - Mode `dry_run` retourne la liste des groupes sans modifier la base.
   - Log dans `error_logs` (type `maintenance`) lors d'une exécution réelle.

**Tâche planifiée**
Cron `purge-duplicate-trips-daily` (`pg_cron`), tous les jours à **03:15 UTC**, exécute la purge réelle sur les **90 derniers jours**. Le secret cron est lu depuis `vault.decrypted_secrets`.

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
- **Ownership check** sur `recalculate-distances` : un utilisateur authentifié ne peut déclencher le recalcul que pour ses propres trajets.
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

