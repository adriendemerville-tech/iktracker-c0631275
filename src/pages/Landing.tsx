import { useState, useEffect } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/AuthForm";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { AnimatedPhoneMockup } from "@/components/marketing/AnimatedPhoneMockup";
import { AppCarousel } from "@/components/marketing/AppCarousel";
import { TourModeDemo } from "@/components/marketing/TourModeDemo";
import { CalendarSyncDemo } from "@/components/marketing/CalendarSyncDemo";
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
  Star
} from "lucide-react";

const Landing = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { ref: pdfRef, isVisible: pdfVisible } = useScrollAnimation({ threshold: 0.2 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && session) {
        navigate('/app');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background font-display overflow-x-hidden">
      <title>IKtracker - Suivi kilométrique automatique et indemnités IK</title>
      <meta name="description" content="Automatisez vos indemnités kilométriques. Application gratuite pour freelances et indépendants. Calcul IK selon barème fiscal 2024." />
      
      <MarketingNav />

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-28 md:pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text content */}
            <div className="text-center lg:text-left animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Star className="h-4 w-4" />
                100% Gratuit
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
                Vos trajets pro.
                <br />
                <span className="text-gradient">Automatiquement.</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8">
                Enregistrez, calculez et exportez vos indemnités kilométriques en quelques clics.
              </p>
              
              {user && (
                <div className="lg:hidden mb-8">
                  <Link to="/app">
                    <Button size="lg" variant="gradient" className="w-full sm:w-auto group">
                      <LayoutDashboard className="h-5 w-5 mr-2" />
                      Mon tableau de bord
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              )}

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm text-muted-foreground">
                {["Sans carte bancaire", "Installation 2 min", "Export PDF/CSV"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Auth form or Phone mockup */}
            <div id="auth-section" className="animate-scale-in">
              {!loading && (
                user ? (
                  <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Bienvenue !
                    </h3>
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
                  <AuthForm />
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* App Screenshots Carousel */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Découvrez l'application</h2>
            <p className="text-muted-foreground text-lg">Interface simple et intuitive</p>
          </div>
          <AppCarousel />
        </div>
      </section>

      {/* Features Grid - Icons only */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Tout ce dont vous avez besoin</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: Car, title: "Multi-véhicules" },
              { icon: Calculator, title: "Calcul IK auto" },
              { icon: MapPin, title: "GPS intégré" },
              { icon: Calendar, title: "Sync calendriers" },
              { icon: FileText, title: "Export PDF/CSV" },
            ].map((feature, i) => (
              <div 
                key={i}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 text-center animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phone Mockup Demo */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <AnimatedPhoneMockup />
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold">Une app mobile complète</h2>
              <p className="text-lg text-muted-foreground">
                Installez IKtracker sur votre téléphone et enregistrez vos trajets en déplacement.
              </p>
              <ul className="space-y-3">
                {["Fonctionne hors-ligne", "Notifications rappels", "GPS temps réel"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/install">
                <Button variant="outline" className="gap-2">
                  Guide d'installation
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tour Mode Demo */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                <Route className="h-4 w-4" />
                Nouveau
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Mode Tournée</h2>
              <p className="text-lg text-muted-foreground">
                Plusieurs arrêts, un seul enregistrement. Parfait pour les commerciaux et livreurs.
              </p>
              <ul className="space-y-3">
                {["GPS en temps réel", "Arrêts illimités", "Calcul automatique"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/mode-tournee">
                <Button variant="outline" className="gap-2">
                  En savoir plus
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <TourModeDemo />
          </div>
        </div>
      </section>

      {/* Calendar Sync Demo */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <CalendarSyncDemo />
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                <Calendar className="h-4 w-4" />
                Intégration
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Sync Calendriers</h2>
              <p className="text-lg text-muted-foreground">
                Importez vos rendez-vous et transformez-les en trajets automatiquement.
              </p>
              <ul className="space-y-3">
                {["Google Calendar", "Microsoft Outlook", "Import en un clic"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/calendrier">
                <Button variant="outline" className="gap-2">
                  En savoir plus
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PDF Report Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                <FileText className="h-4 w-4" />
                Export
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Rapport PDF professionnel</h2>
              <p className="text-lg text-muted-foreground">
                Générez un relevé complet de vos trajets conforme au barème fiscal, prêt à envoyer à votre comptable.
              </p>
              <ul className="space-y-3">
                {["Format PDF ou Excel", "Barème fiscal 2025", "Envoi direct par email"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/expert-comptable">
                <Button variant="outline" className="gap-2">
                  En savoir plus
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div 
              ref={pdfRef}
              className={`relative transition-all duration-700 ${pdfVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">releve-ik-2025.pdf</p>
                    <p className="text-sm text-muted-foreground">Document PDF • 156 Ko</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Total km", value: "1 247 km", delay: 100 },
                    { label: "Indemnités", value: "687,50 €", delay: 200, highlight: true },
                    { label: "Trajets", value: "23 trajets", delay: 300 }
                  ].map((item, i) => (
                    <div 
                      key={i}
                      className={`flex justify-between py-2 ${i < 2 ? 'border-b border-border' : ''} transition-all duration-500`}
                      style={{ 
                        transitionDelay: pdfVisible ? `${item.delay}ms` : '0ms',
                        opacity: pdfVisible ? 1 : 0,
                        transform: pdfVisible ? 'translateX(0)' : 'translateX(-10px)'
                      }}
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={`font-medium ${item.highlight ? 'text-primary' : ''}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">Prêt à simplifier vos trajets ?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Rejoignez des milliers d'utilisateurs qui gagnent du temps chaque mois.
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 py-6">
              Créer mon compte gratuit
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Landing;
