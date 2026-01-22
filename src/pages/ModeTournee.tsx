import { useEffect, lazy, Suspense, memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import {
  Navigation,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Zap,
  TrendingUp,
  Car,
  Users
} from "lucide-react";

// Lazy load heavy demo components
const TourModeDemo = lazy(() => import("@/components/marketing/TourModeDemo").then(m => ({ default: m.TourModeDemo })));
const TourModeMockup = lazy(() => import("@/components/marketing/TourModeMockup").then(m => ({ default: m.TourModeMockup })));
const AnimatedPhoneMockup = lazy(() => import("@/components/marketing/AnimatedPhoneMockup").then(m => ({ default: m.AnimatedPhoneMockup })));
const AppCarousel = lazy(() => import("@/components/marketing/AppCarousel").then(m => ({ default: m.AppCarousel })));
const MarketingFooter = lazy(() => import("@/components/marketing/MarketingFooter").then(m => ({ default: m.MarketingFooter })));
const MarketingPWANotification = lazy(() => import("@/components/marketing/MarketingPWANotification").then(m => ({ default: m.MarketingPWANotification })));

const DemoLoader = () => <div className="h-64 flex items-center justify-center text-muted-foreground">Chargement...</div>;
const FooterPlaceholder = memo(() => <div className="h-64 bg-muted/30 animate-pulse" />);

const AnimatedSection = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default function ModeTournee() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const benefits = [
    {
      icon: Clock,
      title: "Gain de temps",
      description: "Plus besoin de saisir chaque trajet séparément"
    },
    {
      icon: MapPin,
      title: "Tous les arrêts",
      description: "Enregistrez domicile + tous vos clients + retour"
    },
    {
      icon: TrendingUp,
      title: "Distance exacte",
      description: "Calcul automatique du kilométrage total"
    },
    {
      icon: Zap,
      title: "Navigation intégrée",
      description: "Lancez Waze ou Maps en un clic"
    }
  ];

  const professions = [
    { icon: Users, name: "Infirmiers libéraux", description: "10+ patients/jour" },
    { icon: Car, name: "Commerciaux", description: "Prospection terrain" },
    { icon: Users, name: "Artisans", description: "Interventions multiples" },
    { icon: Users, name: "Aide à domicile", description: "Tournées quotidiennes" }
  ];

  const carouselSlides = [
    {
      title: "Démarrez votre tournée",
      description: "Un clic pour commencer. L'app détecte votre position de départ.",
      mockup: <AnimatedPhoneMockup screen="tour" />
    },
    {
      title: "Ajoutez vos arrêts",
      description: "Chaque client visité est automatiquement enregistré.",
      mockup: <AnimatedPhoneMockup screen="newTrip" />
    },
    {
      title: "Récapitulatif complet",
      description: "Distance totale, IK calculées, prêt pour l'export.",
      mockup: <AnimatedPhoneMockup screen="dashboard" />
    }
  ];

  return (
    <div className="min-h-screen bg-background font-display select-text">
      <Helmet>
        <title>Mode Tournée IKtracker | Suivi kilométrique pour infirmiers et artisans</title>
        <meta name="description" content="Découvrez le mode Tournée d'IKtracker : enregistrez tous vos arrêts clients en un seul trajet. Idéal pour infirmiers libéraux, artisans et commerciaux en France. Gratuit." />
        <meta name="keywords" content="mode tournée, suivi kilométrique infirmier, indemnités kilométriques artisan, tournée commerciaux, frais kilométriques multi-arrêts, IK libéral, application gratuite tournée" />
        <link rel="canonical" href="https://iktracker.fr/mode-tournee" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Mode Tournée IKtracker | Suivi kilométrique multi-arrêts" />
        <meta property="og:description" content="Enregistrez tous vos arrêts clients en un seul trajet. Idéal pour infirmiers libéraux, artisans et commerciaux." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://iktracker.fr/mode-tournee" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mode Tournée IKtracker | Suivi kilométrique multi-arrêts" />
        <meta name="twitter:description" content="Enregistrez tous vos arrêts clients en un seul trajet. Gratuit pour indépendants." />
        <meta name="twitter:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        
        {/* Geo */}
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="France" />
        <meta name="language" content="fr" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Mode Tournée IKtracker",
            "description": "Fonctionnalité de suivi kilométrique multi-arrêts pour professionnels itinérants",
            "url": "https://iktracker.fr/mode-tournee",
            "isPartOf": {
              "@type": "WebSite",
              "name": "IKtracker",
              "url": "https://iktracker.fr"
            },
            "about": {
              "@type": "SoftwareApplication",
              "name": "IKtracker Mode Tournée",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web, iOS, Android",
              "offers": {
                "@type": "Offer",
                "price": "0.00",
                "priceCurrency": "EUR"
              }
            }
          })}
        </script>
      </Helmet>
      <MarketingNav />

      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Hero */}
        <section 
          className="pt-28 pb-20 md:pt-36 md:pb-28 px-4 relative overflow-hidden"
          aria-labelledby="hero-heading"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5" aria-hidden="true" />
          
          <div className="container mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  <span>Fonctionnalité exclusive</span>
                </div>
                
                <h1 id="hero-heading" className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground leading-tight mb-6">
                  Le <span className="text-gradient">Mode Tournée</span> pour les pros itinérants
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  Enchaînez 10 clients dans la journée ? Enregistrez gratuitement tous vos arrêts en un seul trajet. 
                  Distance totale calculée automatiquement.
                </p>

                <div className="flex flex-wrap gap-4 mb-8">
                  <Link to="/signup" className="focus-visible-ring rounded-lg">
                    <Button size="lg" variant="gradient" className="group">
                      Accéder à l'outil
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Link to="/install" className="focus-visible-ring rounded-lg">
                    <Button size="lg" variant="outline">
                      Installer l'app
                    </Button>
                  </Link>
                </div>

                <ul className="flex flex-wrap gap-4 text-sm text-muted-foreground" role="list" aria-label="Avantages">
                  {["100% Gratuit", "Pas de pub", "Données en Europe"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </AnimatedSection>

              <AnimatedSection delay={200} className="flex justify-center">
                <Suspense fallback={<DemoLoader />}>
                  <TourModeMockup />
                </Suspense>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Voyez le mode Tournée en action
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Chaque étape est enregistrée. La distance s'additionne automatiquement.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <Suspense fallback={<DemoLoader />}>
                <TourModeDemo className="max-w-4xl mx-auto" />
              </Suspense>
            </AnimatedSection>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Pourquoi le mode Tournée ?
              </h2>
            </AnimatedSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, i) => (
                <AnimatedSection key={i} delay={i * 100}>
                  <div className="bg-card border border-border rounded-2xl p-6 h-full hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                      <benefit.icon className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">{benefit.description}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Carousel */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Simple comme 1, 2, 3
              </h2>
            </AnimatedSection>

            <AnimatedSection>
              <Suspense fallback={<DemoLoader />}>
                <AppCarousel className="max-w-5xl mx-auto" />
              </Suspense>
            </AnimatedSection>
          </div>
        </section>

        {/* For who */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Fait pour vous
              </h2>
              <p className="text-lg text-muted-foreground">
                Le mode Tournée est conçu pour les professionnels qui enchaînent les déplacements.
              </p>
            </AnimatedSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {professions.map((prof, i) => (
                <AnimatedSection key={i} delay={i * 100}>
                  <div className="text-center p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <prof.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-1">{prof.name}</h3>
                    <p className="text-sm text-muted-foreground">{prof.description}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <AnimatedSection>
              <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-accent/10 via-primary/5 to-accent/10 rounded-3xl p-12 border border-accent/20">
                <Navigation className="w-16 h-16 text-accent mx-auto mb-6" />
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Prêt à simplifier vos tournées ?
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Sans carte bancaire. Compte créé en 2 minutes.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link to="/signup">
                    <Button size="xl" variant="gradient" className="group">
                      Accéder à l'outil
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/calendrier">
                    <Button size="xl" variant="outline">
                      Découvrir la synchro calendrier
                    </Button>
                  </Link>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>

      <Suspense fallback={<FooterPlaceholder />}>
        <MarketingFooter />
      </Suspense>
      <Suspense fallback={null}>
        <MarketingPWANotification />
      </Suspense>
    </div>
  );
}
