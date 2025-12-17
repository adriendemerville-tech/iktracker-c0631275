import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AuthForm } from "@/components/AuthForm";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  MapPin, 
  Route, 
  FileText, 
  Smartphone, 
  Clock, 
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  HelpCircle,
  LayoutDashboard
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const AnimatedSection = ({ children, className, delay = 0 }: AnimatedSectionProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-8",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const Landing = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && session) {
        navigate('/app');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const features = [
    {
      icon: Calendar,
      title: "Suivi des trajets",
      description: "Synchronisation automatique avec votre calendrier professionnel (Google, Outlook)."
    },
    {
      icon: MapPin,
      title: "Détection automatisée",
      description: "Calcul de distance précis via Google Maps API. Plus besoin de noter vos km."
    },
    {
      icon: Route,
      title: "Fonction Tournée",
      description: "Optimisé pour les infirmiers et artisans enchaînant plusieurs clients dans la journée."
    },
    {
      icon: FileText,
      title: "Export Comptable",
      description: "Génération d'un relevé PDF/CSV prêt pour votre expert-comptable en un clic."
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Une expérience fluide sur smartphone, installable comme une application native."
    }
  ];

  const ikBareme = [
    { cv: "3 CV et moins", jusqu5000: "0,529 €", de5001a20000: "0,316 €", plus20000: "0,370 €" },
    { cv: "4 CV", jusqu5000: "0,606 €", de5001a20000: "0,340 €", plus20000: "0,407 €" },
    { cv: "5 CV", jusqu5000: "0,636 €", de5001a20000: "0,357 €", plus20000: "0,427 €" },
    { cv: "6 CV", jusqu5000: "0,665 €", de5001a20000: "0,374 €", plus20000: "0,447 €" },
    { cv: "7 CV et plus", jusqu5000: "0,697 €", de5001a20000: "0,394 €", plus20000: "0,470 €" },
  ];

  const testimonials = [
    {
      name: "Marie Dupont",
      role: "Infirmière libérale",
      initials: "MD",
      quote: "Je passais 2h chaque dimanche à refaire mes trajets. Maintenant, tout est automatique ! Mon comptable est ravi.",
      color: "bg-primary"
    },
    {
      name: "Thomas Bernard",
      role: "Artisan plombier",
      initials: "TB",
      quote: "La fonction tournée est parfaite pour mes journées avec 6-7 clients. Je ne perds plus un seul kilomètre.",
      color: "bg-accent"
    },
    {
      name: "Sophie Martin",
      role: "Consultante RH",
      initials: "SM",
      quote: "L'export PDF est impeccable. Mon expert-comptable m'a félicitée pour la clarté de mes relevés !",
      color: "bg-success"
    }
  ];

  const faqItems = [
    {
      question: "IKtracker est-il vraiment gratuit ?",
      answer: "Oui, IKtracker est 100% gratuit pour tous les indépendants. Pas de version premium, pas de frais cachés. Notre objectif est de simplifier la vie des professionnels libéraux."
    },
    {
      question: "Comment fonctionne la synchronisation avec mon calendrier ?",
      answer: "IKtracker se connecte à votre calendrier Google ou Outlook. Chaque rendez-vous avec une adresse est automatiquement détecté et converti en trajet. Vous n'avez plus qu'à valider !"
    },
    {
      question: "Les distances calculées sont-elles fiables ?",
      answer: "Absolument. Nous utilisons l'API Google Maps pour calculer les distances réelles entre vos points de départ et d'arrivée. Les calculs sont précis au kilomètre près."
    },
    {
      question: "Puis-je utiliser IKtracker sur mon téléphone ?",
      answer: "Oui ! IKtracker est une Progressive Web App (PWA) optimisée pour mobile. Vous pouvez l'installer sur votre écran d'accueil et l'utiliser comme une application native."
    },
    {
      question: "Comment exporter mes trajets pour mon comptable ?",
      answer: "En un clic, générez un relevé PDF ou CSV de vos trajets. Le document inclut toutes les informations nécessaires : dates, adresses, distances et montants calculés selon le barème fiscal."
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer: "Vos données sont stockées de manière sécurisée et chiffrées. Nous ne partageons jamais vos informations avec des tiers. Vous pouvez supprimer votre compte et vos données à tout moment."
    }
  ];

  const heroAnimation = useScrollAnimation({ threshold: 0.1 });

  return (
    <div className="min-h-screen bg-background font-display overflow-x-hidden">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border" role="banner">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between" aria-label="Navigation principale">
          <Link to="/" className="flex items-center gap-2" aria-label="IKtracker - Accueil">
            <img src="/favicon.png" alt="Logo IKtracker" className="h-9 w-9 rounded-full transition-transform duration-300 hover:scale-110" width="36" height="36" />
            <span className="text-xl font-bold text-foreground">IKtracker</span>
          </Link>
          {!loading && (
            user ? (
              <Link to="/app">
                <Button variant="gradient" size="sm" className="group">
                  <LayoutDashboard className="h-4 w-4 mr-2" aria-hidden="true" />
                  Mon tableau de bord
                </Button>
              </Link>
            ) : (
              <a href="#auth-section">
                <Button variant="gradient" size="sm">
                  S'inscrire
                </Button>
              </a>
            )
          )}
        </nav>
      </header>

      <main>

      {/* Hero Section */}
      <section className="pt-28 pb-16 md:pt-32 md:pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div 
          ref={heroAnimation.ref}
          className={cn(
            "container mx-auto relative z-10 transition-all duration-700 ease-out",
            heroAnimation.isVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-8"
          )}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text content */}
            <div className="text-center lg:text-left">
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
                style={{ transitionDelay: '100ms' }}
              >
                <CheckCircle2 className="h-4 w-4" />
                100% Gratuit pour les indépendants
              </div>
              <h1 
                className={cn(
                  "text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6 transition-all duration-700 ease-out",
                  heroAnimation.isVisible 
                    ? "opacity-100 translate-y-0" 
                    : "opacity-0 translate-y-8"
                )}
                style={{ transitionDelay: '200ms' }}
              >
                Automatisez vos{" "}
                <span className="text-gradient">indemnités kilométriques</span>{" "}
                en un clic
              </h1>
              <p 
                className={cn(
                  "text-lg md:text-xl text-muted-foreground mb-8 transition-all duration-700 ease-out",
                  heroAnimation.isVisible 
                    ? "opacity-100 translate-y-0" 
                    : "opacity-0 translate-y-8"
                )}
                style={{ transitionDelay: '300ms' }}
              >
                L'outil gratuit pour transformer vos rendez-vous en relevés comptables. 
                Fini les heures perdues sur Excel.
              </p>
              
              {/* Show dashboard button if logged in (on mobile) */}
              {user && (
                <div className="lg:hidden mb-8">
                  <Link to="/app">
                    <Button size="xl" variant="gradient" className="w-full sm:w-auto group">
                      <LayoutDashboard className="h-5 w-5 mr-2" />
                      Accéder à mon tableau de bord
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              )}

              <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Pas de carte bancaire
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Installation en 2 min
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Export PDF/CSV
                </div>
              </div>
            </div>

            {/* Right: Auth form or Dashboard button */}
            <div 
              id="auth-section"
              className={cn(
                "transition-all duration-700 ease-out",
                heroAnimation.isVisible 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: '400ms' }}
            >
              {!loading && (
                user ? (
                  <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Bienvenue, {user.email?.split('@')[0]} !
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Vous êtes connecté. Accédez à votre tableau de bord pour gérer vos trajets.
                    </p>
                    <Link to="/app">
                      <Button size="lg" variant="gradient" className="w-full group">
                        <LayoutDashboard className="h-5 w-5 mr-2" />
                        Accéder à mon tableau de bord
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

      {/* Pain Point Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
                <Clock className="h-4 w-4" />
                Le problème
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Arrêtez de perdre{" "}
                <span className="text-destructive">4h par mois</span>{" "}
                sur Excel
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Vous êtes infirmier, artisan ou consultant ? Vous passez vos dimanches soirs à 
                reconstituer votre historique de trajets, à chercher les adresses de vos clients 
                et à calculer les distances...
              </p>
              <ul className="space-y-3">
                {[
                  "Recherche des adresses dans votre agenda",
                  "Calcul manuel des distances sur Google Maps",
                  "Saisie fastidieuse dans un tableau Excel",
                  "Risque d'erreurs et d'oublis"
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    {item}
                  </li>
                ))}
              </ul>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <div className="relative">
                {/* Styled Excel Sheet in Perspective - Background */}
                <div className="absolute -top-8 -right-8 w-[120%] h-[120%] opacity-40 pointer-events-none hidden md:block">
                  <div 
                    className="bg-card rounded-xl border border-border p-4 shadow-2xl"
                    style={{ 
                      transform: 'perspective(1000px) rotateY(-12deg) rotateX(8deg) translateZ(-50px)',
                      transformOrigin: 'center center'
                    }}
                  >
                    {/* Excel Header */}
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <div className="w-3 h-3 rounded-full bg-warning" />
                      <div className="w-3 h-3 rounded-full bg-success" />
                      <span className="ml-2 text-xs text-muted-foreground font-mono">trajets_2025.xlsx</span>
                    </div>
                    {/* Excel Grid */}
                    <div className="grid grid-cols-5 gap-px bg-border rounded overflow-hidden">
                      {['A', 'B', 'C', 'D', 'E'].map((col) => (
                        <div key={col} className="bg-muted px-3 py-1.5 text-xs font-mono text-muted-foreground text-center font-semibold">{col}</div>
                      ))}
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div key={i} className="bg-card px-3 py-2 text-xs font-mono text-foreground/70 truncate border-t border-border/50">
                          {i % 5 === 0 ? '12/01' : i % 5 === 1 ? 'Paris 15e' : i % 5 === 2 ? 'Versailles' : i % 5 === 3 ? '42 km' : '20,58€'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Main Card */}
                <div className="relative bg-card rounded-2xl p-8 shadow-lg border border-border z-10">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-primary mb-2">48h</div>
                    <p className="text-muted-foreground">économisées par an en moyenne</p>
                  </div>
                  <div className="mt-8 pt-8 border-t border-border">
                    <div className="flex items-center justify-center gap-2 text-success">
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-semibold">IKtracker élimine cette charge mentale</span>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* IK Barème Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <FileText className="h-4 w-4" />
              Barème fiscal 2025
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tout comprendre au barème des{" "}
              <span className="text-gradient">indemnités kilométriques</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Déclarer vos trajets réels permet d'optimiser votre fiscalité. 
              Plus vous roulez, plus vous économisez sur vos impôts.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <div className="overflow-x-auto">
              <table className="w-full bg-card rounded-xl border border-border overflow-hidden">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Puissance fiscale</th>
                    <th className="px-6 py-4 text-center font-semibold text-foreground">Jusqu'à 5 000 km</th>
                    <th className="px-6 py-4 text-center font-semibold text-foreground">De 5 001 à 20 000 km</th>
                    <th className="px-6 py-4 text-center font-semibold text-foreground">Plus de 20 000 km</th>
                  </tr>
                </thead>
                <tbody>
                  {ikBareme.map((row, index) => (
                    <tr key={index} className="border-t border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{row.cv}</td>
                      <td className="px-6 py-4 text-center text-muted-foreground">{row.jusqu5000}</td>
                      <td className="px-6 py-4 text-center text-muted-foreground">{row.de5001a20000}</td>
                      <td className="px-6 py-4 text-center text-muted-foreground">{row.plus20000}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              * Barème kilométrique 2025 pour les voitures. Source : impots.gouv.fr
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-muted-foreground">
              Des fonctionnalités pensées pour les indépendants, libéraux et artisans
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {features.map((feature, index) => (
              <AnimatedSection key={index} delay={index * 100}>
                <Card className="bg-card border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>

          {/* App Visualization - Trip Report Mockup */}
          <AnimatedSection delay={300}>
            <div className="relative">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <LayoutDashboard className="h-4 w-4" />
                  Aperçu de l'application
                </div>
                <h3 className="text-2xl font-bold text-foreground">Votre relevé de trajets en un coup d'œil</h3>
              </div>
              
              {/* App Mockup */}
              <div className="max-w-4xl mx-auto">
                <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
                  {/* App Header */}
                  <div className="bg-primary/5 px-6 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src="/favicon.png" alt="IKtracker" className="h-8 w-8 rounded-full" />
                      <span className="font-bold text-foreground">IKtracker</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Janvier 2025
                    </div>
                  </div>
                  
                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-4 p-6 bg-muted/30 border-b border-border">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">847 km</div>
                      <div className="text-sm text-muted-foreground">Distance totale</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">412,50 €</div>
                      <div className="text-sm text-muted-foreground">Indemnités</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">23</div>
                      <div className="text-sm text-muted-foreground">Trajets</div>
                    </div>
                  </div>
                  
                  {/* Trip List */}
                  <div className="divide-y divide-border">
                    {[
                      { date: "15 Jan", from: "Paris 15e", to: "Versailles", km: 42, amount: "20,58 €", purpose: "Rendez-vous client" },
                      { date: "14 Jan", from: "Paris 15e", to: "Saint-Denis", km: 28, amount: "13,72 €", purpose: "Visite chantier" },
                      { date: "13 Jan", from: "Domicile", to: "Paris 8e", km: 35, amount: "17,15 €", purpose: "Réunion projet" },
                    ].map((trip, i) => (
                      <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-medium text-muted-foreground w-16">{trip.date}</div>
                          <div>
                            <div className="flex items-center gap-2 text-foreground font-medium">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              {trip.from} → {trip.to}
                            </div>
                            <div className="text-sm text-muted-foreground">{trip.purpose}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-foreground">{trip.km} km</div>
                          <div className="text-sm text-success font-medium">{trip.amount}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Export Button */}
                  <div className="p-4 bg-muted/30 border-t border-border flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Exporter PDF / CSV
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <CheckCircle2 className="h-4 w-4" />
              Ils nous font confiance
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ce que disent nos utilisateurs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Des centaines d'indépendants ont déjà simplifié leur gestion kilométrique
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <AnimatedSection key={index} delay={index * 150}>
                <Card className="bg-card border-border h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex-1">
                      <svg className="h-8 w-8 text-primary/20 mb-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                      <p className="text-foreground mb-6 leading-relaxed">
                        "{testimonial.quote}"
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t border-border">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`${testimonial.color} text-primary-foreground text-sm font-semibold`}>
                          {testimonial.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-3xl">
          <AnimatedSection className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Questions fréquentes
            </h2>
            <p className="text-lg text-muted-foreground">
              Tout ce que vous devez savoir sur IKtracker
            </p>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqItems.map((item, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <AnimatedSection>
            <div className="bg-gradient-primary rounded-3xl p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                  Prêt à simplifier votre comptabilité ?
                </h2>
                <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                  Rejoignez les centaines d'indépendants qui ont déjà automatisé leurs IK
                </p>
                {user ? (
                  <Link to="/app">
                    <Button size="xl" variant="secondary" className="group">
                      <LayoutDashboard className="h-5 w-5 mr-2" />
                      Accéder à mon tableau de bord
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <a href="#auth-section">
                    <Button size="xl" variant="secondary" className="group">
                      Créer mon compte gratuit
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border" role="contentinfo">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="IKtracker" className="h-9 w-9 rounded-full transition-transform duration-300 hover:scale-110" />
              <span className="font-bold text-foreground">IKtracker</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Outil <span className="font-semibold text-success">100% gratuit</span> pour les indépendants
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Confidentialité
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                CGU
              </Link>
            </div>
          </div>
          
          {/* Social Share Section */}
          <div className="mt-8 pt-8 border-t border-border">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">Partagez IKtracker avec vos collègues</p>
              <div className="flex items-center gap-3">
                <a
                  href="https://twitter.com/intent/tweet?text=Découvrez%20IKtracker%20-%20L'outil%20gratuit%20pour%20calculer%20et%20suivre%20vos%20indemnités%20kilométriques%20!&url=https://iktracker.lovable.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all hover:scale-110"
                  aria-label="Partager sur Twitter"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/shareArticle?mini=true&url=https://iktracker.lovable.app&title=IKtracker&summary=L'outil%20gratuit%20pour%20calculer%20et%20suivre%20vos%20indemnités%20kilométriques"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all hover:scale-110"
                  aria-label="Partager sur LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href="https://www.facebook.com/sharer/sharer.php?u=https://iktracker.lovable.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all hover:scale-110"
                  aria-label="Partager sur Facebook"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} IKtracker. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
