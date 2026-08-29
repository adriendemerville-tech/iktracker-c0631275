import { useState, useEffect, useLayoutEffect, lazy, Suspense, memo } from "react";
import BodyEndInjections from "@/components/BodyEndInjections";
import { EnhancedMarketingFooter } from "@/components/marketing/EnhancedMarketingFooter";
import { Link, useNavigate } from "@/lib/router-compat";
import { getSupabase } from "@/integrations/supabase/lazy";
import { usePageContent } from "@/hooks/usePageContent";
import { useLiveUserCount } from "@/hooks/useLiveUserCount";
import { useLiveTripStats } from "@/hooks/useLiveTripStats";
import { HERO_VARIANTS, DEFAULT_VARIANT, getHeroVariant, type HeroVariant } from "@/lib/ab-test";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { useMarketingTracker } from "@/hooks/useMarketingTracker";
import { Counter } from "@/components/Counter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PdfReportMockup } from "@/components/marketing/PdfReportMockup";
// Import statique volontaire : contenu texte indexable, doit être dans le HTML SSR de "/".
import { TestimonialsCarousel } from "@/components/marketing/TestimonialsCarousel";


import {
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Car,
  Calculator,
  MapPin,
  Calendar,
  Route,
  FileText,
  Check,
  Star,
  Smartphone,
  Plus,
  Users,
  Repeat,
} from "lucide-react";

interface LandingProps {
  initialUserCount?: number;
  initialTripCount?: number;
  initialTotalKm?: number;
}

// Lazy load AuthForm — chunk préchargé dès l'évaluation du module (parallèle à l'hydratation)
// pour minimiser la durée d'affichage du skeleton.
const authFormChunk = import("@/components/AuthForm").then((m) => ({ default: m.AuthForm }));
const AuthForm = lazy(() => authFormChunk);

// Auth form loading placeholder — reproduit la structure exacte du formulaire réel
// (titre, sous-titre, 2 boutons OAuth, séparateur, 2 champs, CTA, lien de bascule)
// pour éviter tout décalage de layout au remplacement.
const AuthFormSkeleton = memo(() => (
  <div
    aria-hidden="true"
    className="bg-card/80 backdrop-blur-xs border border-border rounded-2xl p-8 min-h-[486px] md:min-h-[502px] flex flex-col"
  >
    <Skeleton className="h-7 w-40 mx-auto mb-2" />
    <Skeleton className="h-4 w-56 mx-auto mb-6" />
    <Skeleton className="h-12 w-full mb-3 rounded-lg" />
    <Skeleton className="h-12 w-full mb-4 rounded-lg" />
    <div className="flex items-center gap-3 my-2">
      <Skeleton className="h-px flex-1" />
      <Skeleton className="h-3 w-6" />
      <Skeleton className="h-px flex-1" />
    </div>
    <Skeleton className="h-11 w-full mb-3 mt-2 rounded-md" />
    <Skeleton className="h-11 w-full mb-4 rounded-md" />
    <Skeleton className="h-12 w-full rounded-lg" />
    <Skeleton className="h-4 w-52 mx-auto mt-5" />
  </div>
));

// Lazy load heavy marketing components - reduces initial bundle
const AnimatedPhoneMockup = lazy(() =>
  import("@/components/marketing/AnimatedPhoneMockup").then((m) => ({
    default: m.AnimatedPhoneMockup,
  })),
);
const AppCarousel = lazy(() =>
  import("@/components/marketing/AppCarousel").then((m) => ({ default: m.AppCarousel })),
);
const TourModeDemo = lazy(() =>
  import("@/components/marketing/TourModeDemo").then((m) => ({ default: m.TourModeDemo })),
);
const IKSimulator = lazy(() =>
  import("@/components/marketing/IKSimulator").then((m) => ({ default: m.IKSimulator })),
);
const PartnerCard = lazy(() =>
  import("@/components/marketing/PartnerCard").then((m) => ({ default: m.PartnerCard })),
);
const TourModeMockup = lazy(() =>
  import("@/components/marketing/TourModeMockup").then((m) => ({ default: m.TourModeMockup })),
);
const CalendarSyncDemo = lazy(() =>
  import("@/components/marketing/CalendarSyncDemo").then((m) => ({ default: m.CalendarSyncDemo })),
);
const MarketingPWANotification = lazy(() =>
  import("@/components/marketing/MarketingPWANotification").then((m) => ({
    default: m.MarketingPWANotification,
  })),
);
// Import statique volontaire : les témoignages sont du contenu texte indexable,
// ils doivent figurer dans le HTML SSR de "/".
import { TestimonialsCarousel } from "@/components/marketing/TestimonialsCarousel";

