# IKTracker — Documentation Technique Frontend

> Version 3.1 — 24 août 2026 (enrichissement SEO/GEO : tarifs, contact, page auteur)

**Notes v3.1 (contenu visible SSR — pages pauvres enrichies)**
- **`/tarifs`** : la FAQ est désormais **visible en HTML** (`<details>`, 7 questions) et alimentée depuis la même source `FAQ_ITEMS` que le JSON-LD `FAQPage` — fin de l'écart contenu/données structurées. Nouvelles sections « Tout est inclus, pour 0 € » (8 fonctionnalités) et « Combien coûtent les alternatives ? » avec maillage vers `/comparatif-izika`, `/comparatif-driversnote`, `/meilleure-application-indemnites-kilometriques`, `/fonctionnalites` et `/bareme-ik-2026`.
- **`/contact`** : intro éditoriale (réponse en général sous 48 h ouvrées, lecture personnelle par le fondateur) + bloc d'auto-assistance avant le formulaire (liens barème 2026, tarifs, lexique, blog).
- **`/blog/auteur/:slug`** : la route a un `loader` SSR qui charge les articles publiés de l'auteur (`author_name` ∈ {Adrien de Volontat, Adrien}, `status=published`, `is_listed=true`, 30 max) — liste réelle avec dates de publication dans le HTML initial (E-E-A-T). Ajout d'une section « Domaines d'expertise ». Le canonical est déclaré côté route.
- Vérifié dans le HTML servi (curl SSR) : sections et liens d'articles présents sans JavaScript ; 282 tests automatisés OK, dont la régression SSR à découverte automatique (v3.0).

**Notes v3.0 (régression SSR — toute nouvelle page est testée automatiquement)**
- Nouveau test `src/test/ssr-new-page-regression.test.ts` : **découverte automatique** des pages publiques en scannant `src/routes/*.tsx` — toute nouvelle page est soumise aux invariants sans enregistrement manuel : HTTP 200, `<h1>` dans le HTML initial, ≥ 300 caractères de texte visible (scripts/styles/balises retirés), ≥ 3 liens internes distincts, `<title>` propre. Les alias (`throw redirect` sans composant) sont détectés et vérifiés comme 301.
- Les pages fonctionnelles sans vocation éditoriale (auth, signup, sso, offline, unsubscribe, marina) sont listées dans `EXCLUSIONS` **avec raison obligatoire** ; un garde-fou échoue si une exclusion devient orpheline ou si la découverte ne trouve plus les pages (`/`, `/blog`, ≥ 20 pages).
- Couverture initiale : 27 pages de contenu + 10 alias 301, 94 assertions. Le test a immédiatement détecté un maillage interne insuffisant sur `/privacy` (1 lien distinct) et `/mentions-legales` (2) — corrigé par un bloc `<nav aria-label="Documents juridiques associés">` (liens croisés privacy/terms/rgpd/contact) en pied des deux pages.
- Seuil texte fixé à 300 car. : une coquille vide rendue côté client fait < 200 car. ; `/contact` (page formulaire légitimement courte) sert ~350 car.

**Notes v2.9 (SSR blog — contenu visible par les bots IA)**
- **Correctif critique `BlogContentWithRelated.tsx`** : le découpage des articles au format HTML utilisait `DOMParser`, inexistant dans le runtime SSR — chaque article HTML (injectés par Crawlers) plantait le rendu serveur et renvoyait un shell vide (0 car. de texte, pas de H1) aux crawlers. Ajout de `splitHtmlContentServer()` : fallback 100% string (regex) qui nettoie `script/style/title/meta/link` et coupe après le 2e `</p>`. Le chemin `DOMParser` reste utilisé côté client.
- **Index `/blog` désormais SSR** : la route `src/routes/blog/index.tsx` a un `loader` qui charge les articles publiés (`status=published`, `is_listed=true`, tri `display_order` harmonisé) ; `Blog.tsx` se hydrate depuis `useLoaderData` sans refetch client. Avant : 0 lien d'article dans le HTML initial ; après : liste complète + liens servant au crawl.
- Mesures avant/après (UA GPTBot, local) : `/blog` 2 127 → 17 588 car. de texte ; article HTML-type 0 → 9 408 car. Les 34 tests `ssr-structured-data.test.ts` passent.
- Règle durable : **aucune API navigateur (`DOMParser`, `document`, `window`) au rendu** dans les composants atteints par le SSR — uniquement dans des handlers ou derrière `useEffect`. Les usages restants (`TemporaryReport.tsx`, `pdf-utils.ts`) sont confinés à des actions d'impression.

**Notes v2.8 (performance requêtes)**
- Nouveau hook `src/hooks/useReferenceData.ts` : les **véhicules et lieux** sont désormais chargés via React Query mutualisé (`staleTime` 10 min, `gcTime` 30 min, clés `ref-vehicles`/`ref-locations` par utilisateur). Auparavant, `useTrips` — monté par 4 composants simultanés — refetchait ces deux tables hors cache à chaque montage (d'où ~62k lectures de `locations` et ~58k de `vehicles` constatées dans l'audit). Les lectures sont divisées par 5-10 sans changement visible.
- **Correction N+1 `TripCard`/`TripViewSheet`** : `TripViewSheet` ne monte plus son propre `useTrips()` (qui déclenchait 2 requêtes `trips` par carte affichée — 164 requêtes pour 81 trajets sur « Mes trajets »). Il reçoit désormais `updateTrip` en prop, fourni par la page parente via `TripCard` (`onUpdateTrip`). Résultat mesuré : 2 requêtes `trips` au total par page, 0 requête à l'ouverture de la fiche.
- `useTrips` ne fetch plus que les trajets ; les mutations véhicules/lieux écrivent en optimiste dans le cache partagé (`queryClient.setQueryData`), et la migration localStorage → BDD invalide les deux clés pour éviter tout cache vide transitoire. Le mode hors-ligne (localStorage) est inchangé.

**Notes v2.7**
- Nouveau flux **Atom** servi en SSR sur `/feed.xml` (`src/routes/feed[.]xml.ts`, 50 derniers articles, client admin) avec lien visible dans le footer marketing — accélère la découverte des nouveaux contenus par les crawlers.
- `src/lib/page-dates.ts` : source unique des dates éditoriales (`datePublished`/`dateModified`) alimentant à la fois le JSON-LD et la mention visible « Mis à jour le … » (`<LastUpdated />`) — les deux ne peuvent plus diverger.
- Audit accessibilité images : 47 balises `<img>` passées en revue, alts descriptifs standardisés, images décoratives en `alt="" aria-hidden="true"`, images de contenu enveloppées dans `<figure>`/`<figcaption>`.
- Nouvelle landing partenaire `/logiciel-devis-artisan` (DictaDevi, liens dofollow) avec image hero réaliste optimisée LCP (`fetchpriority="high"`, `loading="eager"`).
- Bio de l'auteur Adrien de Volontat enrichie de liens dofollow vers dictadevi.io et crawlers.fr (un paragraphe dédié chacun).

