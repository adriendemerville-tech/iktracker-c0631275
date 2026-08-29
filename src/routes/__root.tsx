import { lazy, Suspense, useEffect } from "react";
import type { ReactNode } from "react";
import { HelmetProvider } from "@/lib/helmet-compat";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { AppChrome } from "@/components/AppChrome";
import { useTheme } from "@/hooks/useTheme";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { buildOrganizationSchema } from "@/lib/seo-schemas";

// Lazy load UI components that aren't needed for initial render (ported from App.tsx)
const Toaster = lazy(() => import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));
const TooltipProvider = lazy(() =>
  import("@/components/ui/tooltip").then((m) => ({ default: m.TooltipProvider })),
);
const NotFound = lazy(() => import("@/pages/NotFound"));

// ported from index.html — CRITICAL: theme detection must run before first paint
const themeBootstrapScript = `(function(){try{var stored=localStorage.getItem('theme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;if(stored==='dark'||(!stored&&prefersDark)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

// ported from index.html — logout farewell overlay + fonts-loaded marker
const logoutAndFontsScript = `(function(){try{var data=sessionStorage.getItem('iktracker_logout_transition');if(data){var parsed=JSON.parse(data);if(Date.now()-parsed.timestamp<10000){document.write('<div id="logout-shell-overlay" class="logout-overlay"><div class="logout-content"><img src="/logo-iktracker-250.webp" alt="IKtracker" width="64" height="64"><h2>'+parsed.message+'</h2></div></div>');}sessionStorage.removeItem('iktracker_logout_transition');}}catch(e){}})();(function(){function a(){var l=document.querySelectorAll('link[data-async-font]');for(var i=0;i<l.length;i++){l[i].media='all';}}a();document.addEventListener('DOMContentLoaded',a);window.addEventListener('load',a);})();if('fonts' in document){document.fonts.ready.then(function(){document.documentElement.classList.add('fonts-loaded');});}else{setTimeout(function(){document.documentElement.classList.add('fonts-loaded');},100);}`;

// ported from index.html — sitewide Organization + WebSite + HowTo JSON-LD
// Nœud d'identité (legalName Voluntas Novare, postalAddress, contactPoint, sameAs)
// centralisé dans src/lib/seo-schemas.ts — ne pas dupliquer ici.
const organizationJsonLd = JSON.stringify(buildOrganizationSchema());

const websiteJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "IKtracker",
  alternateName: "IKtracker - Outil communautaire",
  url: "https://iktracker.fr",
  description:
    "Outil communautaire gratuit pour automatiser le calcul des indemnités kilométriques. Mode tournée GPS, synchronisation calendrier, export comptable.",
  inLanguage: "fr-FR",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://iktracker.fr/?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
});

const howToJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Comment utiliser IKtracker",
  description:
    "Guide pour automatiser vos indemnités kilométriques avec IKtracker, l'outil communautaire gratuit",
  step: [
    {
      "@type": "HowToStep",
      name: "Créer un compte gratuit",
      text: "Inscrivez-vous en 30 secondes avec votre email ou votre compte Google. Choisissez votre profession pour personnaliser votre expérience.",
    },
    {
      "@type": "HowToStep",
      name: "Configurer votre véhicule",
      text: "Ajoutez votre véhicule avec sa puissance fiscale (CV). Bénéficiez de la majoration de 20% pour les véhicules électriques.",
    },
    {
      "@type": "HowToStep",
      name: "Connecter votre calendrier ou lancer le Mode Tournée",
      text: "Synchronisez Google Calendar ou Outlook pour importer automatiquement vos rendez-vous, ou utilisez le Mode Tournée GPS pour détecter vos arrêts.",
    },
    {
      "@type": "HowToStep",
      name: "Exporter pour votre comptable",
      text: "Générez un PDF ou CSV de vos indemnités kilométriques, conforme au barème fiscal 2026.",
    },
  ],
  totalTime: "PT2M",
});

// ported from index.html — Speculation Rules API for instant navigation
const speculationRules = JSON.stringify({
  prerender: [{ where: { href_matches: ["/signup", "/auth"] }, eagerness: "moderate" }],
  prefetch: [
    {
      where: {
        href_matches: [
          "/app",
          "/mes-trajets",
          "/mode-tournee",
          "/calendrier",
          "/expert-comptable",
          "/install",
          "/bareme-ik-2026",
          "/profile",
          "/blog",
        ],
      },
      eagerness: "moderate",
    },
  ],
});

const SITE_TITLE = "Calcul Gratuit IK Indemnités Kilométriques – Barème 2026";
const SITE_DESCRIPTION =
  "IKtracker, outil gratuit pour automatiser vos indemnités kilométriques : mode tournée GPS, sync calendrier, frais réels, export PDF. Barème 2026.";
const OG_DESCRIPTION =
  "Outil communautaire 100% gratuit : automatisation des indemnités kilométriques, mode tournée GPS, synchronisation calendrier, comparateur frais réels. Barème 2026.";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // viewport-fit=cover : nécessaire pour que env(safe-area-inset-*) soit
      // pris en compte sur iPhone à encoche (notch / Dynamic Island)
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0, viewport-fit=cover",
      },
      { title: SITE_TITLE },
      { name: "title", content: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      {
        name: "keywords",
        content:
          "indemnités kilométriques, calcul frais kilométriques, barème 2026, application IK, gestion trajets pro, comptabilité libéral, outil communautaire, frais réels, mode tournée GPS",
      },
      { name: "author", content: "IKtracker" },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      // PWA meta
      { name: "theme-color", content: "#2661D9" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "IKtracker" },
      { name: "application-name", content: "IKtracker" },
      { name: "mobile-web-app-capable", content: "yes" },
      // Open Graph
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iktracker.fr/" },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: OG_DESCRIPTION },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { property: "og:image:width", content: "250" },
      { property: "og:image:height", content: "250" },
      {
        property: "og:image:alt",
        content: "Logo IKtracker - Application gratuite de calcul des indemnités kilométriques",
      },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      // Twitter
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:url", content: "https://iktracker.fr/" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: OG_DESCRIPTION },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      {
        name: "twitter:image:alt",
        content: "Logo IKtracker - Application gratuite de calcul des indemnités kilométriques",
      },
      // GEO tags for France
      { name: "geo.region", content: "FR" },
      { name: "geo.placename", content: "France" },
      { name: "geo.position", content: "46.603354;1.888334" },
      { name: "ICBM", content: "46.603354, 1.888334" },
      { name: "language", content: "French" },
      { name: "content-language", content: "fr-FR" },
      { name: "revisit-after", content: "7 days" },
      { name: "coverage", content: "France" },
      { name: "distribution", content: "France" },
      { name: "target", content: "France" },
    ],
    links: [
      // Preload haute priorité de la feuille applicative : elle est le seul
      // maillon bloquant de la chaîne critique (document -> CSS). Le preload
      // la sort de la file d'attente basse priorité du parseur.
      { rel: "preload", as: "style", href: appCss, fetchPriority: "high" },
      { rel: "stylesheet", href: appCss },
      // Preconnects
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "preconnect",
        href: "https://yarjaudctshlxkatqgeb.supabase.co",
        crossOrigin: "anonymous",
      },
      // NB: le preload de l'image LCP (/logo-iktracker-250.webp) est déjà injecté
      // automatiquement par la couche d'hébergement — ne pas le dupliquer ici.
      // Preloads des polices critiques

      {
        rel: "preload",
        // Fichier variable latin actuel (v12) — vérifié 200. Un preload périmé
        // gaspille de la bande passante et retarde le LCP mobile.
        href: "https://fonts.gstatic.com/s/plusjakartasans/v12/LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yygg_vb.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
        // Priorité explicite : la police du H1 (contenu LCP mobile) passe devant
        // les autres sous-ressources dans la file de téléchargement.
        fetchPriority: "high",
      },
      {
        rel: "preload",
        href: "https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K6z9mXg.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
        // Priorité explicite : la police du H1 (contenu LCP mobile) passe devant
        // les autres sous-ressources dans la file de téléchargement.
        fetchPriority: "high",
      },
      // Fonts stylesheet
      {
        rel: "stylesheet",
        // wght 800 inclus pour Plus Jakarta Sans (H1 en font-extrabold) : même
        // fichier variable, aucun téléchargement supplémentaire.
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Urbanist:wght@500;600;700;800&display=swap",
        // Chargée sans bloquer le premier rendu (LCP) : `media=print` est basculé
        // sur `all` par le script inline dès que la feuille est disponible.
        media: "print",
        "data-async-font": "true",
      },
      // Favicons & app icons
      { rel: "icon", href: "/favicon.ico?v=20260428b", sizes: "48x48" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48x48.png?v=20260428b" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png?v=20260428b" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/pwa-icon-192.png?v=20260428b" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=20260428b" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=20260428b" },
      // PWA manifest (static file replaces the old build-time generated one)
      { rel: "manifest", href: "/manifest.webmanifest" },
      // iOS splash screens
      {
        rel: "apple-touch-startup-image",
        href: "/splash/splash-1170x2532.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/splash-1284x2778.png",
        media:
          "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/splash-1170x2532.png",
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/splash-1284x2778.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/splash-2048x2732.png",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/splash-2048x2732.png",
        media:
          "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
      },
      { rel: "apple-touch-startup-image", href: "/splash/splash-1170x2532.png" },
      // Language / discovery
      { rel: "alternate", hrefLang: "fr-FR", href: "https://iktracker.fr/" },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
      {
        rel: "alternate",
        type: "application/atom+xml",
        href: "https://iktracker.fr/feed.xml",
        title: "Blog IKtracker (Atom)",
      },
      { rel: "llms", href: "/llms.txt", type: "text/plain", title: "LLM Information" },
      {
        rel: "alternate",
        href: "/knowledge.json",
        type: "application/ld+json",
        title: "IKtracker Knowledge Graph",
      },
      // DNS prefetch for non-critical resources
      { rel: "dns-prefetch", href: "https://maps.googleapis.com" },
      { rel: "dns-prefetch", href: "https://maps.gstatic.com" },
      { rel: "dns-prefetch", href: "https://www.googleapis.com" },
      { rel: "dns-prefetch", href: "https://yarjaudctshlxkatqgeb.supabase.co" },
    ],
    scripts: [
      // Theme detection before first paint (pairs with suppressHydrationWarning on <html>)
      { children: themeBootstrapScript },
      // Taap.it analytics : chargé à la première interaction par AnalyticsTracker
      // (hors chemin critique mobile).
      // Logout farewell overlay + fonts-loaded marker
      { children: logoutAndFontsScript },
      // Structured data
      { type: "application/ld+json", children: organizationJsonLd },
      { type: "application/ld+json", children: websiteJsonLd },
      { type: "application/ld+json", children: howToJsonLd },
      // Speculation Rules API for instant navigation
      { type: "speculationrules", children: speculationRules },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <Suspense fallback={null}>
      <NotFound />
    </Suspense>
  ),
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppContent() {
  // Initialize theme and online status detection (ported from App.tsx)
  useTheme();
  useOnlineStatus();

  // ported from main.tsx — defer non-critical initializations
  useEffect(() => {
    if (window.location.pathname.startsWith("/app")) {
      import("@/pages/MesTrajets").catch(() => undefined);
      import("@/pages/Profile").catch(() => undefined);
    }
  }, []);

  return (
    <>
      <AnalyticsTracker />
      <AppChrome>
        <Outlet />
      </AppChrome>
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={null}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  console.error(error);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-semibold">Cette page n'a pas pu se charger</h1>
        <p className="text-muted-foreground">
          Une erreur est survenue de notre côté. Vous pouvez réessayer ou revenir à l'accueil.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Réessayer
          </button>
          <a
            href="/"
            className="px-4 py-2 rounded-md border border-border text-foreground font-medium"
          >
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}
