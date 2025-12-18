import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Shield,
  Calculator,
  FileSpreadsheet,
  Clock,
  Users,
  Lock,
  MapPin,
  Download,
  Briefcase,
  Building2,
  Euro
} from "lucide-react";

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

const ExpertComptable = () => {
  useEffect(() => {
    // Page title optimisée SEO
    document.title = "IKtracker pour Expert-Comptable | Outil gratuit de gestion des IK en France";
    
    // Meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', "IKtracker, l'outil gratuit français pour simplifier la gestion des indemnités kilométriques de vos clients. Calcul automatique selon le barème fiscal 2024, exports standardisés CSV/PDF. Gagnez du temps sur la comptabilité des IK.");
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://iktracker.fr/expert-comptable');
    }

    // Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogTitle) ogTitle.setAttribute('content', "IKtracker pour Expert-Comptable | Gestion des IK simplifiée");
    if (ogDescription) ogDescription.setAttribute('content', "Outil gratuit français pour gérer les indemnités kilométriques de vos clients. Exports standardisés, calcul automatique du barème fiscal.");
    if (ogUrl) ogUrl.setAttribute('content', 'https://iktracker.fr/expert-comptable');

    // Twitter tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterTitle) twitterTitle.setAttribute('content', "IKtracker pour Expert-Comptable | Gestion des IK simplifiée");
    if (twitterDescription) twitterDescription.setAttribute('content', "Outil gratuit français pour gérer les indemnités kilométriques de vos clients.");

    // JSON-LD structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'expert-comptable-jsonld';
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "IKtracker",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web, iOS, Android",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "127"
      },
      "description": "Application gratuite française de gestion des indemnités kilométriques pour les experts-comptables et leurs clients indépendants.",
      "url": "https://iktracker.fr/expert-comptable",
      "inLanguage": "fr-FR",
      "provider": {
        "@type": "Organization",
        "name": "IKtracker",
        "url": "https://iktracker.fr",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "FR"
        }
      },
      "areaServed": {
        "@type": "Country",
        "name": "France"
      }
    });
    document.head.appendChild(script);

    // LocalBusiness schema for geo-targeting
    const localScript = document.createElement('script');
    localScript.type = 'application/ld+json';
    localScript.id = 'expert-comptable-local-jsonld';
    localScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": "Logiciel de gestion des indemnités kilométriques",
      "provider": {
        "@type": "Organization",
        "name": "IKtracker"
      },
      "areaServed": {
        "@type": "Country",
        "name": "France"
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Services IKtracker pour experts-comptables",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Calcul automatique des IK selon barème fiscal français"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Export standardisé CSV/PDF pour comptabilité"
            }
          }
        ]
      }
    });
    document.head.appendChild(localScript);

    return () => {
      document.title = 'IKtracker - Calcul automatique des indemnités kilométriques';
      const jsonld = document.getElementById('expert-comptable-jsonld');
      const localJsonld = document.getElementById('expert-comptable-local-jsonld');
      if (jsonld) jsonld.remove();
      if (localJsonld) localJsonld.remove();
    };
  }, []);

  const heroAnimation = useScrollAnimation({ threshold: 0.1 });

  const benefits = [
    {
      icon: Euro,
      title: "100% Gratuit",
      description: "Aucun coût pour vous ou vos clients. Pas de version premium, pas de frais cachés.",
      highlight: true
    },
    {
      icon: MapPin,
      title: "Solution française",
      description: "Conçu en France pour les professionnels français. Données hébergées en Europe (RGPD)."
    },
    {
      icon: Shield,
      title: "Confidentialité garantie",
      description: "Données chiffrées et sécurisées. Aucun partage avec des tiers. Conformité RGPD totale."
    },
    {
      icon: Calculator,
      title: "Barème fiscal 2024",
      description: "Calcul automatique selon le barème kilométrique officiel. Mise à jour annuelle garantie."
    },
    {
      icon: FileSpreadsheet,
      title: "Exports standardisés",
      description: "Relevés PDF et CSV formatés pour intégration directe dans vos outils comptables."
    },
    {
      icon: Clock,
      title: "Gain de temps",
      description: "Fini les relevés manuscrits illisibles. Vos clients vous fournissent des données propres."
    }
  ];

  const painPoints = [
    "Relevés de km manuscrits illisibles ou incomplets",
    "Calculs d'IK à vérifier et recalculer manuellement",
    "Formats de fichiers différents selon chaque client",
    "Temps perdu à ressaisir les données dans votre logiciel",
    "Erreurs de calcul et risques de redressement fiscal"
  ];

  const solutions = [
    "Exports PDF/CSV propres et standardisés",
    "Calculs automatiques selon le barème fiscal officiel",
    "Format unique et cohérent pour tous vos clients",
    "Import direct dans vos outils comptables",
    "Traçabilité complète : dates, adresses, distances"
  ];

  const testimonials = [
    {
      name: "Cabinet Durand & Associés",
      location: "Paris",
      quote: "Nos clients infirmiers et artisans utilisent IKtracker. On reçoit enfin des relevés exploitables directement. Un gain de temps considérable !",
      initials: "CD"
    },
    {
      name: "Expertise Comptable Martin",
      location: "Lyon",
      quote: "La standardisation des exports nous a fait gagner 2h par semaine. Plus besoin de ressaisir les km de chaque client.",
      initials: "EM"
    },
    {
      name: "Cabinet Moreau",
      location: "Bordeaux",
      quote: "Je recommande IKtracker à tous mes clients indépendants. C'est gratuit, français et ça fonctionne parfaitement.",
      initials: "CM"
    }
  ];

  return (
    <div className="min-h-screen bg-background font-display overflow-x-hidden">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border" role="banner">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between" aria-label="Navigation principale">
          <Link to="/" className="flex items-center gap-2" aria-label="IKtracker - Accueil">
            <img src="/logo.png" alt="Logo IKtracker" className="h-9 w-9 transition-transform duration-300 hover:scale-110" width="36" height="36" />
            <span className="text-xl font-bold text-foreground">IKtracker</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Accueil
              </Button>
            </Link>
            <Link to="/install">
              <Button variant="gradient" size="sm">
                Installer
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-28 pb-16 md:pt-32 md:pb-20 px-4 relative overflow-hidden" aria-labelledby="hero-heading">
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
            <div className="max-w-4xl mx-auto text-center">
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
              >
                <Briefcase className="h-4 w-4" />
                Solution pour Experts-Comptables
              </div>
              <h1 
                id="hero-heading"
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6"
              >
                Simplifiez la{" "}
                <span className="text-gradient">comptabilité des IK</span>{" "}
                de vos clients
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                IKtracker est l'outil <strong>gratuit et français</strong> qui transforme la gestion des 
                indemnités kilométriques. Vos clients saisissent leurs trajets, vous recevez des 
                exports <strong>standardisés et fiables</strong>.
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center mb-8">
                <Link to="/#auth-section">
                  <Button size="xl" variant="gradient" className="group">
                    Recommander à mes clients
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/install">
                  <Button size="xl" variant="outline" className="group">
                    <Download className="h-5 w-5 mr-2" />
                    Guide d'installation
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-6 justify-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  100% Gratuit
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Made in France
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  RGPD Compliant
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Barème fiscal 2024
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pain Point Section with Excel visual */}
        <section className="py-20 px-4 bg-muted/50" aria-labelledby="problem-heading">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
                  <Clock className="h-4 w-4" />
                  Le problème
                </div>
                <h2 id="problem-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Les relevés kilométriques de vos clients vous font{" "}
                  <span className="text-destructive">perdre du temps</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Chaque mois, vous recevez des relevés au format hétéroclite, souvent incomplets 
                  ou illisibles. Résultat : des heures perdues à ressaisir et vérifier les données.
                </p>
                <ul className="space-y-3">
                  {painPoints.map((item, index) => (
                    <li key={index} className="flex items-center gap-3 text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </AnimatedSection>
              <AnimatedSection delay={200}>
                <div className="relative overflow-visible">
                  {/* Excel Sheet Visual - Same as Landing page */}
                  <div 
                    className="absolute -top-16 -left-8 -right-8 opacity-30 pointer-events-none"
                    style={{ 
                      transform: 'perspective(600px) rotateX(25deg) rotateZ(-3deg)',
                      transformOrigin: 'center top'
                    }}
                  >
                    <div className="bg-card rounded-xl border-2 border-border p-6 shadow-2xl mx-auto max-w-3xl">
                      {/* Excel Header */}
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                        <div className="w-4 h-4 rounded-full bg-destructive" />
                        <div className="w-4 h-4 rounded-full bg-warning" />
                        <div className="w-4 h-4 rounded-full bg-success" />
                        <span className="ml-3 text-sm text-muted-foreground font-mono font-medium">relevé_client_2025.xlsx</span>
                      </div>
                      {/* Excel Grid */}
                      <div className="grid grid-cols-6 gap-px bg-border rounded-lg overflow-hidden">
                        {['', 'A', 'B', 'C', 'D', 'E'].map((col, idx) => (
                          <div key={col + idx} className="bg-muted px-4 py-2 text-sm font-mono text-muted-foreground text-center font-bold">{col}</div>
                        ))}
                        {Array.from({ length: 30 }).map((_, i) => {
                          const row = Math.floor(i / 6) + 1;
                          const col = i % 6;
                          return (
                            <div key={i} className="bg-card px-4 py-2.5 text-sm font-mono text-foreground/60 truncate border-t border-border/30">
                              {col === 0 ? row : col === 1 ? '15/01' : col === 2 ? 'Paris 15e' : col === 3 ? 'Versailles' : col === 4 ? '42 km' : '20,58 €'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats Card */}
                  <div className="relative bg-card rounded-2xl p-8 shadow-lg border border-border z-10 mt-32">
                    <div className="text-center">
                      <div className="text-6xl font-bold text-destructive mb-2">2h+</div>
                      <p className="text-muted-foreground">perdues par semaine en moyenne sur la gestion des IK</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="py-20 px-4" aria-labelledby="solution-heading">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <AnimatedSection delay={200} className="order-2 md:order-1">
                <div className="relative bg-card rounded-2xl p-8 shadow-lg border border-border">
                  <div className="text-center mb-6">
                    <div className="text-6xl font-bold text-success mb-2">5 min</div>
                    <p className="text-muted-foreground">par client et par mois avec IKtracker</p>
                  </div>
                  <div className="pt-6 border-t border-border">
                    <ul className="space-y-3">
                      {solutions.map((item, index) => (
                        <li key={index} className="flex items-center gap-3 text-foreground">
                          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AnimatedSection>
              <AnimatedSection className="order-1 md:order-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
                  <CheckCircle2 className="h-4 w-4" />
                  La solution
                </div>
                <h2 id="solution-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  IKtracker{" "}
                  <span className="text-success">standardise</span>{" "}
                  les exports de vos clients
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Recommandez IKtracker à vos clients indépendants. Ils saisissent leurs trajets 
                  facilement via l'application mobile, et vous recevez des exports <strong>PDF et CSV 
                  formatés</strong> prêts à intégrer dans votre logiciel comptable.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/#auth-section">
                    <Button variant="gradient" className="group">
                      Essayer gratuitement
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-20 px-4 bg-muted/30" aria-labelledby="benefits-heading">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <h2 id="benefits-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Pourquoi recommander IKtracker ?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Un outil pensé pour simplifier la vie des indépendants ET de leurs experts-comptables.
              </p>
            </AnimatedSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => (
                <AnimatedSection key={index} delay={index * 100}>
                  <Card className={cn(
                    "h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                    benefit.highlight && "border-primary/50 bg-primary/5"
                  )}>
                    <CardContent className="p-6">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                        benefit.highlight ? "bg-primary/20" : "bg-primary/10"
                      )}>
                        <benefit.icon className={cn(
                          "h-6 w-6",
                          benefit.highlight ? "text-primary" : "text-primary"
                        )} />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Confidentiality Section */}
        <section className="py-20 px-4" aria-labelledby="security-heading">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <AnimatedSection className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <Lock className="h-4 w-4" />
                  Sécurité & Confidentialité
                </div>
                <h2 id="security-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Des données protégées et confidentielles
                </h2>
                <p className="text-lg text-muted-foreground">
                  La sécurité des données de vos clients est notre priorité absolue.
                </p>
              </AnimatedSection>

              <div className="grid md:grid-cols-2 gap-6">
                <AnimatedSection>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <Shield className="h-8 w-8 text-primary mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Hébergement européen</h3>
                      <p className="text-muted-foreground">
                        Toutes les données sont hébergées en Europe sur des serveurs sécurisés. 
                        Conformité totale avec le RGPD.
                      </p>
                    </CardContent>
                  </Card>
                </AnimatedSection>
                <AnimatedSection delay={100}>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <Lock className="h-8 w-8 text-primary mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Chiffrement des données</h3>
                      <p className="text-muted-foreground">
                        Données chiffrées en transit et au repos. Authentification sécurisée 
                        pour chaque utilisateur.
                      </p>
                    </CardContent>
                  </Card>
                </AnimatedSection>
                <AnimatedSection delay={200}>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <Users className="h-8 w-8 text-primary mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Aucun partage de données</h3>
                      <p className="text-muted-foreground">
                        Les données de vos clients ne sont jamais partagées avec des tiers. 
                        Pas de revente, pas de publicité.
                      </p>
                    </CardContent>
                  </Card>
                </AnimatedSection>
                <AnimatedSection delay={300}>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <Building2 className="h-8 w-8 text-primary mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Solution française</h3>
                      <p className="text-muted-foreground">
                        Développée en France par une équipe française. Support en français. 
                        Adapté au barème fiscal français.
                      </p>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4 bg-muted/30" aria-labelledby="testimonials-heading">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ils recommandent IKtracker à leurs clients
              </h2>
              <p className="text-lg text-muted-foreground">
                Des cabinets comptables partout en France utilisent déjà IKtracker.
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <AnimatedSection key={index} delay={index * 100}>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                          {testimonial.initials}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                        </div>
                      </div>
                      <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4" aria-labelledby="cta-heading">
          <div className="container mx-auto">
            <AnimatedSection>
              <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 rounded-3xl p-12 border border-primary/20">
                <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Recommandez IKtracker à vos clients
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Outil 100% gratuit, sans engagement. Vos clients gagnent du temps, 
                  vous recevez des exports propres et standardisés.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link to="/#auth-section">
                    <Button size="xl" variant="gradient" className="group">
                      Créer un compte gratuit
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/install">
                    <Button size="xl" variant="outline">
                      <Download className="h-5 w-5 mr-2" />
                      Guide d'installation
                    </Button>
                  </Link>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-muted/30">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="IKtracker" className="h-8 w-8" />
              <span className="font-bold text-foreground">IKtracker</span>
              <span className="text-muted-foreground">• Solution française gratuite</span>
            </div>
            <nav className="flex flex-wrap gap-6 text-sm text-muted-foreground" aria-label="Liens footer">
              <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
              <Link to="/install" className="hover:text-foreground transition-colors">Installation</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Confidentialité</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">CGU</Link>
            </nav>
          </div>
          <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} IKtracker. Application gratuite de gestion des indemnités kilométriques pour indépendants et experts-comptables en France.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ExpertComptable;
