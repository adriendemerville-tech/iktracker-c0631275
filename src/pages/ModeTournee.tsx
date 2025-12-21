import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingPWANotification } from "@/components/marketing/MarketingPWANotification";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { TourModeDemo } from "@/components/marketing/TourModeDemo";
import { TourModeMockup } from "@/components/marketing/TourModeMockup";
import { AnimatedPhoneMockup } from "@/components/marketing/AnimatedPhoneMockup";
import { AppCarousel } from "@/components/marketing/AppCarousel";
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
    <div className="min-h-screen bg-background font-display">
      <Helmet>
        <title>Mode Tournée IKtracker | Suivi kilométrique pour infirmiers et artisans</title>
        <meta name="description" content="Découvrez le mode Tournée d'IKtracker : enregistrez tous vos arrêts clients en un seul trajet. Idéal pour infirmiers libéraux, artisans et commerciaux en France. Gratuit." />
        <link rel="canonical" href="https://iktracker.fr/mode-tournee" />
      </Helmet>
      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="pt-28 pb-20 md:pt-36 md:pb-28 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5" />
          
          <div className="container mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
                  <Navigation className="h-4 w-4" />
                  Fonctionnalité exclusive
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground leading-tight mb-6">
                  Le <span className="text-gradient">Mode Tournée</span> pour les pros itinérants
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  Enchaînez 10 clients dans la journée ? Enregistrez tous vos arrêts en un seul trajet. 
                  Distance totale calculée automatiquement.
                </p>

                <div className="flex flex-wrap gap-4 mb-8">
                  <Link to="/#auth-section">
                    <Button size="lg" variant="gradient" className="group">
                      Accéder à l'outil
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/install">
                    <Button size="lg" variant="outline">
                      Installer l'app
                    </Button>
                  </Link>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {["100% Gratuit", "Pas de pub", "Données en Europe"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {item}
                    </div>
                  ))}
                </div>
              </AnimatedSection>

              <AnimatedSection delay={200} className="flex justify-center">
                <TourModeMockup />
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
              <TourModeDemo className="max-w-4xl mx-auto" />
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
              <AppCarousel className="max-w-5xl mx-auto" />
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
                  <Link to="/#auth-section">
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

      <MarketingFooter />
      <MarketingPWANotification />
    </div>
  );
}