**Notes v2.5**
- Chantier qualité (lots 1 à 4) : tests Vitest (`vitest.config.ts`), Prettier, suppression des `any` sur les hooks métier, découpage des fichiers > 1000 lignes (`print-utils.ts`, `AdminStats.tsx`…), suppression des routes blog dupliquées.
- SSR réparé sur `/`, `/auth` et `/signup` : imports statiques dans `SmartRoutes.tsx` + `useHydrated`, plus aucun accès direct aux globales navigateur au rendu serveur.
- Navigation marketing simplifiée (`MarketingNav.tsx` : regroupement « Ressources ») et CTA « Créer mon compte » remonté above the fold sur mobile.
- A/B testing du H1 du hero (`src/lib/ab-test.ts`) avec restitution dans /admin > Stats.



**Notes v2.3 (consolidation blog & redirections)**
- `src/lib/blog-redirects.ts` contient les **22 redirections 301** des slugs de blog consolidés (articles archivés ou réorientés). Il est consommé par `beforeLoad` de `src/routes/blog/$slug.tsx` : la 301 part donc du SSR, sans dépendre du Worker Cloudflare.
- Ce fichier est le **miroir** de `supabase/functions/_shared/blog-redirects.ts` (source de vérité) et de `LEGACY_REDIRECTS` du Worker. `node scripts/validate-blog-redirects-sync.cjs` échoue si les trois divergent — à lancer après toute consolidation d'articles.
- Ajouter une redirection : éditer le fichier partagé côté Edge Function, répercuter dans `src/lib/blog-redirects.ts` et dans le Worker, puis relancer le script de validation.
- La route SSR `/sitemap.xml` sert **99 URLs** (28 pages statiques + articles `published`) ; les articles `archived` en sont exclus par la requête `status = 'published'`.
- `public/robots.txt` liste explicitement les pages indexables (dont `/artisans`, `/independants`, `/fonctionnalites`) ; le tenir à jour à chaque nouvelle landing publique.
- L'alias `/admin` redirige en **301** vers `/app/admin` (comme les 10 autres alias).
- Rappel images : tout article publié doit avoir un `featured_image_url` — les couvertures manquantes sont générées puis stockées dans le bucket `blog-images`.

**Notes v2.2 (SEO/GEO)**
- `/sitemap.xml` est désormais une route serveur SSR (`src/routes/sitemap[.]xml.ts`) qui interroge `blog_posts` à la requête : 28 pages statiques + tous les articles publiés (104 URLs). Le fichier statique `public/sitemap.xml` et le hook `prebuild` de génération ont été supprimés (ils shadowaient la route et se construisaient sans les articles en prod).
- La home `/` possède un `head()` dédié (titre orienté « application », canonical auto-référent) pour lever la cannibalisation avec `/bareme-ik-2026`.
- Les 10 routes alias renvoient un **301 permanent** (`statusCode: 301`) au lieu d'un 307.


## Table des matières

