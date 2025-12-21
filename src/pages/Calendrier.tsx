import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingPWANotification } from "@/components/marketing/MarketingPWANotification";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { CalendarSyncDemo } from "@/components/marketing/CalendarSyncDemo";
import { AnimatedPhoneMockup } from "@/components/marketing/AnimatedPhoneMockup";
import { AppCarousel } from "@/components/marketing/AppCarousel";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  Shield,
  Smartphone
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

export default function Calendrier() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const benefits = [
    {
      icon: Zap,
      title: "Zéro saisie",
      description: "Vos RDV deviennent des trajets automatiquement"
    },
    {
      icon: RefreshCw,
      title: "Synchro en temps réel",
      description: "Nouveaux RDV détectés instantanément"
    },
    {
      icon: Clock,
      title: "2h gagnées/mois",
      description: "Plus de ressaisie manuelle le week-end"
    },
    {
      icon: Shield,
      title: "Données sécurisées",
      description: "Connexion OAuth, aucun mot de passe stocké"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Connectez votre calendrier",
      description: "Google Calendar ou Outlook, en 2 clics"
    },
    {
      number: "2",
      title: "Ajoutez vos RDV comme d'habitude",
      description: "Avec l'adresse dans le champ lieu"
    },
    {
      number: "3",
      title: "Les trajets se créent seuls",
      description: "Distance et IK calculées automatiquement"
    }
  ];

  const carouselSlides = [
    {
      title: "Vos rendez-vous synchronisés",
      description: "Chaque RDV avec une adresse est détecté automatiquement.",
      mockup: <AnimatedPhoneMockup screen="calendar" />
    },
    {
      title: "Trajets générés",
      description: "La distance est calculée entre votre domicile et le lieu du RDV.",
      mockup: <AnimatedPhoneMockup screen="newTrip" />
    },
    {
      title: "Tout est comptabilisé",
      description: "Retrouvez tous vos km dans votre tableau de bord.",
      mockup: <AnimatedPhoneMockup screen="dashboard" />
    }
  ];

  const calendars = [
    { name: "Google Calendar", color: "#4285F4", logo: "G" },
    { name: "Outlook", color: "#0078D4", logo: "O" },
  ];

  return (
    <div className="min-h-screen bg-background font-display">
      <Helmet>
        <title>Synchronisation Calendrier IKtracker | Google Calendar & Outlook</title>
        <meta name="description" content="Synchronisez IKtracker avec Google Calendar ou Outlook. Vos rendez-vous avec adresse deviennent automatiquement des trajets. Gratuit pour indépendants en France." />
        <link rel="canonical" href="https://iktracker.fr/calendrier" />
      </Helmet>
      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="pt-28 pb-20 md:pt-36 md:pb-28 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
          
          <div className="container mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Calendar className="h-4 w-4" />
                  Synchronisation automatique
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground leading-tight mb-6">
                  Votre calendrier génère vos <span className="text-gradient">trajets</span>
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  Connectez Google Calendar ou Outlook. Chaque rendez-vous avec une adresse 
                  devient automatiquement un trajet avec les IK calculées.
                </p>

                <div className="flex flex-wrap gap-4 mb-8">
                  <Link to="/#auth-section">
                    <Button size="lg" variant="gradient" className="group">
                      Connecter mon calendrier
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/mode-tournee">
                    <Button size="lg" variant="outline">
                      Découvrir le mode Tournée
                    </Button>
                  </Link>
                </div>

                {/* Supported calendars */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Compatible avec :</span>
                  {calendars.map((cal, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border"
                    >
                      <div 
                        className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: cal.color }}
                      >
                        {cal.logo}
                      </div>
                      <span className="text-sm font-medium">{cal.name}</span>
                    </div>
                  ))}
                </div>
              </AnimatedSection>

              <AnimatedSection delay={200} className="flex justify-center">
                <AnimatedPhoneMockup screen="calendar" />
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                La magie de la synchronisation
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Vos rendez-vous se transforment en trajets sans aucune action de votre part.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <CalendarSyncDemo className="max-w-5xl mx-auto" />
            </AnimatedSection>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Comment ça marche ?
              </h2>
            </AnimatedSection>

            <div className="max-w-3xl mx-auto">
              {steps.map((step, i) => (
                <AnimatedSection key={i} delay={i * 100}>
                  <div className="flex items-start gap-6 mb-8">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shrink-0">
                      {step.number}
                    </div>
                    <div className="pt-2">
                      <h3 className="font-bold text-foreground text-lg mb-1">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                    {i < steps.length - 1 && (
                      <div className="hidden md:block absolute left-6 mt-12 w-0.5 h-8 bg-primary/20" />
                    )}
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Les avantages
              </h2>
            </AnimatedSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, i) => (
                <AnimatedSection key={i} delay={i * 100}>
                  <div className="bg-card border border-border rounded-2xl p-6 h-full hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <benefit.icon className="w-6 h-6 text-primary" />
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
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                L'expérience en images
              </h2>
            </AnimatedSection>

            <AnimatedSection>
              <AppCarousel className="max-w-5xl mx-auto" />
            </AnimatedSection>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <AnimatedSection>
              <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 rounded-3xl p-12 border border-primary/20">
                <Calendar className="w-16 h-16 text-primary mx-auto mb-6" />
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Fini la saisie manuelle
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Connectez votre calendrier et laissez IKtracker faire le reste. 100% gratuit.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link to="/#auth-section">
                    <Button size="xl" variant="gradient" className="group">
                      Créer mon compte gratuit
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/install">
                    <Button size="xl" variant="outline">
                      <Smartphone className="h-5 w-5 mr-2" />
                      Installer l'app
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
