# IKTracker — Documentation Technique Frontend

> Version 1.0 — 14 avril 2026

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
| React | 18 | UI framework |
| TypeScript | 5 | Typage statique |
| Vite | 5 | Bundler & dev server |
| Tailwind CSS | 3 | Utility-first CSS |
| shadcn/ui | - | Composants UI (Radix-based) |
| React Router | 6 | Routing SPA |
| TanStack Query | 5 | Data fetching & cache |
| Framer Motion | - | Animations |
| Helmet Async | - | SEO meta tags |
| Lucide React | - | Icônes |
| Recharts | - | Graphiques (lazy) |

### Architecture

```
src/
├── main.tsx              → Point d'entrée, rendu React, preload différé
├── App.tsx               → Providers globaux, routing, guards d'auth
├── App.css               → Styles globaux
├── index.css             → Design tokens (CSS variables), Tailwind layers
├── pages/                → Pages (lazy-loaded)
├── components/           → Composants réutilisables
│   ├── ui/               → shadcn/ui primitives
│   ├── admin/            → Composants admin
│   ├── blog/             → Composants blog/CMS
│   ├── charts/           → Graphiques (lazy)
│   ├── icons/            → Icônes custom
│   ├── marketing/        → Composants landing/SEO
│   └── trip/             → Composants trajets
├── hooks/                → Custom hooks
├── lib/                  → Utilitaires
├── types/                → Types TypeScript
├── integrations/supabase → Client & types auto-générés
└── assets/               → Images & assets statiques
```

### Providers globaux (App.tsx)

```
QueryClientProvider (React Query, staleTime: 5min, retry: 2)
  → ErrorBoundary
    → Suspense
      → TooltipProvider (shadcn)
        → Toaster + Sonner (notifications)
          → BrowserRouter
            → AnalyticsTracker
            → AppRoutes (AuthContext.Provider)
              → LogoutOverlay
              → GoogleMapsPreloader (idle)
              → GlobalTourRecovery
              → <Routes>
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
| `/blog/auteur/:slug` | `AuthorPage` | Page auteur |
| `/privacy` | `Privacy` | Politique de confidentialité |
| `/terms` | `Terms` | CGU |
| `/mentions-legales` | `MentionsLegales` | Mentions légales |
| `/contact` | `Contact` | Page contact |
| `/installer` | `Install` | Guide d'installation PWA |
| `/expert-comptable` | `ExpertComptable` | Landing expert-comptable |
| `/mode-tournee` | `ModeTournee` | Landing mode tournée |
| `/calendrier` | `Calendrier` | Landing sync calendrier |
| `/bareme-ik-2026` | `BaremeIK2026` | Simulateur barème IK |
| `/frais-reels` | `FraisReels` | Guide frais réels |
| `/lexique` | `Lexique` | Lexique IK |
| `/comparatif-izika` | `ComparatifIzika` | Comparatif vs Izika |
| `/comparatif-driversnote` | `ComparatifDriversNote` | Comparatif vs Driver's Note |
| `/marina` | `MarinaAnalyze` | Analyse IA documents |
| `/offline` | `Offline` | Page hors-ligne |
| `/temporaryreport/:id` | `TemporaryReport` | Rapport partagé (public) |

### Routes protégées (`/app/*`)

| Route | Page | Description |
|---|---|---|
| `/app` | `Index` | Dashboard principal (ajout trajet) |
| `/app/mestrajets` | `MesTrajets` | Historique des trajets |
| `/app/profile` | `Profile` | Profil utilisateur |
| `/app/admin` | `Admin` | Dashboard admin |
| `/app/admin/blog` | `BlogAdmin` | Gestion articles blog |
| `/app/admin/blog/edit/:id?` | `BlogEditor` | Éditeur d'article |
| `/app/blog/edit/:id?` | `BlogEditor` | Éditeur (alias) |
| `/app/theme-onboarding` | `ThemeOnboarding` | Choix du thème |
| `/app/recovery` | `RecoveryWizard` | Récupération tournée |

### Redirections (anciennes URLs)

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
| `AuthForm.tsx` | Formulaire connexion/inscription |
| `AuthLoadingScreen.tsx` | Écran de chargement auth |
| `BodyEndInjections.tsx` | Injections de code (scripts tracking) |
| `Breadcrumb.tsx` | Fil d'Ariane SEO |
| `CalendarConnections.tsx` | Gestion connexions calendrier |
| `CalendarSyncNotification.tsx` | Notification de sync calendrier |
| `CompleteAddressSheet.tsx` | Sheet de complétion d'adresse |
| `Counter.tsx` | Compteur animé |
| `DesktopSidebar.tsx` | Sidebar desktop (navigation, véhicules, feedback) |
| `ErrorBoundary.tsx` | Boundary d'erreur global |
| `FeedbackForm.tsx` | Formulaire de feedback (avec image) |
| `FloatingActionButton.tsx` | FAB mobile |
| `FocusTourView.tsx` | Vue focus mode tournée |
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
| `useTrips.ts` | CRUD trajets (Supabase + React Query) |
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
| `useMarketingTracker.ts` | Tracking événements marketing |

### Hooks mode tournée

| Hook | Rôle |
|---|---|
| `useTourTracker.ts` | Logique principale de tournée GPS |
| `useTourSessionDB.ts` | Persistence sessions tournée (Supabase) |
| `useTourSessionRecovery.ts` | Récupération de session interrompue |

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