1. [Stack & Architecture](#1-stack--architecture)
2. [Pages & Routing](#2-pages--routing)
3. [Composants](#3-composants)
4. [Hooks](#4-hooks)
5. [Librairies utilitaires](#5-librairies-utilitaires)
6. [Design System](#6-design-system)
7. [Performance](#7-performance)

---

## 1. Stack & Architecture

### Technologies

| Technologie | Version | Rôle |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5 (strict) | Typage statique |
| TanStack Start | 1 | Framework full-stack SSR (Vite 7) |
| Tailwind CSS | 4 | Utility-first CSS (`@theme` dans `src/styles.css`) |
| shadcn/ui | - | Composants UI (Radix-based) |
| TanStack Router | 1 | Routing file-based (`src/routes/`) |
| TanStack Query | 5 | Data fetching & cache |
| Framer Motion | - | Animations |
| Helmet Async | - | SEO meta tags (via shim `@/lib/helmet-compat`) |
| Lucide React | - | Icônes |
| Recharts | - | Graphiques (lazy) |

### Architecture (post-migration TanStack Start — août 2026)

L'application a été migrée du stack Classic (Vite SPA + React Router 6) vers TanStack Start avec SSR. Points clés :

```
src/
├── router.tsx            → Création du router + QueryClient (staleTime 5min, retry 2)
├── server.ts             → Entrée serveur SSR (wrapper erreurs h3)
├── start.ts              → Middleware requêtes (errorMiddleware)
├── styles.css            → Design tokens Tailwind v4 (@theme), remplace index.css
├── routes/               → Routing file-based (1 fichier = 1 route)
│   ├── __root.tsx        → Layout racine : head(), providers, errorComponent
│   └── app/              → Espace protégé (ProtectedRoute par fichier de route)
├── pages/                → Composants de pages (importés par src/routes/)
├── components/           → Composants réutilisables
│   ├── AppChrome.tsx     → LogoutOverlay, GlobalTourRecovery, SurveyWidget
│   └── auth/ProtectedRoute.tsx → Guard auth (AuthRequiredModal + EmailVerificationGate)
├── lib/
│   ├── router-compat.tsx → Shim react-router-dom → TanStack Router
│   └── helmet-compat.tsx → Shim react-helmet-async (interop CJS/ESM SSR)
├── hooks/ · types/ · integrations/supabase · assets/
```

### Compat & invariants SSR

- **`@/lib/router-compat`** : tous les anciens imports `react-router-dom` (Link, useNavigate, useParams, useSearchParams…) passent par ce shim — ne pas importer `react-router-dom` ni `@tanstack/react-router` directement dans les pages existantes.
- **`@/lib/helmet-compat`** : tous les imports `Helmet`/`HelmetProvider` passent par ce shim (import namespace + résolution `.default`) — un import nommé direct de `react-helmet-async` casse le SSR, un import default casse le build client. Le shim exporte désormais un **wrapper `Helmet`** qui sépare les enfants : les balises `meta`/`link`/`title` partent vers react-helmet-async, tandis que les `<script type="application/ld+json">` sont rendus **inline dans le corps du document**, donc présents dans le HTML SSR (Helmet ne mute le `<head>` qu'après hydratation, ce qui rendait les JSON-LD invisibles pour Googlebot et les agents LLM).
- **Pas d'accès `window`/`localStorage`/`sessionStorage` au niveau module ou dans les initialiseurs `useState`** sans garde `typeof … !== 'undefined'` (le SSR évalue les modules côté serveur).
- `src/routeTree.gen.ts` est généré — ne jamais l'éditer.

### Providers globaux (src/routes/__root.tsx)

```
QueryClientProvider (React Query, staleTime: 5min, retry: 2)
  → HelmetProvider (shim)
    → ErrorBoundary / errorComponent (fallback brandé + reportLovableError)
      → TooltipProvider (shadcn)
        → Toaster + Sonner (notifications)
          → AuthContext.Provider
            → AnalyticsTracker (react-ga4, interop CJS)
            → AppChrome (LogoutOverlay, GlobalTourRecovery, SurveyWidget)
            → <Outlet />
```

---

## 2. Pages & Routing

### Routes publiques (marketing/SEO)

| Route | Page | Description |
|---|---|---|
| `/` | `Landing` | Page d'accueil (smart redirect si auth) |
| `/auth` | `Auth` | Connexion (smart redirect si auth) |
| `/signup` | `Signup` | Inscription (smart redirect si auth) |
| `/blog` | `Blog` | Liste des articles |
| `/blog/:slug` | `BlogPost` | Article de blog |
| `/blog/auteur/:slug` | `AuthorPage` | Page auteur (loader SSR : liste des articles publiés + expertise E-E-A-T) |
| `/privacy` | `Privacy` | Politique de confidentialité |
| `/terms` | `Terms` | CGVU (Conditions Générales de Vente et d'Utilisation) |
| `/mentions-legales` | `MentionsLegales` | Mentions légales |
| `/rgpd` | `Rgpd` | Conformité RGPD (droits, sécurité, hébergement) |
| `/contact` | `Contact` | Page contact (auto-assistance : barème, tarifs, lexique + formulaire, délai 48 h) |
| `/installer` | `Install` | Guide d'installation PWA (bloc « distribution web uniquement, aucun store ») |
| `/fonctionnalites` | `Fonctionnalites` | Panorama complet des fonctionnalités (5 familles) + FAQ de désambiguïsation |
| `/expert-comptable` | `ExpertComptable` | Landing expert-comptable (relevés mensuels, récap annuel, archive PDF) |
| `/artisans` | `Artisans` | Landing BTP / chantiers, partenaire DictaDevi (dofollow) |
| `/logiciel-devis-artisan` | `LogicielDevisArtisan` | Landing partenaire DictaDevi (dofollow), image hero réaliste, JSON-LD Article/FAQPage |
| `/independants` | `Independants` | Landing visibilité & acquisition, partenaire Crawlers.fr (dofollow) |
| `/mode-tournee` | `ModeTournee` | Landing mode tournée (inclut la section Smart Add vocal) |
| `/calendrier` | `Calendrier` | Landing sync calendrier |
| `/bareme-ik-2026` | `BaremeIK2026` | Simulateur barème IK |
| `/frais-reels` | `FraisReels` | Guide frais réels |
| `/note-de-frais-kilometrique` | `NoteDeFraisKilometrique` | Guide note de frais |
| `/indemnite-kilometrique-velo` | `IndemniteKilometriqueVelo` | Guide IK vélo |
| `/indemnite-grand-deplacement-2026` | `IndemniteGrandDeplacement2026` | Guide grand déplacement |
| `/mes-trajets` | `MesTrajetsLanding` | Landing SEO historique de trajets |
| `/tarifs` | `Tarifs` | Tarifs (gratuit à vie) : FAQ visible partagée avec le JSON-LD, fonctionnalités incluses, comparatifs |
| `/api-docs` | `ApiDocs` | Documentation API partenaire |
| `/lexique` | `Lexique` | Lexique IK |
| `/comparatif-izika` | `ComparatifIzika` | Comparatif vs Izika |
| `/comparatif-driversnote` | `ComparatifDriversNote` | Comparatif vs Driver's Note |
| `/meilleure-application-indemnites-kilometriques` | `MeilleureApplicationIK` | Comparatif applications IK |
| `/marina` | `MarinaAnalyze` | Analyse IA documents |
| `/sso` | `Sso` | Point d'entrée SSO partenaire |
| `/unsubscribe` | `Unsubscribe` | Désinscription emails |
| `/offline` | `Offline` | Page hors-ligne |
| `/temporaryreport/:id` | `TemporaryReport` | Rapport partagé (public) |

### Routes protégées (`/app/*`)

| Route | Page | Description |
|---|---|---|
| `/app` | `Index` | Dashboard principal (ajout trajet) |
| `/app/mestrajets` | `MesTrajets` | Historique des trajets |
| `/app/archive` | `Archive` | Archive des relevés PDF mensuels/annuels (aperçu + export CSV) |
| `/app/profile` | `Profile` | Profil utilisateur |
| `/app/admin` | `Admin` | Dashboard admin |
| `/app/admin/blog` | `BlogAdmin` | Gestion articles blog (onglets : Articles, Brouillons, **Corbeille**, Journal API, **Liste noire**). Sélection multiple par checkbox + actions groupées (publier, dépublier, mettre à la corbeille, restaurer, supprimer définitivement) sur les onglets Articles et Corbeille. |
| `/app/admin/blog/edit/:id?` | `BlogEditor` | Éditeur d'article |
| `/app/admin/partners` | `AdminPartners` | Gestion des partenaires sortants |
| `/app/blog/edit/:id?` | `BlogEditor` | Éditeur (alias) |
| `/app/theme-onboarding` | `ThemeOnboarding` | Choix du thème |
| `/app/recovery` | `RecoveryWizard` | Récupération tournée |

### Redirections (anciennes URLs & alias)

| Ancien path | Nouveau path |
|---|---|
| `/mestrajets` | `/app/mestrajets` |
| `/report` | `/app/mestrajets` |
| `/profile` | `/app/profile` |
| `/admin` | `/app/admin` |
| `/admin/blog` | `/app/admin/blog` |
| `/recovery` | `/app/recovery` |
| `/theme-onboarding` | `/app/theme-onboarding` |
| `/install` | `/installer` |
| `/experts-comptables` | `/expert-comptable` |
| `/devis-chantier` | `/artisans` |
| `/acquisition-de-clients`, `/indépendants` | `/independants` |

### Guards & Smart Components

| Composant | Rôle |
|---|---|
| `ProtectedRoute` | Redirige vers `/auth` si non authentifié |
| `SmartLanding` | Redirige les users auth vers `/app` (sauf `?from=app`) |
| `SmartAuth` | Redirige les users auth vers `/app` |
| `SmartSignup` | Redirige les users auth vers `/app` |

---

## 3. Composants

### Composants principaux (~40)

#### Application core

| Fichier | Rôle |
|---|---|
| `AddressCard.tsx` | Carte d'adresse (domicile/travail) |
| `AddressForm.tsx` | Formulaire d'ajout/édition d'adresse |
| `AnalyticsTracker.tsx` | Tracking analytics (page views, events) |
| `ArchivedTripsSection.tsx` | Section trajets archivés |
| `AuthForm.tsx` | Formulaire connexion/inscription (inclut scopes calendrier au sign-in OAuth) |
| `AuthLoadingScreen.tsx` | Écran de chargement auth |
| `BodyEndInjections.tsx` | Injections de code (scripts tracking) |
| `Breadcrumb.tsx` | Fil d'Ariane SEO |
| `CalendarConnections.tsx` | Gestion connexions calendrier |
| `CalendarSyncNotification.tsx` | Notification de sync calendrier |
| `CompleteAddressSheet.tsx` | Sheet de complétion d'adresse |
| `Counter.tsx` | Compteur animé |
| `DesktopSidebar.tsx` | Sidebar desktop (navigation, véhicules, feedback, section « Par le même fondateur ») |
| `ErrorBoundary.tsx` | Boundary d'erreur global |
| `FeedbackForm.tsx` | Formulaire de feedback (avec image) |
| `FloatingActionButton.tsx` | FAB mobile |
| `FocusTourView.tsx` | Vue focus mode tournée (minimize, refresh km, signal GPS) |
| `GeolocationBanner.tsx` | Bannière permission géolocalisation |
| `GeolocationTutorialModal.tsx` | Tutoriel activation GPS |
| `GlobalTourRecovery.tsx` | Récupération globale de tournée |
| `InstallBanner.tsx` | Bannière installation PWA |
| `LocationPicker.tsx` | Sélecteur d'adresse (Google Places) |
| `LogoutOverlay.tsx` | Overlay animé de déconnexion |
| `NavLink.tsx` | Lien de navigation |
| `NewTripSheet.tsx` | Sheet d'ajout de trajet |
| `OnboardingTutorial.tsx` | Tutoriel premier lancement |
| `PWAPromoSection.tsx` | Section promo PWA |
| `PersonaPicker.tsx` | Sélecteur de persona |
| `PreferencesContent.tsx` | Contenu des préférences |
| `QueryErrorBoundary.tsx` | Boundary d'erreur React Query |
| `ReferralSourceModal.tsx` | Modal source de découverte |
| `ThresholdAlert.tsx` | Alerte seuil kilométrique |
| `TourButton.tsx` | Bouton démarrage tournée |
| `TourDetailSheet.tsx` | Détail d'une tournée |
| `TourLogSheet.tsx` | Log GPS de tournée |
| `TourRecoveryModal.tsx` | Modal récupération tournée |
| `TripCard.tsx` | Carte de trajet |
| `TripViewSheet.tsx` | Vue détaillée d'un trajet |
| `VehicleCard.tsx` | Carte de véhicule |
| `VehicleForm.tsx` | Formulaire véhicule (avec recherche plaque) |

#### Composants Admin (`components/admin/`)

| Fichier | Rôle |
|---|---|
| `AdaptiveChart.tsx` | Graphique adaptatif (responsive) |
| `AdminAffiliation.tsx` | Gestion des codes d'affiliation |
| `AdminAutopilot.tsx` | Monitoring autopilot |
| `AdminCosts.tsx` | Dashboard coûts API |
| `AdminDocumentation.tsx` | Documentation technique intégrée |
| `AdminMonitoring.tsx` | Monitoring erreurs & logs |
| `AdminSurveys.tsx` | Gestion des sondages A/B |
| `AutopilotCounters.tsx` | Compteurs autopilot |
| `DraggableMarketingCards.tsx` | Cards marketing (drag & drop) |
| `DraggableStatsSection.tsx` | Section stats (drag & drop) |
| `UserKPISheet.tsx` | KPI détaillés par utilisateur |

#### Composants Blog (`components/blog/`)

| Fichier | Rôle |
|---|---|
| `ArticleSummary.tsx` | Résumé automatique d'article |
| `BlogContentWithRelated.tsx` | Contenu blog avec articles liés |
| `BlogKpiDashboard.tsx` | KPI du blog (admin) |
| `ContentBlockEditor.tsx` | Éditeur de blocs (drag & drop) |
| `ContentEditor.tsx` | Éditeur Markdown (images, liens) |
| `RelatedArticle.tsx` | Carte article lié |
| `RelatedArticleMarker.tsx` | Marqueur position article lié |

#### Composants Marketing (`components/marketing/`)

| Fichier | Rôle |
|---|---|
| `AnimatedPhoneMockup.tsx` | Mockup téléphone animé |
| `AppCarousel.tsx` | Carrousel de screenshots |
| `CalendarSyncDemo.tsx` | Démo sync calendrier |
| `CrawlersBanner.tsx` | Bannière crawlers IA |
| `EnhancedMarketingFooter.tsx` | Footer marketing enrichi |
| `MarketingFooter.tsx` | Footer marketing simple |
| `MarketingNav.tsx` | Navigation marketing |
| `MarketingPWANotification.tsx` | Notification PWA marketing |
| `TestimonialsCarousel.tsx` | Carrousel témoignages |
| `TourModeDemo.tsx` | Démo mode tournée |
| `TourModeMockup.tsx` | Mockup mode tournée |

#### Composants Charts (`components/charts/`)

| Fichier | Rôle |
|---|---|
| `LazyCharts.tsx` | Wrapper lazy-load Recharts |
| `ProfileKmChart.tsx` | Graphique km mensuels (profil) |

#### Composants Trip (`components/trip/`)

| Fichier | Rôle |
|---|---|
| `DetailsStepContent.tsx` | Contenu de l'étape détails d'un trajet |

#### Composants UI (shadcn/ui — 35 primitives)

`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `button`, `calendar`, `card`, `checkbox`, `dialog`, `drawer`, `dropdown-menu`, `form`, `input`, `label`, `optimized-image`, `popover`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `sheet`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`, `toggle-group`, `tooltip`

Custom UI : `optimized-image.tsx` (chargement lazy avec blurhash).

---

## 4. Hooks

### Hooks d'authentification & autorisation

| Hook | Rôle |
|---|---|
| `useAuth.ts` | Auth state (user, loading, signOut, requiresAuth) |
| `useAuthLazy.ts` | Auth lazy-loaded (pour composants non critiques) |
| `useAdmin.ts` | Vérifie rôle admin (via `has_role`) |
| `useAdminLazy.ts` | Admin check lazy-loaded |

### Hooks de données

| Hook | Rôle |
|---|---|
| `useTrips.ts` | CRUD trajets (Supabase) — véhicules/lieux délégués à `useReferenceData` |
| `useReferenceData.ts` | Véhicules & lieux via React Query mutualisé (staleTime 10 min) |
| `usePreferences.ts` | Préférences utilisateur |
| `useFeedback.ts` | Envoi/lecture feedback |
| `useCalendarConnections.ts` | Connexions calendrier |
| `useDistanceCache.ts` | Cache des distances |

### Hooks d'UI & UX

| Hook | Rôle |
|---|---|
| `use-mobile.tsx` | Détection mobile (media query) |
| `use-toast.ts` | Système de toasts (shadcn) |
| `useTheme.ts` | Thème clair/sombre |
| `useNightMode.ts` | Mode nuit automatique |
| `useContainerWidth.ts` | Largeur du container (responsive charts) |
| `useScrollAnimation.ts` | Animations au scroll |
| `useTutorial.ts` | État du tutoriel onboarding |

### Hooks techniques

| Hook | Rôle |
|---|---|
| `useGoogleMaps.ts` | Chargement Google Maps SDK |
| `useGeolocation.ts` | Position GPS |
| `useGeolocationPermission.ts` | Permission géolocalisation |
| `useOnlineStatus.ts` | Détection connectivité |
| `useWakeLock.ts` | Wake Lock API (écran allumé) |
| `useMarketingTracker.ts` | Tracking événements marketing. Délègue à l'edge function `track-event` (IP captée server-side via headers Cloudflare — plus de dépendance à `api.ipify.org`, bloqué par uBlock/Brave/Pi-hole). Filtre bots + admins (double filtre client+serveur, cache session sur `is_admin_user`). Session/device/admin helpers factorisés dans `src/lib/tracking-shared.ts`. |
| `signup-tracking.ts` (lib) | Événements funnel signup (`signup_view`, `signup_oauth_start`, `signup_oauth_return`, `signup_oauth_denied`, `signup_oauth_abandon`, `signup_form_submit`, `signup_error`, `signup_success`). Passe par `track-event`. Déduplication de `signup_view` par session via `sessionStorage` (un rechargement de `/signup` ne compte plus double). |
| `oauth-return-tracking.ts` (lib) | Détecte le retour depuis l'écran de consentement OAuth. `markOAuthStart()` pose un marqueur `sessionStorage` avant `signInWithOAuth`; `resolveOAuthReturn(hasSession)` (monté sur `/auth` et `/signup`) émet `signup_oauth_return`, `signup_oauth_denied` (`error=access_denied`) ou `signup_oauth_abandon` (retour sans session ni erreur, ou marqueur périmé > 15 min). Miroir GA4 des mêmes évènements avec `provider`, `elapsed_ms`, `outcome`. |

| `tracking-shared.ts` (lib) | Helpers communs `getSessionId()`, `getDeviceType()`, `checkIsAdmin()` (cache session) partagés entre `useMarketingTracker` et `signup-tracking`. |

### Hooks mode tournée

| Hook | Rôle |
|---|---|
| `useTourTracker.ts` | Logique principale de tournée GPS. Gap-filling sérialisé (pas de double comptage). Expose `forceRefreshDistance()` pour mise à jour manuelle du compteur |
| `useTourSessionDB.ts` | Persistence sessions tournée (Supabase) |
| `useTourSessionRecovery.ts` | Récupération de session interrompue |

### Mode tournée — Architecture résumée (v1.3)

#### Minimisation / Restauration
- `Index.tsx` gère un état `tourMinimized` : quand activé, `FocusTourView` est masqué et remplacé par un pill flottant orange (icône `Car` + distance) en haut à droite
- Cliquer sur le pill restaure la vue focus. La tournée continue en arrière-plan (GPS tracking actif)

#### Anti double-comptage (fix mai 2026)
- Le `visibilitychange` handler dans `useTourTracker` est **sérialisé** : `watchPosition` ne redémarre qu'**après** la fin du gap-filling (`getCurrentPosition`) et la mise à jour de `lastPositionRef.current`
- Le listener redondant dans `Index.tsx` a été supprimé — `useTourTracker` est la source unique de vérité pour la récupération de distance foreground/background

#### Rafraîchissement manuel
- Bouton `RotateCw` dans `FocusTourView` : appelle `forceRefreshDistance()` qui récupère la position GPS courante et met à jour le compteur

#### Estimation IK en fin de tournée
- `handleConvertToTrips` utilise la Distance Matrix API (route réelle) entre les stops pour le calcul final IK, indépendamment du compteur GPS temps réel

---

## 5. Librairies utilitaires

| Fichier | Rôle |
|---|---|
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge), helpers divers |
| `lib/distance.ts` | Calcul de distances, barème IK |
| `lib/geocoding.ts` | Géocodage (Google Maps API) |
| `lib/idle-callback.ts` | `deferTask()`, `whenInteractive()`, `preloadModule()` |
| `lib/image-transform.ts` | Conversion images (WebP) |
| `lib/image-utils.ts` | Helpers images |
| `lib/pdf-utils.ts` | Génération PDF (html2pdf) |
| `lib/print-utils.ts` | Impression (window.print) |
| `lib/sounds.ts` | Sons UI (feedback sonore) |
| `lib/ssr-utils.ts` | Helpers SSR (détection server/client) |

---

## 6. Design System

### Tokens CSS (index.css)

Le thème est défini via des CSS custom properties HSL :

```css
:root {
  --background, --foreground
  --card, --card-foreground
  --popover, --popover-foreground
  --primary, --primary-foreground
  --secondary, --secondary-foreground
  --muted, --muted-foreground
  --accent, --accent-foreground
  --destructive, --destructive-foreground
  --border, --input, --ring
  --sidebar-*  (tokens sidebar)
  --chart-1..5 (couleurs graphiques)
}
```

Mode sombre via `.dark { ... }`.

### Tailwind Config

- `tailwind.config.ts` : mapping des tokens CSS vers les classes Tailwind
- Base color : `slate`
- Prefix : aucun
- Plugins : `tailwindcss-animate`

### Composants shadcn/ui

- Config : `components.json` (style `default`, `rsc: false`)
- Aliases : `@/components`, `@/lib`, `@/hooks`, `@/components/ui`

---

## 7. Performance

### Lazy loading

- **Toutes les pages** sont lazy-loaded via `React.lazy()` + `Suspense`
- Les composants UI non critiques (`Toaster`, `Sonner`, `TooltipProvider`) sont lazy
- `Recharts` est lazy via `LazyCharts.tsx`
- `ProfileKmChart` est lazy dans `Profile.tsx`

### Preloading stratégique (main.tsx)

```
whenInteractive() → si /app :
  - preload MesTrajets
  - preload Profile

deferAnalytics() → fonts.ready → classe CSS
```

### Google Maps

- Preload différé via `requestIdleCallback` (seulement sur `/app/*`)
- SDK chargé à la demande via `useGoogleMaps`

### Optimisations

| Technique | Détail |
|---|---|
| React Query | staleTime 5min, retry 2, pas de refetch on focus |
| Code splitting | Chaque page = chunk séparé |
| Image lazy | `OptimizedImage` avec loading lazy |
| Wake Lock | Écran allumé en mode tournée |
| Idle callback | Tâches non critiques différées |
| Fallback `null` | `PageLoader = () => null` (pas de flash) |

### Fichiers de test

| Fichier | Cible |
|---|---|
| `components/AuthForm.test.tsx` | AuthForm |
| `components/ThresholdAlert.test.tsx` | ThresholdAlert |
| `components/VehicleCard.test.tsx` | VehicleCard |
| `types/trip.test.ts` | Types Trip |
| `test/setup.ts` | Config Vitest |

---

## Annexe — Structure des fichiers

```
src/
├── main.tsx
├── App.tsx
├── App.css
├── index.css
├── vite-env.d.ts
├── components/          (40+ composants)
│   ├── ui/              (35 primitives shadcn)
│   ├── admin/           (11 composants)
│   ├── blog/            (7 composants)
│   ├── charts/          (2 composants)
│   ├── icons/           (1 composant)
│   ├── marketing/       (11 composants)
│   └── trip/            (1 composant)
├── hooks/               (24 hooks)
├── lib/                 (10 utilitaires)
├── pages/               (27 pages)
├── types/               (trip.ts)
├── integrations/supabase/
│   ├── client.ts        (auto-généré)
│   └── types.ts         (auto-généré)
└── assets/
```

## Trajets récurrents (UI)

- `src/components/NewTripSheet.tsx` : toggle **Récurrent** sous le motif, expose checkboxes jours, durée en semaines, mois actifs. Mode `recurringOnly` pour création directe d'une récurrence sans trip ponctuel.
- `src/components/RecurringTripsModal.tsx` : liste/édition/suppression des récurrences (jours, `weeks_duration`, `active_months`). Bouton **+** ouvrant `NewTripSheet` en mode `recurringOnly`.
- `src/hooks/useRecurringTrips.ts` : CRUD via React Query sur `recurring_trips`.
- `src/pages/MesTrajets.tsx` : footer 3 colonnes (Adresses / Récurrents / Nouveau), bouton "Récurrents" icône seule sur mobile. Support `?tab=RECURRENT` pour auto-ouvrir la modal.
- `src/pages/MesTrajetsLanding.tsx` : landing SEO/GEO `/mes-trajets` avec JSON-LD `FAQPage` + `HowTo` + `SoftwareApplication`.
- `src/components/marketing/IKSimulator.tsx` : simulateur IK réutilisable (lead magnet) embarqué sur `Landing.tsx` et `BaremeIK2026.tsx`.

## Sécurité front (juin 2026)

- `src/lib/print-utils.ts` : helper `esc()` pour échapper toutes les données utilisateur dans le HTML/JS des rapports imprimables (XSS).
- `useAuth` : nettoyage explicite du token Supabase en `localStorage` au signOut pour éviter les sessions fantômes après 403 serveur.


## Partenaires sortants (UI)

- `src/hooks/usePartners.ts` : React Query, filtre `is_active`, ciblage `target_pages` + `target_personas`. Helper `buildPartnerRedirectUrl()` qui construit l'URL via `partner-redirect` edge function avec UTM auto.
- `src/components/marketing/PartnerCard.tsx` : bloc inline (variant `inline`/`compact`). Retourne `null` si aucun partenaire actif ne match → invisible par défaut.
- `src/components/marketing/PartnerStrip.tsx` : bandeau multi-logos placé en bas des landings (`/`, `/frais-reels`, `/tarifs`).
- `src/components/admin/AdminPartners.tsx` : CRUD admin (onglet **Admin → Coûts → Partenaires**) avec KPIs (clics, sessions uniques, revenu estimé, courbe 7j).
- Intégrations actuelles : `Landing.tsx` (sous `<IKSimulator />` + footer strip), `FraisReels.tsx` (strip), `Tarifs.tsx` (strip).
- Tous les liens sortants : `target="_blank"` + `rel="sponsored nofollow noopener"`.


## Tournées — étapes horodatées & audit (juillet 2026)

- `src/types/trip.ts` : `TourStopData.timestamp` (Date d'arrivée à l'étape) — source de vérité pour l'audit, alimentée par les 3 origines de tournée (GPS live, import Calendar mode `tour`, regroupement manuel).
- `src/components/TripCard.tsx` : détection tournée unifiée sur `tourStops.length >= 2` (indépendante du `purpose`). Sur desktop, boutons **édition** (crayon) et **suppression** (croix) toujours montés mais révélés au survol/focus clavier via `group-hover` + `group-focus-within` (`opacity-0 → opacity-100`), évitant le layout shift et préservant l'accessibilité clavier. Sur mobile, comportement inchangé (sélection multi).
- `src/lib/print-utils.ts` : rapport PDF affiche pour chaque tournée le détail des étapes avec heure d'arrivée (`Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' })`), fallback explicite `(heure non enregistrée)` si absent, suffixe `· heures Europe/Paris` dans l'en-tête pour lever toute ambiguïté d'audit. Trip parent + détail regroupés dans un `<tbody style="page-break-inside: avoid">` pour empêcher l'orphelinage lors des sauts de page.

## Modale « Compléter le trajet » — centrage & pré-remplissage (juillet 2026)

- `src/components/CompleteAddressSheet.tsx` : passage de `Sheet` (bottom-aimanté) à `Dialog` (centré, `max-h-[90vh]` avec `overflow-y-auto`) — meilleur ergonomie desktop et évite le masquage par le clavier mobile.
- **Pré-remplissage** : helper `isGenericAddress()` (détecte `"Maison"`, `"Domicile"`, chaînes vides) — l'`useEffect` de pré-remplissage priorise désormais `trip.start_location` / `trip.end_location` réels et ne retombe sur la Maison courante que si l'adresse stockée est générique. Corrige le bug où une adresse Châteaurenard devenait Auriac-sur-Vendinelle après ouverture de la modale.

## Intégrations d'agents (MCP) — Frontend (juillet 2026)

- `src/pages/OAuthConsent.tsx` (route `/.lovable/oauth/consent`) — écran de consentement OAuth 2.1 pour les clients MCP (ChatGPT, Claude, Cursor). Utilise `supabase.auth.oauth.{getAuthorizationDetails,approveAuthorization,denyAuthorization}` (namespace beta).
- **Redirection auth** : `src/components/AuthForm.tsx` consomme `?next=` sur sign-in, sign-up (`emailRedirectTo`) **et** OAuth social (`redirect_uri`) pour renvoyer l'utilisateur vers la page de consentement après authentification — sans quoi le connecteur "Add to Lovable" retombe silencieusement sur `/`.
- **Serveur MCP** : défini dans `src/lib/mcp/` (voir doc backend), 4 outils exposés : `list_vehicles`, `list_trips`, `get_ytd_summary`, `create_trip`.
- **Vite plugin** : `mcpPlugin()` dans `vite.config.ts` — régénère `supabase/functions/mcp/index.ts` à chaque build.

## Gate de vérification email (août 2026)

- `src/components/EmailVerificationGate.tsx` : modale bloquante déclenchée après 5 min de première session si l'email n'est pas vérifié. Bouton « Renvoyer le lien », ouverture automatique d'un onglet Gmail si l'adresse est `@gmail.com`, croix de fermeture en haut à droite.
- `src/hooks/useEmailGate.ts` : source de vérité des limites tant que l'email n'est pas confirmé — **3 trajets** et **1 tournée** maximum, export de relevé désactivé.

## Ajout intelligent de trajet (Smart Add)

- `src/components/TripPromptBar.tsx` : champ texte en langage naturel + bouton micro, en bas de la feuille « Nouveau trajet ».
- Pipeline : transcription vocale (Whisper via `transcribe-audio`) puis extraction structurée (`parse-trip-prompt`, Mistral). Le résultat pré-remplit le formulaire, jamais d'insertion directe.
- Surface marketing associée : section Smart Add sur `/mode-tournee`.

## Archive des relevés (`/app/archive`)

- `src/pages/Archive.tsx` : liste des relevés PDF mensuels et annuels générés automatiquement, aperçu inline, téléchargement et export CSV. Desktop-first (aperçu PDF non fiable sur mobile).

## Véhicules — recalcul opt-in

- `src/components/VehicleForm.tsx` : case « Mettre à jour les trajets passés » lors de la modification des CV fiscaux ou du statut électrique. Décochée par défaut ; le recalcul en lot passe par `useTrips.ts`.

## Acquisition & désambiguïsation (SEO/GEO)

- `src/lib/seo-schemas.ts` : constante `IKTRACKER_DISAMBIGUATION`, `disambiguatingDescription` et `installUrl` sur le schéma `SoftwareApplication`. Réutilisée par `/tarifs`, `/installer`, `/fonctionnalites`, `/artisans`, `/independants`.
- `src/components/ReferralSourceModal.tsx` : questionnaire de découverte (Communauté, Google, Réseaux sociaux, ChatGPT) écrit dans `referral_sources`. Principale mesure fiable du canal IA, les référents HTTP étant absents pour les assistants.

## Métadonnées SEO en SSR (TanStack `head()`)

- Depuis la migration TanStack Start, les balises `<title>`, `description`, `canonical`, Open Graph et Twitter sont déclarées **dans le `head()` de chaque route** (`src/routes/**`), donc rendues côté serveur et visibles par Googlebot, GPTBot et les autres crawlers sans exécution JS.
- Garde-fou automatisé : `src/test/ssr-structured-data.test.ts` (environnement `node`) interroge le serveur de dev et vérifie, pour 11 routes critiques, la présence dans le HTML serveur des schémas attendus (Article, FAQPage, BreadcrumbList, HowTo, SoftwareApplication, WebPage), du contenu principal (`<h1>`, `<main>`, extraits clés), du `<title>`/`description` et d'une canonique auto-référente. Base configurable via `SSR_TEST_BASE_URL` ; la suite est ignorée si aucun serveur ne répond.
- `<Helmet>` reste utilisé dans les pages **uniquement** pour les JSON-LD et quelques balises dérivées d'un contenu chargé côté client. Ne jamais y remettre un `<title>` ou une `description` : cela créerait un doublon avec le `head()` de la route.
- `/blog/$slug` possède un `loader` qui récupère l'article (titre, meta_description, image, dates) et alimente `head()` : chaque article a désormais ses vraies métadonnées en SSR, avec un fallback `noindex` si l'article n'existe pas.
- Règle pour toute nouvelle page : créer la route avec son `head()` (titre unique < 60 caractères, description < 160, canonical absolu sur `https://iktracker.fr`), `og:image` uniquement au niveau feuille, jamais sur `__root.tsx`.

## Flux RSS/Atom (`/feed.xml`)

- `src/routes/feed[.]xml.ts` : route serveur SSR générant un **flux Atom** (`application/atom+xml`) avec les 50 derniers articles `published` de `blog_posts` (tri `published_at` desc). Utilise le client admin (service role) pour être indépendant des policies RLS — même pattern que `/sitemap.xml`.
- Chaque entrée : titre, lien canonique absolu, résumé (`subtitle`/`meta_description`), `published`/`updated` ISO, auteur, image de couverture.
- Découvrabilité : lien visible « Flux RSS » dans `EnhancedMarketingFooter.tsx` + balise `<link rel="alternate" type="application/atom+xml">` si déclarée. Objectif : accélérer l'indexation des nouveaux articles (les agrégateurs et crawlers pollent le flux).

## Dates de mise à jour (E-E-A-T)

- `src/lib/page-dates.ts` : source unique de vérité des dates éditoriales des pages statiques (`PAGE_DATES`, format ISO court). Chaque entrée alimente à la fois le JSON-LD (`datePublished`/`dateModified`) et la mention visible « Mis à jour le … » — divergence impossible.
- `src/components/LastUpdated.tsx` : composant d'affichage de la date de dernière révision, testé (`LastUpdated.test.tsx`).
- Règle : toute modification éditoriale d'une page référencée DOIT bumper `modified` dans `PAGE_DATES` ; ajouter une entrée pour toute nouvelle page de contenu.

## Accessibilité & SEO des images (audit 20/08/2026)

- 47 balises `<img>` auditées sur l'ensemble des pages publiques et admin.
- Images de contenu : `alt` descriptif standardisé (marque « IKtracker », contexte métier), enveloppées dans `<figure>` + `<figcaption>` sémantiques sur les landings et articles.
- Images décoratives (icônes, ornements) : `alt="" aria-hidden="true"` pour ne pas polluer les lecteurs d'écran.
- Hero de `/logiciel-devis-artisan` : `src/assets/hero-devis-artisan.jpg`, `fetchpriority="high"` + `loading="eager"` (LCP), `alt` descriptif et légende visible.

## Attribution de trafic & détection IA (GA4)

- `src/lib/traffic-attribution.ts` calcule **une seule fois par session** la source réelle : referrer, UTM, et mode de lancement (`browser` / `standalone` / `twa`). Résultat mémorisé en `sessionStorage` (`ik_attribution_v1`), les navigations internes ne l'écrasent pas.
- Canaux produits : `ai`, `pwa`, `search`, `social`, `referral`, `direct`. La liste des referrers IA (ChatGPT, Perplexity, Gemini, Copilot, Claude, Le Chat, Grok, DeepSeek, You, Phind, Poe, Kagi, Meta AI…) est plus large que le canal natif « AI Assistant » de GA4.
- `AnalyticsTracker` envoie ces valeurs comme dimensions personnalisées (`traffic_channel`, `ai_vendor`, `launch_mode`, `entry_referrer`) et **surcharge la campagne** (`campaign_source` / `campaign_medium`) pour sortir les sessions IA et PWA du bucket « Direct ». Un évènement `ai_referral_session` est émis pour les sessions IA.
- `public/manifest.webmanifest` : `start_url` taggué `?utm_source=pwa&utm_medium=app&utm_campaign=standalone_launch`, afin que les lancements depuis l'icône installée ne soient plus comptés comme acquisition directe.
- Prérequis GA4 côté interface : déclarer les 4 dimensions personnalisées (portée évènement) avec les noms de paramètres ci-dessus, puis créer un groupe de canaux personnalisé mappant `medium = ai_assistant` → « IA » et `medium = app` → « App installée ».

## A/B testing du hero (`/`)

- `src/lib/ab-test.ts` : attribution 50/50 persistante (localStorage `ab_hero_h1_v1`), variante A = contrôle (gestion des trajets), variante B = bénéfice fiscal / sérénité comptable.
- `src/pages/Landing.tsx` : la variante A est rendue en SSR (Googlebot voit toujours le contrôle) ; le swap n'a lieu qu'après hydratation.
- Propagation de la variante : `src/hooks/useMarketingTracker.ts` et `src/lib/signup-tracking.ts` → Edge Function `track-event` → colonne `marketing_analytics.variant`.
- Restitution : `src/components/admin/ABTestCard.tsx` dans /admin > Stats (visiteurs, clics CTA, vues signup, inscriptions par variante) via la RPC `get_ab_test_results`.

## Conversion : navigation & CTA

- `src/components/marketing/MarketingNav.tsx` : liens secondaires regroupés dans un menu « Ressources » pour réduire la dilution des CTA sur desktop.
- `src/pages/Landing.tsx` : CTA « Créer mon compte » remonté above the fold sur mobile.

## Trajet en direct (PWA)

- `src/components/QuickTripTracker.tsx` : démarrage/fin de trajet géolocalisés en haut de la home mobile. Points GPS départ/arrivée puis distance routière via Distance Matrix à la finalisation (les détours ne sont tracés qu'en Mode Tournée).
- Pendant natif : `mobile/src/lib/live-trip.ts`.

## Qualité de code (lots 1 à 4)

- **Lot 1 — stabilisation** : `vitest.config.ts`, suite de tests verte (59/59), correction des hooks conditionnels.
- **Lot 2 — style** : Prettier appliqué sur l'ensemble du code, `@ts-ignore` → `@ts-expect-error`.
- **Lot 3 — typage** : suppression des `any` sur les hooks métier (`useTrips.ts`…) au profit des types générés du backend.
- **Lot 4 — architecture** : suppression des routes blog dupliquées (canonical + noindex), découpage des fichiers > 1000 lignes (`print-utils.ts`, `AdminStats.tsx`, etc.).
- Dette résiduelle suivie dans `docs/AUDIT_CODE_2026-08-16.md` : `no-explicit-any` restants, `exhaustive-deps`, fichiers encore volumineux.

## SSR des pages publiques

- `src/components/auth/SmartRoutes.tsx` utilise des imports statiques et `useHydrated` : `/`, `/auth` et `/signup` renvoient désormais un HTML complet côté serveur (le body était vide auparavant, signalé par l'audit SEO).
- `AuthForm.tsx`, `Auth.tsx`, `Signup.tsx` : tout accès `window`/`localStorage` est gardé ou différé après hydratation.

## Changelog

- **2.7** (20 août 2026) — Flux Atom `/feed.xml` (SSR, 50 articles, client admin) + lien RSS au footer ; `src/lib/page-dates.ts` comme source unique des dates éditoriales (JSON-LD + `<LastUpdated />`) ; audit accessibilité des 47 `<img>` (alts descriptifs, décoratives en `alt=""`, `<figure>`/`<figcaption>`) ; nouvelle landing `/logiciel-devis-artisan` avec hero LCP optimisé ; liens dofollow DictaDevi/Crawlers dans la bio auteur.
- **2.6** (20 août 2026) — JSON-LD rendus en SSR via le wrapper `Helmet` de `helmet-compat` ; balise `<main>` ajoutée sur `/artisans` et `/logiciel-devis-artisan` ; suite de tests SSR des données structurées (`src/test/ssr-structured-data.test.ts`).
- **2.5** (19 août 2026) — Qualité de code (lots 1 à 4 : Vitest, Prettier, typage, découpage), SSR restauré sur `/`, `/auth`, `/signup`, navigation marketing simplifiée + CTA mobile above the fold, A/B testing du H1 du hero avec suivi dans /admin > Stats, trajet en direct PWA.


- **2.4** (11 août 2026) — Attribution de trafic fiabilisée : `traffic-attribution.ts` (détection IA élargie, mode de lancement PWA), dimensions personnalisées et override de campagne dans `AnalyticsTracker`, `start_url` du manifeste taggué UTM.

- **2.3** (4 août 2026) — Consolidation du blog côté front : `src/lib/blog-redirects.ts` (22 slugs) branché sur `beforeLoad` de `/blog/$slug`, synchronisé avec l'Edge Function partagée et le Worker via `scripts/validate-blog-redirects-sync.cjs` ; alias `/admin` en 301 ; `public/robots.txt` remis à jour ; sitemap SSR ramené à 99 URLs après archivage de 19 articles.
- **2.1** (3 août 2026) — Métadonnées SEO migrées de `<Helmet>` vers le `head()` des routes TanStack (SSR) sur l'ensemble des pages publiques ; `head()` dynamique piloté par loader pour les articles de blog.

- **1.5** (3 août 2026) — Gate de vérification email (3 trajets / 1 tournée, export bloqué), Smart Add texte + vocal, page `/app/archive`, recalcul IK opt-in sur les véhicules, nouvelles landings `/fonctionnalites`, `/artisans`, `/independants` et bloc de désambiguïsation IA.

- **1.4** (24 juillet 2026) — Modale « Compléter le trajet » centrée + pré-remplissage adresses réelles. Ajout page OAuthConsent et intégration MCP.
- **1.3** (4 mai 2026) — Tournées, étapes horodatées et audit PDF.
