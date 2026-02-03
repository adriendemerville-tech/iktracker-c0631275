import { lazy, Suspense, memo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { useMarketingTracker } from "@/hooks/useMarketingTracker";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuthLazy } from "@/hooks/useAuthLazy";
import { 
  ArrowRight, 
  CheckCircle2,
  Zap,
  HelpCircle,
  Minus
} from "lucide-react";

const EnhancedMarketingFooter = lazy(() => import("@/components/marketing/EnhancedMarketingFooter").then(m => ({ default: m.EnhancedMarketingFooter })));

const FooterPlaceholder = memo(() => (
  <div className="h-64 bg-muted/30 animate-pulse" />
));

const ComparatifIzika = () => {
  const { user, loading } = useAuthLazy();
  const { trackCTAClick } = useMarketingTracker('comparatif-izika');

  const comparisonData = [
    { feature: "Application", izika: true, iktracker: "pwa", isPwa: true },
    { feature: "Synchronisation Google/Outlook", izika: true, iktracker: true },
    { feature: "Calcul distance Google Maps", izika: true, iktracker: true },
    { feature: "Conformité Fiscale 2026", izika: true, iktracker: true },
    { feature: "Export PDF/Excel Expert-Comptable", izika: true, iktracker: true },
    { feature: "Gestion Tournées (Infirmiers)", izika: true, iktracker: true },
    { feature: "Prix (Indépendant)", izika: "~10-20€/mois", iktracker: "0€", highlight: true },
    { feature: "Publicité", izika: "Non", iktracker: "Non (0 Pubs)" },
    { feature: "Données personnelles", izika: "Hébergées France", iktracker: "Hébergées France" },
  ];

  return (
    <>
      <Helmet>
        <title>Izika vs IKtracker : Le Comparatif 2026 (Alternative Gratuite)</title>
        <meta 
          name="description" 
          content="Pourquoi payer un abonnement Izika ? Découvrez IKtracker, l'alternative 100% gratuite qui synchronise votre agenda et génère vos rapports fiscaux conformes." 
        />
        <meta name="keywords" content="izika alternative, izika gratuit, alternative izika 2026, izika vs iktracker, application indemnités kilométriques gratuite, izika prix" />
        <link rel="canonical" href="https://iktracker.fr/comparatif-izika" />
        <meta property="og:title" content="Izika vs IKtracker : Le Comparatif 2026 (Alternative Gratuite)" />
        <meta property="og:description" content="Pourquoi payer un abonnement Izika ? Découvrez IKtracker, l'alternative 100% gratuite." />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:url" content="https://iktracker.fr/comparatif-izika" />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Izika vs IKtracker : Comparatif 2026" />
        <meta name="twitter:description" content="L'alternative gratuite à Izika pour vos indemnités kilométriques." />
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="France" />
        <meta name="language" content="fr" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Alternative Izika 2026 : Comparatif avec IKtracker",
            "description": "Comparatif détaillé entre Izika et IKtracker pour le calcul des indemnités kilométriques.",
            "author": {
              "@type": "Person",
              "name": "Adrien de Volontat",
              "url": "https://iktracker.fr/blog/auteur/adrien-de-volontat"
            },
            "publisher": {
              "@type": "Organization",
              "name": "IKtracker",
              "logo": {
                "@type": "ImageObject",
                "url": "https://iktracker.fr/logo-iktracker-250.webp"
              }
            },
            "datePublished": "2026-02-03",
            "dateModified": "2026-02-03",
            "mainEntityOfPage": "https://iktracker.fr/comparatif-izika",
            "inLanguage": "fr-FR"
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background font-display select-text">
        <MarketingNav user={user} loading={loading} />

        <main id="main-content" tabIndex={-1} className="outline-none">
          {/* Hero Section */}
          <section className="pt-24 pb-12 md:pt-28 md:pb-16 px-4 relative overflow-hidden" aria-labelledby="hero-heading">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <div className="container mx-auto relative z-10 max-w-4xl">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Zap className="h-4 w-4" />
                  Alternative Izika 2026
                </div>
                <h1 id="hero-heading" className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-6">
                  Arrêtez de payer pour vos<br />
                  <span className="text-gradient">Indemnités Kilométriques</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  Le comparatif honnête : <strong className="text-foreground">Izika est excellent</strong>, mais IKtracker fait le même travail{" "}
                  <strong className="text-success font-bold">100% Gratuitement</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* Comparison Table */}
          <section className="py-12 px-4 bg-muted/30">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Izika vs IKtracker : le comparatif fonctionnel
              </h2>
              
              <Card className="overflow-hidden border-primary/20 shadow-lg">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Fonctionnalité</TableHead>
                        <TableHead className="font-semibold text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span>Izika</span>
                            <span className="text-xs text-muted-foreground font-normal">(Payant)</span>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-center bg-primary/10">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2">
                              <img src="/logo-iktracker-250.webp" alt="IKtracker" className="h-5 w-5" />
                              <span>IKtracker</span>
                            </div>
                            <span className="text-xs text-success font-bold">(Gratuit)</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.map((row, index) => (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{row.feature}</TableCell>
                          <TableCell className="text-center">
                            {typeof row.izika === 'boolean' ? (
                              <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <span className="text-sm text-muted-foreground">{row.izika}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center bg-primary/5">
                            {typeof row.iktracker === 'boolean' ? (
                              <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                            ) : row.isPwa ? (
                              <div className="flex flex-col items-center gap-1">
                                <Minus className="h-5 w-5 text-orange-500 mx-auto" />
                                <span className="text-xs text-muted-foreground">PWA (web)</span>
                              </div>
                            ) : row.highlight ? (
                              <span className="text-lg font-bold text-success">{row.iktracker}</span>
                            ) : (
                              <span className="text-sm">{row.iktracker}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <p className="text-center text-sm text-muted-foreground mt-4">
                Sources : sites officiels{" "}
                <a href="https://izika.com" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                  izika.com
                </a>{" "}et{" "}
                <a href="https://iktracker.fr" className="text-primary underline hover:text-primary/80">
                  iktracker.fr
                </a>{" "}— Février 2026
              </p>
            </div>
          </section>

          {/* Mid-page CTA */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-2xl text-center">
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-4">
                    Prêt à économiser chaque mois ?
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Créez votre compte en 30 secondes. Aucune carte bancaire, aucun engagement.
                  </p>
                  <Link to="/signup" onClick={trackCTAClick}>
                    <Button variant="gradient" size="lg" className="gap-2 text-lg px-8 py-6">
                      Commencer mes calculs gratuitement
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Conclusion Section */}
          <section className="py-12 px-4 bg-muted/30">
            <div className="container mx-auto max-w-4xl">
              <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-6">
                Notre avis honnête sur Izika
              </h3>
              <div className="space-y-4 text-base md:text-lg text-muted-foreground leading-relaxed">
                <p>
                  Soyons clairs : <strong className="text-foreground">Izika est une excellente application</strong>. Elle a été pionnière sur le marché français des indemnités kilométriques et a aidé des milliers de professionnels à simplifier leur gestion administrative. L'interface est soignée, le support client réactif, et les fonctionnalités répondent parfaitement aux besoins des indépendants et des entreprises.
                </p>
                <p>
                  Cependant, le modèle économique d'Izika repose sur un abonnement mensuel qui peut représenter un coût non négligeable sur l'année, particulièrement pour les{" "}
                  <Link to="/blog/indemnites-kilometriques-infirmier-liberal" className="text-primary underline hover:text-primary/80">infirmiers libéraux</Link>,{" "}
                  <Link to="/blog/indemnites-kilometriques-artisan-batiment" className="text-primary underline hover:text-primary/80">artisans</Link>{" "}ou{" "}
                  <Link to="/blog/indemnites-kilometriques-commercial-itinerant" className="text-primary underline hover:text-primary/80">commerciaux</Link>{" "}
                  qui débutent leur activité.
                </p>
                <p>
                  <strong className="text-foreground">IKtracker a été créé pour offrir une alternative accessible à tous</strong>. Nous proposons les mêmes fonctionnalités essentielles — synchronisation calendrier, calcul automatique via Google Maps, export conforme au{" "}
                  <Link to="/bareme-ik-2026" className="text-primary underline hover:text-primary/80">barème fiscal 2026</Link>{" "}— sans aucun frais. Notre objectif n'est pas de dénigrer Izika, mais de démocratiser l'accès à ces outils pour tous les professionnels, quel que soit leur budget.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="flex items-center gap-3 mb-6">
                <HelpCircle className="h-6 w-6 text-primary" />
                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4">
                  Question légitime
                </h3>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="why-free" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                    Où est le piège ? Pourquoi IKtracker est gratuit ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    <p>
                      IKtracker a été créé par un développeur indépendant pour son propre usage. Pas d'investisseurs à rembourser, pas de gros frais de structure. C'est un outil communautaire maintenu par passion. Les coûts d'hébergement sont minimes et couverts par le fondateur. Il n'y a pas de publicité, pas de revente de données, et pas d'abonnement caché. C'est aussi simple que ça.
                    </p>
                    <p className="mt-3">
                      Pour en savoir plus, consultez notre{" "}
                      <Link to="/privacy" className="text-primary underline hover:text-primary/80">politique de confidentialité</Link>{" "}
                      et nos{" "}
                      <Link to="/terms" className="text-primary underline hover:text-primary/80">conditions d'utilisation</Link>.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-16 px-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
            <div className="container mx-auto max-w-2xl text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Prêt à simplifier vos IK ?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Rejoignez les professionnels qui économisent du temps et de l'argent avec IKtracker.
              </p>
              <Link to="/signup" onClick={trackCTAClick}>
                <Button variant="gradient" size="lg" className="gap-2 text-xl px-10 py-7 shadow-xl hover:shadow-2xl transition-shadow">
                  Commencer mes calculs gratuitement
                  <ArrowRight className="h-6 w-6" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground mt-6">
                ✓ Aucune carte bancaire requise &nbsp;•&nbsp; ✓ Données hébergées en France &nbsp;•&nbsp; ✓ Support réactif
              </p>
            </div>
          </section>
        </main>

        <Suspense fallback={<FooterPlaceholder />}>
          <EnhancedMarketingFooter />
        </Suspense>
      </div>
    </>
  );
};

export default ComparatifIzika;
