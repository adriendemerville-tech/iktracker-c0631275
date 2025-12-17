import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  HelpCircle
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
      question: "IkTracker est-il vraiment gratuit ?",
      answer: "Oui, IkTracker est 100% gratuit pour tous les indépendants. Pas de version premium, pas de frais cachés. Notre objectif est de simplifier la vie des professionnels libéraux."
    },
    {
      question: "Comment fonctionne la synchronisation avec mon calendrier ?",
      answer: "IkTracker se connecte à votre calendrier Google ou Outlook. Chaque rendez-vous avec une adresse est automatiquement détecté et converti en trajet. Vous n'avez plus qu'à valider !"
    },
    {
      question: "Les distances calculées sont-elles fiables ?",
      answer: "Absolument. Nous utilisons l'API Google Maps pour calculer les distances réelles entre vos points de départ et d'arrivée. Les calculs sont précis au kilomètre près."
    },
    {
      question: "Puis-je utiliser IkTracker sur mon téléphone ?",
      answer: "Oui ! IkTracker est une Progressive Web App (PWA) optimisée pour mobile. Vous pouvez l'installer sur votre écran d'accueil et l'utiliser comme une application native."
    },
    {
      question: "Comment exporter mes trajets pour mon comptable ?",
      answer: "En un clic, générez un relevé PDF ou CSV de vos trajets. Le document inclut toutes les informations nécessaires : dates, adresses, distances et montants calculés selon le barème fiscal."
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer: "Vos données sont stockées de manière sécurisée et chiffrée. Nous ne partageons jamais vos informations avec des tiers. Vous pouvez supprimer votre compte et vos données à tout moment."
    }
  ];

  const heroAnimation = useScrollAnimation({ threshold: 0.1 });

  return (
    <div className="min-h-screen bg-background font-display overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-camion.png" alt="IkTracker" className="h-8 w-8" />
            <span className="text-xl font-bold text-foreground">IkTracker</span>
          </div>
          <Link to="/auth">
            <Button variant="outline" size="sm">
              Se connecter
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div 
          ref={heroAnimation.ref}
          className={cn(
            "container mx-auto text-center relative z-10 transition-all duration-700 ease-out",
            heroAnimation.isVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-8"
          )}
        >
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            style={{ transitionDelay: '100ms' }}
          >
            <CheckCircle2 className="h-4 w-4" />
            100% Gratuit pour les indépendants
          </div>
          <h1 
            className={cn(
              "text-4xl md:text-6xl font-extrabold text-foreground leading-tight mb-6 max-w-4xl mx-auto transition-all duration-700 ease-out",
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
              "text-xl text-muted-foreground max-w-2xl mx-auto mb-10 transition-all duration-700 ease-out",
              heroAnimation.isVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: '300ms' }}
          >
            L'outil gratuit pour transformer vos rendez-vous en relevés comptables. 
            Fini les heures perdues sur Excel.
          </p>
          <div 
            className={cn(
              "flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 ease-out",
              heroAnimation.isVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: '400ms' }}
          >
            <Link to="/auth">
              <Button size="xl" variant="gradient" className="w-full sm:w-auto group">
                Démarrer gratuitement
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          <p 
            className={cn(
              "text-sm text-muted-foreground mt-4 transition-all duration-700 ease-out",
              heroAnimation.isVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: '500ms' }}
          >
            Pas de carte bancaire requise • Installation en 2 minutes
          </p>
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
              <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary mb-2">48h</div>
                  <p className="text-muted-foreground">économisées par an en moyenne</p>
                </div>
                <div className="mt-8 pt-8 border-t border-border">
                  <div className="flex items-center justify-center gap-2 text-success">
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-semibold">IkTracker élimine cette charge mentale</span>
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              Tout ce que vous devez savoir sur IkTracker
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
                <Link to="/auth">
                  <Button size="xl" variant="secondary" className="group">
                    Créer mon compte gratuit
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src="/logo-camion.png" alt="IkTracker" className="h-8 w-8" />
              <span className="font-bold text-foreground">IkTracker</span>
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
          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} IkTracker. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
