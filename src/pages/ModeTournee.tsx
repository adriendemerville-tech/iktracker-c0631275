import { useEffect, lazy, Suspense, memo } from "react";
import { buildSoftwareApplicationSchema } from "@/lib/seo-schemas";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Breadcrumb } from "@/components/Breadcrumb";
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
  Users,
  RefreshCw,
  ShieldCheck,
  Smartphone
} from "lucide-react";

// Lazy load heavy demo components
const TourModeDemo = lazy(() => import("@/components/marketing/TourModeDemo").then(m => ({ default: m.TourModeDemo })));
const TourModeMockup = lazy(() => import("@/components/marketing/TourModeMockup").then(m => ({ default: m.TourModeMockup })));
const AnimatedPhoneMockup = lazy(() => import("@/components/marketing/AnimatedPhoneMockup").then(m => ({ default: m.AnimatedPhoneMockup })));
const AppCarousel = lazy(() => import("@/components/marketing/AppCarousel").then(m => ({ default: m.AppCarousel })));
const EnhancedMarketingFooter = lazy(() => import("@/components/marketing/EnhancedMarketingFooter").then(m => ({ default: m.EnhancedMarketingFooter })));
const MarketingPWANotification = lazy(() => import("@/components/marketing/MarketingPWANotification").then(m => ({ default: m.MarketingPWANotification })));