// Footer marketing : import statique volontaire — il porte le maillage interne
// (pages orphelines incluses) et doit être présent dans le HTML SSR de "/".

const PartnerStrip = lazy(() =>
  import("@/components/marketing/PartnerStrip").then((m) => ({ default: m.PartnerStrip })),
);
const QRCodeSVG = lazy(() => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })));

// Lazy load below-the-fold assets - use public path for lazy loading
const founderImage = "/founder-adrien-optimized.webp";

// Inline scroll animation hook to avoid extra import
const useScrollAnimation = (options?: { threshold?: number }) => {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: options?.threshold ?? 0.2,
    });
    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, options?.threshold]);

  return { ref: setRef, isVisible };
};

// Placeholder for lazy components with explicit dimensions to prevent CLS
const LazyPlaceholder = memo(({ height = 300 }: { height?: number }) => (
  <div
    className="animate-pulse bg-muted/50 rounded-2xl flex items-center justify-center"
    style={{ minHeight: height, aspectRatio: "auto" }}
  >
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
));

// Phone mockup placeholder with exact dimensions to prevent CLS
const PhonePlaceholder = memo(() => (
  <div className="relative w-[280px] h-[560px] mx-auto bg-muted/30 rounded-[3rem] animate-pulse flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
));

// Calendar demo placeholder
const CalendarPlaceholder = memo(() => (
  <div
    className="w-full max-w-[400px] mx-auto bg-muted/30 rounded-2xl animate-pulse"
    style={{ aspectRatio: "1/1.2" }}
  />
));

const LANDING_DEFAULTS = {
  // IMPORTANT : ces valeurs doivent rester identiques à la ligne page_key='home'
  // de la table page_contents. Sinon le contenu SSR (rendu avec ces fallbacks)
  // est remplacé après hydratation par les valeurs BDD → CLS + HTML bot ≠ utilisateur.
  hero_title: "Calcul automatisé des indemnités kilométriques",
  hero_highlight: "Barème 2026",
  hero_subtitle:
    "Enregistrez, calculez et exportez gratuitement vos indemnités kilométriques en quelques clics. Outil communautaire.",
  pain_badge: "Fini les tableaux Excel",
  pain_title_prefix: "Vous perdez encore du temps avec des",
  pain_title_strike: "fichiers Excel",
  pain_title_suffix: "?",
  pain_subtitle:
    "Formules cassées, oublis de trajets, calculs d'IK approximatifs... IKtracker automatise tout selon le barème officiel URSSAF et vous fait gagner des heures chaque mois.",
  stats_title: "Les indépendants roulent beaucoup",
  stats_subtitle:
    "Infirmiers libéraux, artisans, commerciaux, consultants... Les trajets professionnels représentent une part importante de l'activité des travailleurs indépendants.",
  features_title: "Tout ce dont vous avez besoin",
  mobile_title: "Une app mobile complète",
  mobile_subtitle:
    "Installez IKtracker sur votre téléphone et enregistrez vos trajets en déplacement.",
  tour_title: "Mode Tournée",
  tour_subtitle:
    "Plusieurs arrêts, un seul enregistrement. Parfait pour les commerciaux et livreurs.",
  calendar_title: "Sync Calendriers",
  calendar_subtitle: "Importez vos rendez-vous et transformez-les en trajets automatiquement.",
  pdf_title: "Rapport PDF professionnel",
  pdf_subtitle:
    "Générez un relevé complet de vos trajets conforme au barème fiscal, prêt à envoyer à votre comptable.",
  expertise_title: "Expertise fiscale et conformité URSSAF",
  expertise_subtitle:
    "IKtracker vous accompagne dans la gestion de vos frais réels et l'optimisation fiscale de vos déplacements professionnels.",
  cta_title: "Prêt à simplifier vos trajets ?",
  cta_subtitle: "Rejoignez des milliers d'utilisateurs qui gagnent du temps chaque mois.",
  faq_title: "Questions fréquentes",
  faq_subtitle: "Tout ce que vous devez savoir sur IKtracker.",
};

