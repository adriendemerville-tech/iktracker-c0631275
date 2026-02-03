import { lazy, Suspense, memo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { useMarketingTracker } from "@/hooks/useMarketingTracker";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthLazy } from "@/hooks/useAuthLazy";
import { 
  ArrowRight, 
  CheckCircle2,
  XCircle,
  Minus,
  Zap,
  Globe,
  Smartphone,
  MapPin,
  Calculator,
  FileText,
  Shield,
  Languages
} from "lucide-react";

const EnhancedMarketingFooter = lazy(() => import("@/components/marketing/EnhancedMarketingFooter").then(m => ({ default: m.EnhancedMarketingFooter })));

const FooterPlaceholder = memo(() => (
  <div className="h-64 bg-muted/30 animate-pulse" />
));

const ComparatifDriversNote = () => {
  const { user, loading } = useAuthLazy();
  const { trackCTAClick } = useMarketingTracker('comparatif-drivers-note');

  const comparisonData = [
    { feature: "Prix", iktracker: "100% gratuit, illimité", driversNote: "Freemium / Abonnement", ikIcon: CheckCircle2, dnIcon: Minus },
    { feature: "Barème fiscal français 2026", iktracker: "Intégré nativement", driversNote: "Multi-pays, config manuelle", ikIcon: CheckCircle2, dnIcon: Minus },
    { feature: "Langue interface", iktracker: "Français natif", driversNote: "Anglais (traduction FR partielle)", ikIcon: CheckCircle2, dnIcon: Minus },
    { feature: "Mode Tournée multi-stops", iktracker: "Oui, optimisé IDEL/artisans", driversNote: "Non", ikIcon: CheckCircle2, dnIcon: XCircle },
    { feature: "Synchronisation calendrier FR", iktracker: "Google & Outlook", driversNote: "Intégrations tierces payantes", ikIcon: CheckCircle2, dnIcon: Minus },
    { feature: "Support URSSAF/impots.gouv", iktracker: "Documentation française", driversNote: "Support international", ikIcon: CheckCircle2, dnIcon: Minus },
    { feature: "Application", iktracker: "PWA (iOS/Android/Desktop)", driversNote: "App native", ikIcon: CheckCircle2, dnIcon: CheckCircle2 },
    { feature: "Export PDF français", iktracker: "Conforme comptabilité FR", driversNote: "Format international", ikIcon: CheckCircle2, dnIcon: Minus },
    { feature: "Hébergement données", iktracker: "Europe (RGPD)", driversNote: "International", ikIcon: CheckCircle2, dnIcon: Minus },
    { feature: "Véhicule électrique (+20%)", iktracker: "Majoration automatique", driversNote: "Non applicable", ikIcon: CheckCircle2, dnIcon: XCircle },
  ];

  return (
    <>
      <Helmet>
        <title>IKtracker vs Drivers Note : Comparatif Applications IK France 2026 | IKtracker</title>
        <meta 
          name="description" 
          content="Comparatif IKtracker vs Drivers Note : quelle application pour le calcul des indemnités kilométriques en France ? Barème 2026, mode tournée, prix, fonctionnalités." 
        />
        <meta name="keywords" content="drivers note alternative, drivers note france, application frais kilométriques, mileage tracker france, iktracker vs drivers note, carnet de bord numérique" />
        <link rel="canonical" href="https://iktracker.fr/comparatif-drivers-note" />
        <meta property="og:title" content="IKtracker vs Drivers Note : Comparatif 2026" />
        <meta property="og:description" content="Comparatif IKtracker vs Drivers Note pour le calcul des indemnités kilométriques en France." />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:url" content="https://iktracker.fr/comparatif-drivers-note" />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="IKtracker vs Drivers Note : Comparatif 2026" />
        <meta name="twitter:description" content="Comparatif IKtracker vs Drivers Note pour le calcul des IK en France." />
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="France" />
        <meta name="language" content="fr" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "IKtracker vs Drivers Note : Comparatif Complet 2026",
            "description": "Comparatif détaillé entre IKtracker et Drivers Note pour le calcul des indemnités kilométriques en France.",
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
            "mainEntityOfPage": "https://iktracker.fr/comparatif-drivers-note",
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
                  <Globe className="h-4 w-4" />
                  Comparatif France 2026
                </div>
                <h1 id="hero-heading" className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-6">
                  IKtracker vs Drivers Note :<br />
                  <span className="text-gradient">le match franco-international</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  <strong>Drivers Note</strong> est une application internationale de suivi kilométrique, 
                  mais est-elle adaptée au marché français et au <strong>barème fiscal 2026</strong> ? 
                  Comparons avec <strong>IKtracker</strong>, l'outil 100% français et gratuit.
                </p>
              </div>
            </div>
          </section>

          {/* Introduction Section */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="max-w-none space-y-6">
                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Drivers Note : un outil international face aux spécificités françaises
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Drivers Note (anciennement connu sous différents noms) est une application de suivi kilométrique 
                  populaire à l'international, notamment dans les pays anglo-saxons. Elle propose un suivi GPS des 
                  trajets et la génération de rapports pour les déclarations fiscales. Cependant, le système fiscal 
                  français possède ses propres spécificités, notamment le{" "}
                  <Link to="/bareme-ik-2026" className="text-primary underline hover:text-primary/80">barème kilométrique officiel</Link>{" "}
                  publié chaque année par l'{" "}
                  <a 
                    href="https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/indemnites-kilometriques.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    URSSAF
                  </a>.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  IKtracker a été conçu <strong className="text-foreground">spécifiquement pour le marché français</strong>. L'interface est 
                  entièrement en français, le barème fiscal est intégré nativement, et les exports sont conformes 
                  aux exigences de la comptabilité française. Cette différence d'approche impacte directement 
                  l'expérience utilisateur et la conformité fiscale.
                </p>

                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Le barème kilométrique français : une complexité ignorée par les apps internationales
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Le calcul des <strong className="text-foreground">indemnités kilométriques</strong> en France suit un barème progressif 
                  basé sur la puissance fiscale du véhicule (CV) et le nombre de kilomètres parcourus. Ce système, 
                  détaillé sur{" "}
                  <a 
                    href="https://www.impots.gouv.fr/simulateur-bareme-kilometrique" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    impots.gouv.fr
                  </a>, comprend trois tranches (jusqu'à 5 000 km, de 5 001 à 20 000 km, au-delà de 20 000 km) 
                  avec des coefficients spécifiques. De plus, depuis 2021, les véhicules 100% électriques 
                  bénéficient d'une <strong className="text-foreground">majoration de 20%</strong>. Ces subtilités ne sont pas gérées 
                  nativement par Drivers Note.
                </p>
              </div>
            </div>
          </section>

          {/* Comparison Table */}
          <section className="py-12 px-4 bg-muted/30">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Tableau comparatif IKtracker vs Drivers Note
              </h2>
              
              <Card className="overflow-hidden border-primary/20">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Critère</TableHead>
                        <TableHead className="font-semibold text-center bg-primary/10">
                          <div className="flex items-center justify-center gap-2">
                            <img src="/logo-iktracker-250.webp" alt="IKtracker" className="h-6 w-6" />
                            IKtracker
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-center">Drivers Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.map((row, index) => (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{row.feature}</TableCell>
                          <TableCell className="text-center bg-primary/5">
                            <div className="flex items-center justify-center gap-2">
                              <row.ikIcon className={`h-5 w-5 ${row.ikIcon === CheckCircle2 ? 'text-success' : row.ikIcon === XCircle ? 'text-destructive' : 'text-muted-foreground'}`} />
                              <span className="text-sm">{row.iktracker}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <row.dnIcon className={`h-5 w-5 ${row.dnIcon === CheckCircle2 ? 'text-success' : row.dnIcon === XCircle ? 'text-destructive' : 'text-muted-foreground'}`} />
                              <span className="text-sm">{row.driversNote}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-2xl text-center">
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-4">
                    L'alternative française et gratuite
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Pourquoi utiliser un outil international quand une solution française, 
                    gratuite et parfaitement adaptée à vos besoins existe ? 
                    IKtracker respecte le barème fiscal français et simplifie votre comptabilité.
                  </p>
                  <Link to="/signup" onClick={trackCTAClick}>
                    <Button variant="gradient" size="lg" className="gap-2">
                      Démarrer gratuitement
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Detailed Features Section */}
          <section className="py-12 px-4 bg-muted/30">
            <div className="container mx-auto max-w-4xl">
              <div className="max-w-none space-y-6">
                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Une interface pensée pour les professionnels français
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  L'interface d'IKtracker est conçue pour les usages professionnels français. 
                  Les termes utilisés correspondent aux réalités fiscales hexagonales : 
                  "puissance fiscale", "indemnités kilométriques", "barème IK", etc. 
                  Drivers Note, étant une application internationale, utilise des termes génériques 
                  ("mileage", "reimbursement rate") qui peuvent prêter à confusion lors de la 
                  déclaration fiscale française.
                </p>

                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Le mode Tournée : indispensable pour les IDEL et artisans
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Les <Link to="/blog/indemnites-kilometriques-infirmier-liberal" className="text-primary underline hover:text-primary/80">infirmiers libéraux</Link>, 
                  les <Link to="/blog/indemnites-kilometriques-kinesitherapeute" className="text-primary underline hover:text-primary/80">kinésithérapeutes</Link> et 
                  les <Link to="/blog/indemnites-kilometriques-artisan-batiment" className="text-primary underline hover:text-primary/80">artisans</Link> effectuent 
                  quotidiennement des tournées avec de multiples arrêts. Le{" "}
                  <Link to="/mode-tournee" className="text-primary underline hover:text-primary/80">mode Tournée d'IKtracker</Link>{" "}
                  permet d'enregistrer tous ces arrêts en une seule session, avec calcul automatique 
                  des distances entre chaque point. Cette fonctionnalité n'existe pas dans Drivers Note.
                </p>

                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Synchronisation calendrier : l'automatisation au service des indépendants
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Combien de temps perdez-vous à saisir manuellement vos trajets ? Avec la{" "}
                  <Link to="/calendrier" className="text-primary underline hover:text-primary/80">synchronisation calendrier</Link>{" "}
                  d'IKtracker, vos rendez-vous Google Calendar ou Outlook sont automatiquement 
                  convertis en trajets avec calcul des distances. Les{" "}
                  <Link to="/blog/indemnites-kilometriques-consultant-independant" className="text-primary underline hover:text-primary/80">consultants indépendants</Link>{" "}
                  et les <Link to="/blog/indemnites-kilometriques-agent-immobilier" className="text-primary underline hover:text-primary/80">agents immobiliers</Link>{" "}
                  apprécient particulièrement cette fonctionnalité qui leur fait gagner plusieurs 
                  heures par mois.
                </p>

                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Exports conformes à la comptabilité française
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Les experts-comptables français ont des exigences spécifiques en matière de 
                  justificatifs de frais kilométriques. IKtracker génère des{" "}
                  <Link to="/expert-comptable" className="text-primary underline hover:text-primary/80">exports PDF et CSV</Link>{" "}
                  conformes aux attentes de l'administration fiscale française, avec toutes les 
                  informations requises : dates, adresses, distances, véhicule utilisé, montant IK 
                  selon le barème officiel. Les rapports internationaux de Drivers Note peuvent 
                  nécessiter des adaptations manuelles.
                </p>

                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  RGPD et hébergement européen
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  La protection des données est un enjeu majeur. IKtracker héberge toutes les 
                  données en Europe et respecte strictement le RGPD. Notre{" "}
                  <Link to="/privacy" className="text-primary underline hover:text-primary/80">politique de confidentialité</Link>{" "}
                  détaille nos engagements. Les données de géolocalisation sont chiffrées et 
                  jamais partagées avec des tiers. Pour une application internationale comme 
                  Drivers Note, la localisation des serveurs et la conformité RGPD peuvent 
                  varier selon les régions.
                </p>
              </div>
            </div>
          </section>

          {/* Conclusion */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="max-w-none space-y-6">
                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Conclusion : IKtracker, le choix évident pour les professionnels français
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Si vous exercez votre activité en France et devez déclarer vos{" "}
                  <Link to="/frais-reels" className="text-primary underline hover:text-primary/80">frais réels</Link>, 
                  IKtracker s'impose comme la solution la plus adaptée. Conçu spécifiquement pour le marché français, 
                  il intègre nativement le barème fiscal 2026, propose des fonctionnalités uniques comme le mode Tournée 
                  et la synchronisation calendrier, et reste <strong className="text-foreground">100% gratuit sans aucune limitation</strong>.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Drivers Note peut convenir aux professionnels travaillant à l'international, 
                  mais pour une utilisation exclusivement française, IKtracker offre une expérience 
                  plus fluide et une conformité fiscale garantie. Consultez notre{" "}
                  <Link to="/lexique" className="text-primary underline hover:text-primary/80">lexique des indemnités kilométriques</Link>{" "}
                  pour maîtriser le vocabulaire fiscal.
                </p>
              </div>

              <div className="mt-8 text-center">
                <Link to="/signup" onClick={trackCTAClick}>
                  <Button variant="gradient" size="lg" className="gap-2">
                    Créer mon compte IKtracker
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground mt-4">
                  Gratuit • Français • Conforme au barème fiscal 2026
                </p>
              </div>
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

export default ComparatifDriversNote;