const DemoLoader = () => <div className="h-64 flex items-center justify-center text-muted-foreground">Chargement...</div>;
const FooterPlaceholder = memo(() => <div className="min-h-[600px] bg-muted/30 animate-pulse" />);

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
    },
    {
      icon: RefreshCw,
      title: "Reprise auto",
      description: "App fermée par erreur ? Reprenez votre tournée là où vous l'avez laissée"
    },
    {
      icon: ShieldCheck,
      title: "Finalisation intelligente",
      description: "Tournée oubliée ? Elle se termine seule et crée un trajet à vérifier"
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
        <title>Mode Tournée GPS | Suivi kilométrique commercial, infirmier, artisan</title>
        <meta name="description" content="Mode Tournée IKtracker : enregistrez automatiquement chaque arrêt client par GPS. Idéal pour commerciaux itinérants, VRP, infirmières libérales, artisans, livreurs et aide à domicile. Note de frais kilométrique générée en un clic." />
        <meta name="keywords" content="mode tournée GPS, commercial itinérant, tournée VRP, note de frais kilométrique, suivi kilométrique infirmière libérale, indemnités kilométriques artisan, frais kilométriques multi-arrêts, auto-entrepreneur déplacement, application gratuite tournée" />
        <link rel="canonical" href="https://iktracker.fr/mode-tournee" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Mode Tournée IKtracker | Suivi kilométrique multi-arrêts" />
        <meta property="og:description" content="Mode Tournée IKtracker : enregistrez gratuitement tous vos arrêts clients grâce à la localisation GPS. Outil professionnel pour infirmiers libéraux, artisans et commerciaux." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://iktracker.fr/mode-tournee" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mode Tournée IKtracker | Suivi kilométrique multi-arrêts" />
        <meta name="twitter:description" content="Mode Tournée IKtracker : enregistrez gratuitement tous vos arrêts clients grâce à la localisation GPS. Outil professionnel pour infirmiers libéraux, artisans et commerciaux." />
        <meta name="twitter:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        
        {/* Geo */}
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="France" />
        <meta name="language" content="fr" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                "name": "Mode Tournée IKtracker - Outil communautaire",
                "description": "Fonctionnalité de suivi kilométrique multi-arrêts par GPS pour professionnels itinérants. Outil communautaire gratuit.",
                "url": "https://iktracker.fr/mode-tournee",
                "isPartOf": {
                  "@type": "WebSite",
                  "name": "IKtracker",
                  "url": "https://iktracker.fr"
                },
                "speakable": {
                  "@type": "SpeakableSpecification",
                  "cssSelector": ["#hero-heading", "#main-content > section:first-of-type p"]
                }
              },
              {
                "@type": "SoftwareApplication",
                "name": "IKtracker Mode Tournée",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web, iOS, Android",
                "offers": {
                  "@type": "Offer",
                  "price": "0.00",
                  "priceCurrency": "EUR"
                },
                "featureList": [
                  "Tracking GPS en temps réel des arrêts clients",
                  "Calcul automatique des distances via Google Maps",
                  "Navigation intégrée Waze et Google Maps",
                  "Génération automatique des trajets et IK",
                  "Export PDF/CSV de la tournée complète"
                ],
                "audience": {
                  "@type": "BusinessAudience",
                  "audienceType": "Infirmiers libéraux, artisans, commerciaux, aide à domicile"
                }
              },
              {
                "@type": "HowTo",
                "name": "Comment utiliser le Mode Tournée IKtracker",
                "description": "Suivez automatiquement vos arrêts clients et calculez vos indemnités kilométriques en 3 étapes.",
                "totalTime": "PT1M",
                "tool": [{ "@type": "HowToTool", "name": "Smartphone avec GPS activé" }],
                "step": [
                  { "@type": "HowToStep", "position": 1, "name": "Démarrez votre tournée", "text": "Un clic pour commencer. L'app détecte votre position de départ grâce au GPS.", "url": "https://iktracker.fr/mode-tournee#etape-1" },
                  { "@type": "HowToStep", "position": 2, "name": "Ajoutez vos arrêts", "text": "Chaque client visité est automatiquement enregistré grâce à la géolocalisation.", "url": "https://iktracker.fr/mode-tournee#etape-2" },
                  { "@type": "HowToStep", "position": 3, "name": "Récapitulatif complet", "text": "Distance totale, IK calculées selon le barème 2026, prêt pour l'export PDF.", "url": "https://iktracker.fr/mode-tournee#etape-3" }
                ]
              }
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildSoftwareApplicationSchema({ pageUrl: "https://iktracker.fr/mode-tournee", pageDescription: "Mode Tournée IKtracker : enregistrement GPS multi-arrêts pour professionnels itinérants (infirmiers libéraux, commerciaux, artisans). Détection automatique des stops, reprise de session après fermeture, finalisation intelligente." }))}
        </script>
      </Helmet>
      <MarketingNav />

      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 pt-24">
          <Breadcrumb items={[{ label: 'Mode Tournée' }]} />
        </div>

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
                
                <p className="text-lg md:text-xl text-muted-foreground mb-8 min-h-[6rem] sm:min-h-[5rem] md:min-h-[4.5rem]">
                  Enchaînez 10 clients dans la journée ? Enregistrez gratuitement tous vos arrêts grâce à la localisation GPS. 
                  Distance totale calculée automatiquement.
                </p>

                <div className="flex flex-wrap gap-4 mb-8">
                  <Link to="/signup" className="focus-visible-ring rounded-lg">
                    <Button size="lg" variant="gradient" className="group">
                      Accéder à l'outil
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Link to="/installer" className="focus-visible-ring rounded-lg">
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

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Reprise & finalisation auto */}
        <section className="py-20 px-4" aria-labelledby="recovery-heading">
          <div className="container mx-auto max-w-5xl">
            <AnimatedSection className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                <span>Exclusivité mobile</span>
              </div>
              <h2 id="recovery-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Aucune tournée perdue, jamais
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                L'app fonctionne en conditions réelles : téléphone qui s'éteint, app fermée, oubli de finaliser. 
                On a tout prévu.
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 gap-6">
              <AnimatedSection delay={100}>
                <div className="bg-card border border-border rounded-2xl p-6 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg">Reprise sur mobile</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    Vous rouvrez l'app sur votre téléphone après une interruption ?
                    Une fenêtre vous propose de <strong>reprendre</strong> votre tournée 
                    avec tous les arrêts déjà enregistrés, ou de la <strong>terminer</strong>.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground">Étapes et distance préservées</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground">GPS reprend automatiquement</span>
                    </li>
                  </ul>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={200}>
                <div className="bg-card border border-border rounded-2xl p-6 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg">Finalisation intelligente</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    Tournée oubliée ? Elle se <strong>termine seule</strong> et crée le trajet le plus pertinent
                    selon les données disponibles :
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground"><strong>2 arrêts ou plus</strong> → tournée complète enregistrée</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground"><strong>1 arrêt + GPS</strong> → trajet à vérifier (arrivée détectée par GPS)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground"><strong>1 arrêt seul</strong> → trajet à compléter (arrivée à renseigner)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground"><strong>0 arrêt mais GPS ≥ 2 km</strong> → trajet à vérifier (villes GPS détectées)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground">Tous les trajets « à vérifier » se complètent en un clic depuis « Mes trajets »</span>
                    </li>
                  </ul>
                </div>
              </AnimatedSection>
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
                <p className="text-lg text-muted-foreground mb-6">
                  Sans carte bancaire. Compte créé en 2 minutes.
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  Barème conforme aux{" "}
                  <a 
                    href="https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/indemnites-kilometriques.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-primary transition-colors"
                  >
                    taux officiels URSSAF
                  </a>.
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
        <EnhancedMarketingFooter />
      </Suspense>
      <Suspense fallback={null}>
        <MarketingPWANotification />
      </Suspense>
    </div>
  );
}