// useLayoutEffect côté client (applique le swap avant le paint), useEffect côté serveur.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const Landing = ({ initialUserCount, initialTripCount, initialTotalKm }: LandingProps) => {
  const { count: liveUserCount } = useLiveUserCount({ initialCount: initialUserCount });
  const { tripCount: liveTripCount, totalKm: liveTotalKm } = useLiveTripStats({
    initialTripCount,
    initialTotalKm,
  });

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { ref: pdfRef, isVisible: pdfVisible } = useScrollAnimation({ threshold: 0.2 });
  const { trackCTAClick, trackSignupClick } = useMarketingTracker("landing");
  const { content: c } = usePageContent("home", LANDING_DEFAULTS);

  // Test A/B du H1 : le serveur (et Googlebot) reçoit toujours la variante de
  // contrôle ; le swap éventuel (variante B) a lieu avant le premier paint
  // post-hydratation (useLayoutEffect) pour éviter tout flash visible, et le
  // conteneur du H1 réserve une hauteur fixe pour éviter tout CLS.
  const [heroVariant, setHeroVariant] = useState<HeroVariant>(DEFAULT_VARIANT);
  useIsomorphicLayoutEffect(() => {
    setHeroVariant(getHeroVariant());
  }, []);

  const hero = heroVariant === "A" ? null : HERO_VARIANTS[heroVariant];
  const heroTitle = hero?.title ?? c.hero_title;
  const heroHighlight = hero?.highlight ?? c.hero_highlight;
  const heroSubtitle = hero?.subtitle ?? c.hero_subtitle;

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    void getSupabase().then((supabase) => {
      if (cancelled) return;

      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        if (event === "SIGNED_IN" && session) {
          navigate("/app");
        }
      });
      unsubscribe = () => subscription.unsubscribe();
      if (cancelled) unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [navigate]);

  // Remove logout transition overlay once React has fully mounted
  useEffect(() => {
    const overlay = document.getElementById("logout-shell-overlay");
    if (overlay) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        overlay.style.transition = "opacity 0.5s ease-out";
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 500);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background font-display overflow-x-hidden select-text">

      <MarketingNav user={user} loading={loading} />

      {/* Main content wrapper with skip link target */}
      <main id="main-content" tabIndex={-1} className="outline-hidden">
        {/* Hero Section */}
        <section
          className="pt-24 pb-16 md:pt-28 md:pb-20 px-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] relative overflow-hidden contain-layout"
          aria-labelledby="hero-heading"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="container mx-auto relative z-10">
            {/* items-start + self-start : le haut de la card d'inscription reste
                aligné avec le badge « 100% Gratuit » à tous les breakpoints lg+ */}
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left: Text content - NO animation on LCP elements for instant render */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
                  <Star className="h-4 w-4" aria-hidden="true" />
                  <span>100% Gratuit</span>
                </div>
                {/* LCP Element - rendu instantané, sans animation.
                    min-height = pire cas mesuré sur les 2 variantes A/B à chaque
                    breakpoint (Playwright, 24/08/2026 : 150px mobile, 180px md,
                    450px lg @1024, 300px xl) → le swap de variante ne décale rien.
                    Ne pas réduire sans re-mesurer les deux variantes. */}
                <h1
                  id="hero-heading"
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.5rem] xl:text-5xl font-extrabold text-foreground leading-tight mb-6 min-h-[10rem] sm:min-h-[11.5rem] md:min-h-[13.5rem] lg:min-h-[12rem] xl:min-h-[14rem]"
                >

                  {heroTitle}
                  <br />
                  <span className="text-gradient">{heroHighlight}</span>
                </h1>
                {/* min-height = pire cas mesuré (120px mobile variante B, 112px lg)
                    → empêche le CLS quand le sous-titre swappe après hydratation */}
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 min-h-[8rem] sm:min-h-[6rem] lg:min-h-[8rem] xl:min-h-[6rem]">
                  {heroSubtitle}
                </p>

                {/* CTA principal mobile - au-dessus de la ligne de flottaison */}
                {!user && (
                  <div className="lg:hidden mb-6">
                    <Link
                      to="/signup"
                      onClick={trackSignupClick}
                      className="focus-visible-ring rounded-lg block"
                    >
                      <Button size="lg" variant="gradient" className="w-full group">
                        Créer mon compte gratuit
                        <ArrowRight
                          className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform"
                          aria-hidden="true"
                        />
                      </Button>
                    </Link>
                    <p className="mt-2 text-xs text-muted-foreground text-center">
                      Gratuit à vie · Sans carte bancaire · 30 secondes
                    </p>
                  </div>
                )}


                {user && (
                  <div className="lg:hidden mb-8">
                    <Link to="/app" className="focus-visible-ring rounded-lg inline-block">
                      <Button size="lg" variant="gradient" className="w-full sm:w-auto group">
                        <LayoutDashboard className="h-5 w-5 mr-2" aria-hidden="true" />
                        Mon tableau de bord
                        <ArrowRight
                          className="h-5 w-5 group-hover:translate-x-1 transition-transform"
                          aria-hidden="true"
                        />
                      </Button>
                    </Link>
                  </div>
                )}

                <ul
                  className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm text-muted-foreground"
                  role="list"
                  aria-label="Avantages"
                >
                  {[
                    "Sans carte bancaire",
                    "Tournée par GPS",
                    "Trajets récurrents",
                    "Export PDF/CSV",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Social proof */}
                <div className="mt-6 flex flex-wrap items-center gap-4 justify-center lg:justify-start">
                  <Counter
                    value={liveUserCount}
                    initialValue={initialUserCount ?? 1000}
                    label="inscrits"
                    unit=""
                    variant="accent"
                    decimals={0}
                  />
                  <Counter
                    value={liveTripCount}
                    initialValue={initialTripCount ?? 0}
                    label="trajets enregistrés"
                    unit=""
                    variant="accent"
                    decimals={0}
                  />
                  <Counter
                    value={liveTotalKm}
                    initialValue={initialTotalKm ?? 0}
                    label="kilomètres suivis"
                    unit="km"
                    variant="accent"
                    decimals={0}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  <strong className="text-foreground">6 nouveaux membres</strong> chaque jour
                  rejoignent la communauté IKtracker
                </p>
              </div>

              {/* Right: Auth form or Phone mockup - Reserved space with fixed dimensions to prevent CLS */}
              <div
                id="auth-section"
                className="animate-fade-in self-start min-h-[486px] md:min-h-[502px] min-w-[320px] lg:min-w-[400px] "
              >
                {user ? (
                  <div className="bg-card/80 backdrop-blur-xs border border-border rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Bienvenue !</h3>
                    <p className="text-muted-foreground mb-6">
                      Accédez à votre tableau de bord pour gérer vos trajets.
                    </p>
                    <Link to="/app">
                      <Button size="lg" variant="gradient" className="w-full group">
                        <LayoutDashboard className="h-5 w-5 mr-2" />
                        Tableau de bord
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Suspense fallback={<AuthFormSkeleton />}>
                    <AuthForm defaultMode="signup" />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Simulateur IK 2026 - Lead magnet */}
        <section
          className="py-12 md:py-16 px-4 bg-muted/30 section-contained"
          aria-labelledby="simulateur-landing"
        >
          <div className="container mx-auto max-w-4xl">
            <Suspense fallback={<LazyPlaceholder height={420} />}>
              <IKSimulator idSuffix="-landing" trackerPage="landing" />
            </Suspense>
            <div className="mt-6">
              <Suspense fallback={null}>
                <PartnerCard page="/" placement="under_simulator" />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Pain Point Section - Excel */}
        <section className="py-16 md:py-24 bg-muted/30 relative overflow-hidden section-contained">
          {/* Excel grid background */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
            `,
                backgroundSize: "80px 32px",
              }}
            />
            <div className="absolute top-0 left-0 right-0 h-10 bg-green-600/20" />
            <div className="absolute top-0 left-0 w-12 bottom-0 bg-muted/50" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6 md:space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
                <FileText className="h-4 w-4" />
                {c.pain_badge}
              </div>
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight">
                {c.pain_title_prefix}{" "}
                <span className="text-destructive line-through decoration-2">
                  {c.pain_title_strike}
                </span>{" "}
                {c.pain_title_suffix}
              </h2>
              <p className="text-base md:text-xl text-muted-foreground">
                {c.pain_subtitle.split("barème officiel URSSAF")[0]}
                IKtracker automatise tout selon le{" "}
                <a
                  href="https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/indemnites-kilometriques.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary transition-colors"
                >
                  barème officiel URSSAF
                </a>{" "}
                et vous fait gagner des heures chaque mois.
              </p>
              <div className="grid grid-cols-3 gap-3 md:gap-6 pt-4 md:pt-6">
                {[
                  { value: "0", label: "formule à écrire" },
                  { value: "2 min", label: "par trajet" },
                  { value: "100%", label: "conforme fiscalement" },
                ].map((stat, i) => (
                  <div key={i} className="p-3 md:p-4 rounded-xl bg-card border border-border">
                    <div className="text-xl md:text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials — rendu SSR (contenu texte indexable) */}
        <TestimonialsCarousel />


        {/* Statistics Section - Independent Workers */}
        <section className="py-12 md:py-16 px-4 section-contained">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
                  {c.stats_title.includes("beaucoup") ? (
                    <>
                      Les indépendants roulent <span className="text-primary">beaucoup</span>
                    </>
                  ) : (
                    c.stats_title
                  )}
                </h2>
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                  {c.stats_subtitle}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-6">

                <div className="p-6 rounded-2xl bg-card border border-border text-center group hover:border-primary/50 transition-colors">
                  <div className="text-4xl md:text-5xl font-extrabold text-primary mb-2">
                    15 000
                  </div>
                  <div className="text-sm md:text-base text-muted-foreground font-medium">
                    km/an en moyenne
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    pour un indépendant itinérant
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-border text-center group hover:border-primary/50 transition-colors">
                  <div className="text-4xl md:text-5xl font-extrabold text-success mb-2">
                    6 400 €
                  </div>
                  <div className="text-sm md:text-base text-muted-foreground font-medium">
                    d'IK potentielles
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-2">pour 15 000 km (6 CV)</p>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-border text-center group hover:border-primary/50 transition-colors">
                  <div className="text-4xl md:text-5xl font-extrabold text-destructive mb-2">
                    40%
                  </div>
                  <div className="text-sm md:text-base text-muted-foreground font-medium">
                    non déclarés
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    des trajets sont oubliés sans outil
                  </p>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Ces kilomètres non déclarés représentent des <strong>milliers d'euros</strong>{" "}
                d'économies fiscales perdues chaque année. IKtracker vous aide à n'en oublier aucun.
              </p>
            </div>
          </div>

        </section>

        {/* Features Grid - Icons only */}
        <section className="py-10 md:py-16 px-4 section-contained">
          <div className="container mx-auto">
            <div className="text-center mb-8 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">{c.features_title}</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
              {[
                { icon: Car, title: "Multi-véhicules" },
                { icon: Calculator, title: "Calcul IK auto" },
                { icon: MapPin, title: "GPS intégré" },
                { icon: Calendar, title: "Sync calendriers" },
                { icon: Repeat, title: "Trajets récurrents" },
                { icon: FileText, title: "Export PDF/CSV" },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group p-4 md:p-6 rounded-xl md:rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 text-center animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/10 text-primary mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-5 w-5 md:h-7 md:w-7" />
                  </div>
                  <p className="font-semibold text-sm md:text-base">{feature.title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product demos - unified tabbed section */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-background to-muted/30 section-contained">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">
                Tout ce dont vous avez besoin, en un seul endroit
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mt-3">
                Application mobile, mode tournée GPS, synchronisation calendrier et relevé PDF.
              </p>
            </div>

            <Tabs defaultValue="mobile" className="max-w-5xl mx-auto">
              <TabsList className="mx-auto flex flex-wrap justify-center h-auto gap-1 mb-8">
                <TabsTrigger value="mobile" className="gap-2">
                  <Smartphone className="h-4 w-4" /> Mobile
                </TabsTrigger>
                <TabsTrigger value="tour" className="gap-2">
                  <Route className="h-4 w-4" /> Mode tournée
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2">
                  <Calendar className="h-4 w-4" /> Calendrier
                </TabsTrigger>
                <TabsTrigger value="pdf" className="gap-2">
                  <FileText className="h-4 w-4" /> Relevé PDF
                </TabsTrigger>
              </TabsList>

              <TabsContent value="mobile">
                <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
                  <div className="order-2 lg:order-1">
                    <Suspense fallback={<PhonePlaceholder />}>
                      <AnimatedPhoneMockup />
                    </Suspense>
                  </div>
                  <div className="space-y-4 order-1 lg:order-2">
                    <p className="text-xl md:text-2xl font-bold">{c.mobile_title}</p>
                    <p className="text-muted-foreground">{c.mobile_subtitle}</p>
                    <ul className="space-y-2">
                      {["Fonctionne hors-ligne", "Notifications rappels", "GPS temps réel"].map(
                        (item, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="text-sm md:text-base">{item}</span>
                          </li>
                        ),
                      )}
                    </ul>
                    <Link
                      to="/installer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Guide d'installation
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tour">
                <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
                  <div className="space-y-4">
                    <p className="text-xl md:text-2xl font-bold">{c.tour_title}</p>
                    <p className="text-muted-foreground">{c.tour_subtitle}</p>
                    <ul className="space-y-2">
                      {["GPS en temps réel", "Arrêts illimités", "Calcul automatique"].map(
                        (item, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="text-sm md:text-base">{item}</span>
                          </li>
                        ),
                      )}
                    </ul>
                    <Link
                      to="/mode-tournee"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Découvrir le mode tournée
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <Suspense fallback={<PhonePlaceholder />}>
                    <TourModeMockup />
                  </Suspense>
                </div>
              </TabsContent>

              <TabsContent value="calendar">
                <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
                  <div className="order-2 lg:order-1">
                    <Suspense fallback={<CalendarPlaceholder />}>
                      <CalendarSyncDemo />
                    </Suspense>
                  </div>
                  <div className="space-y-4 order-1 lg:order-2">
                    <p className="text-xl md:text-2xl font-bold">{c.calendar_title}</p>
                    <p className="text-muted-foreground">{c.calendar_subtitle}</p>
                    <ul className="space-y-2">
                      {["Google Calendar", "Microsoft Outlook", "Import en un clic"].map(
                        (item, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="text-sm md:text-base">{item}</span>
                          </li>
                        ),
                      )}
                    </ul>
                    <Link
                      to="/calendrier"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Voir la synchronisation calendrier
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pdf">
                <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
                  <div className="space-y-4">
                    <p className="text-xl md:text-2xl font-bold">{c.pdf_title}</p>
                    <p className="text-muted-foreground">{c.pdf_subtitle}</p>
                    <ul className="space-y-2">
                      {["Format PDF ou Excel", "Barème fiscal 2026", "Envoi direct par email"].map(
                        (item, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="text-sm md:text-base">{item}</span>
                          </li>
                        ),
                      )}
                    </ul>
                    <Link
                      to="/expert-comptable"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Envoyer un relevé à mon comptable
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div ref={pdfRef}>
                    <Suspense fallback={<LazyPlaceholder height={420} />}>
                      <PdfReportMockup />
                    </Suspense>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>


        {/* Expertise Fiscale Section - SEO Content */}
        <section className="py-12 md:py-16 section-contained" aria-labelledby="expertise-heading">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2
                  id="expertise-heading"
                  className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4"
                >
                  {c.expertise_title}
                </h2>
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                  {c.expertise_subtitle}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Conformité Fiscale */}
                <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Conformité et justificatifs fiscaux</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Chaque trajet enregistré dans IKtracker génère un{" "}
                    <strong>justificatif fiscal complet</strong> : horodatage précis, adresses de
                    départ et d'arrivée, distance calculée selon le{" "}
                    <strong>barème kilométrique URSSAF</strong> en vigueur.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Horodatage automatique de chaque déplacement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Calcul conforme au barème fiscal officiel 2026</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Export PDF accepté par l'administration fiscale</span>
                    </li>
                  </ul>
                </div>

                {/* Optimisation des Frais Réels */}
                <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                    <Calculator className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Optimisation fiscale des frais réels</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Grâce au simulateur intégré, comparez instantanément l'
                    <strong>abattement forfaitaire de 10%</strong> avec la déduction des{" "}
                    <strong>frais réels</strong>. IKtracker calcule automatiquement l'option la plus
                    avantageuse pour votre situation.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Comparaison abattement 10% vs frais réels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Gestion de flotte multi-véhicules simplifiée</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Suivi annuel pour optimisation fiscale continue</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Additional SEO paragraph */}
              <div className="mt-8 p-6 bg-muted/30 rounded-xl border border-border">
                <p className="text-sm text-muted-foreground leading-relaxed text-center">
                  IKtracker applique automatiquement le <strong>barème kilométrique URSSAF</strong>{" "}
                  mis à jour chaque année. Que vous soyez salarié déclarant vos frais réels,
                  profession libérale ou gérant de société, notre outil garantit des justificatifs
                  fiscaux conformes aux exigences de l'administration. La gestion de flotte et
                  l'optimisation fiscale n'ont jamais été aussi simples.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 md:py-32 bg-primary text-primary-foreground section-contained">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">{c.cta_title}</h2>
              <p className="text-lg md:text-xl opacity-90">{c.cta_subtitle}</p>
              <p className="text-sm opacity-80">
                Barème conforme aux{" "}
                <a
                  href="https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/indemnites-kilometriques.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-100 transition-opacity"
                >
                  taux officiels URSSAF
                </a>
                .
              </p>
            </div>

            <div className="mt-8 md:mt-10">
              <Link to="/signup" onClick={trackSignupClick}>
                <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 py-6 shadow-xl">
                  Créer mon compte gratuit
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* QR Code as subtle secondary option */}
            <div className="hidden md:flex flex-col items-center gap-2 mt-10 opacity-80">
              <p className="text-xs opacity-70 flex items-center gap-2">
                <Smartphone className="h-3.5 w-3.5" />
                Ou scannez pour installer sur mobile
              </p>
              <div className="bg-white p-2 rounded-lg shadow-md">
                <Suspense
                  fallback={
                    <div className="w-[100px] h-[100px] bg-gray-200 animate-pulse rounded" />
                  }
                >
                  <QRCodeSVG
                    value="https://iktracker.fr/install"
                    size={100}
                    level="M"
                    includeMargin={false}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 px-4 section-contained" aria-labelledby="faq-heading">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 id="faq-heading" className="text-2xl md:text-3xl lg:text-4xl font-bold">
                {c.faq_title}
              </h2>
              <p className="text-muted-foreground mt-3">
                Tout ce que vous devez savoir sur IKtracker.{" "}
                <a
                  href="https://www.economie.gouv.fr/particuliers/gerer-mon-impot-sur-le-revenu/impot-sur-le-revenu-tout-savoir-sur-le-bareme-des-frais"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary transition-colors"
                >
                  En savoir plus sur le barème officiel
                </a>
                .
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  question: "IKtracker est-il vraiment gratuit ?",
                  answer:
                    "Oui, IKtracker est 100% gratuit. Aucune carte bancaire n'est requise et toutes les fonctionnalités sont accessibles sans frais : enregistrement des trajets, calcul automatique des IK, export PDF et CSV.",
                },
                {
                  question: "Comment fonctionne le calcul des indemnités kilométriques ?",
                  answer:
                    "IKtracker applique automatiquement le barème fiscal officiel 2026 en fonction de la puissance fiscale de votre véhicule et du nombre de kilomètres parcourus. Le calcul prend en compte les 3 tranches et la majoration de 20% pour les véhicules électriques.",
                },
                {
                  question: "Puis-je utiliser IKtracker sur mon téléphone ?",
                  answer:
                    "Oui, IKtracker est une Progressive Web App (PWA) installable sur iPhone et Android. Elle fonctionne hors-ligne et permet d'enregistrer vos trajets en déplacement grâce au GPS intégré.",
                },
                {
                  question: "Comment synchroniser mon calendrier avec IKtracker ?",
                  answer:
                    "IKtracker se connecte à Google Calendar et Outlook pour importer automatiquement vos rendez-vous professionnels. L'application crée les trajets correspondants avec calcul automatique des distances.",
                },
                {
                  question: "Mes données sont-elles sécurisées ?",
                  answer:
                    "Oui, vos données sont chiffrées et stockées de manière sécurisée. IKtracker est conforme au RGPD et vos informations ne sont jamais partagées avec des tiers.",
                },
              ].map((faq, index) => (
                <details
                  key={index}
                  className="group bg-card border border-border rounded-xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/50 transition-colors list-none">
                    <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform group-open:rotate-45">
                      <Plus className="h-4 w-4" />
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-4 bg-muted/50 section-contained">
          <div className="container mx-auto max-w-3xl">
            <div className="bg-background border border-border rounded-2xl p-6 md:p-10">
              <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground mb-4 md:mb-6 font-display">
                Pourquoi IKtracker est-il gratuit ?
              </h3>
              <figure className="flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start">
                <img
                  src={founderImage}
                  srcSet={`${founderImage} 1x, ${founderImage} 2x`}
                  sizes="75px"
                  alt="Adrien de Volontat, fondateur d'IKtracker"
                  width={75}
                  height={75}
                  className="w-[75px] h-[75px] rounded-full object-cover flex-shrink-0 border-2 border-border transition-transform duration-300 hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />
                <div className="text-center md:text-left">
                  <blockquote className="text-sm md:text-base text-muted-foreground leading-relaxed font-display">
                    "Dirigeant d'une agence Avenir Rénovations, je n'ai trouvé aucune solution
                    satisfaisante pour automatiser mes indemnités kilométriques. J'ai donc créé
                    IKtracker pour mon usage professionnel. L'infrastructure étant en place, je la
                    partage gratuitement avec ceux qui ont les mêmes besoins de gestion. Pas de
                    carte bancaire, pas de frais cachés."
                  </blockquote>
                  <figcaption className="mt-4 md:mt-6 text-xs md:text-sm text-muted-foreground font-display">
                    — Adrien de Volontat, fondateur
                  </figcaption>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                    <a
                      href="https://www.avenir-renovations.fr/agence/avenir-renovations-13-saint-remy-de-provence/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline transition-colors font-display"
                    >
                      Avenir Rénovations →
                    </a>
                    <span className="text-muted-foreground/50">•</span>
                    <Link
                      to="/terms"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors font-display"
                    >
                      CGVU
                    </Link>
                    <span className="text-muted-foreground/50">•</span>
                    <Link
                      to="/privacy"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors font-display"
                    >
                      Confidentialité
                    </Link>
                  </div>
                </div>
              </figure>
            </div>
          </div>
        </section>
      </main>

      <Suspense fallback={null}>
        <PartnerStrip page="/" />
      </Suspense>

      <BodyEndInjections />
      <EnhancedMarketingFooter />

      <Suspense fallback={null}>
        <MarketingPWANotification />
      </Suspense>
    </div>
  );
};

export default Landing;
