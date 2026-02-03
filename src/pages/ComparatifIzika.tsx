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
  Euro,
  Smartphone,
  MapPin,
  Calendar,
  FileText,
  Shield
} from "lucide-react";

const EnhancedMarketingFooter = lazy(() => import("@/components/marketing/EnhancedMarketingFooter").then(m => ({ default: m.EnhancedMarketingFooter })));

const FooterPlaceholder = memo(() => (
  <div className="h-64 bg-muted/30 animate-pulse" />
));

const ComparatifIzika = () => {
  const { user, loading } = useAuthLazy();
  const { trackCTAClick } = useMarketingTracker('comparatif-izika');

  const comparisonData = [
    { feature: "Prix", iktracker: "100% gratuit, illimité", izika: "Freemium (limité) / Payant", ikIcon: CheckCircle2, izIcon: Minus },
    { feature: "Barème fiscal 2026", iktracker: "Intégré automatiquement", izika: "Mise à jour manuelle", ikIcon: CheckCircle2, izIcon: Minus },
    { feature: "Mode Tournée GPS", iktracker: "Oui, multi-stops", izika: "Non disponible", ikIcon: CheckCircle2, izIcon: XCircle },
    { feature: "Synchronisation calendrier", iktracker: "Google & Outlook", izika: "Non disponible", ikIcon: CheckCircle2, izIcon: XCircle },
    { feature: "Application PWA", iktracker: "Installable iOS/Android", izika: "Application native", ikIcon: CheckCircle2, izIcon: CheckCircle2 },
    { feature: "Export PDF/CSV", iktracker: "Illimité et gratuit", izika: "Limité en version gratuite", ikIcon: CheckCircle2, izIcon: Minus },
    { feature: "Véhicule électrique (+20%)", iktracker: "Majoration automatique", izika: "Manuel", ikIcon: CheckCircle2, izIcon: Minus },
    { feature: "Hébergement données", iktracker: "Europe (RGPD)", izika: "Non précisé", ikIcon: CheckCircle2, izIcon: Minus },
    { feature: "Calcul hors-ligne", iktracker: "Oui", izika: "Non", ikIcon: CheckCircle2, izIcon: XCircle },
  ];

  return (
    <>
      <Helmet>
        <title>IKtracker vs Izika : Comparatif Complet des Applications IK 2026 | IKtracker</title>
        <meta 
          name="description" 
          content="Comparatif détaillé IKtracker vs Izika : fonctionnalités, prix, barème 2026, mode tournée, synchronisation calendrier. Découvrez la meilleure alternative gratuite à Izika." 
        />
        <meta name="keywords" content="izika alternative, izika gratuit, comparatif izika, application indemnités kilométriques, izika vs iktracker, izika avis, meilleure app ik" />
        <link rel="canonical" href="https://iktracker.fr/comparatif-izika" />
        <meta property="og:title" content="IKtracker vs Izika : Comparatif 2026" />
        <meta property="og:description" content="Comparatif détaillé IKtracker vs Izika : fonctionnalités, prix, barème 2026. Découvrez la meilleure alternative gratuite." />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:url" content="https://iktracker.fr/comparatif-izika" />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="IKtracker vs Izika : Comparatif 2026" />
        <meta name="twitter:description" content="Comparatif détaillé IKtracker vs Izika : fonctionnalités, prix, barème 2026." />
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="France" />
        <meta name="language" content="fr" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "IKtracker vs Izika : Comparatif Complet 2026",
            "description": "Comparatif détaillé entre IKtracker et Izika pour le calcul des indemnités kilométriques.",
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
                  Comparatif 2026
                </div>
                <h1 id="hero-heading" className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-6">
                  IKtracker vs Izika :<br />
                  <span className="text-gradient">quelle application choisir ?</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Vous cherchez une <strong>alternative à Izika</strong> pour gérer vos indemnités kilométriques ? 
                  Découvrez notre comparatif complet entre <strong>IKtracker</strong> et <strong>Izika</strong>, 
                  deux solutions populaires en France pour le suivi des frais kilométriques professionnels.
                </p>
              </div>
            </div>
          </section>

          {/* Introduction Section */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="max-w-none space-y-6">
                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Pourquoi comparer IKtracker et Izika ?
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Les <strong className="text-foreground">indemnités kilométriques</strong> représentent un enjeu fiscal majeur pour les professionnels 
                  qui utilisent leur véhicule personnel à des fins professionnelles. Selon les données de l'{" "}
                  <a 
                    href="https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/indemnites-kilometriques.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    URSSAF
                  </a>, le barème kilométrique permet de déduire les frais réels de déplacement lors de la déclaration d'impôts. 
                  Pour un infirmier libéral parcourant 25 000 km par an avec un véhicule de 5 CV, cela représente 
                  plus de <strong className="text-foreground">6 500 € d'indemnités</strong> déclarables.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Izika et IKtracker sont deux applications françaises dédiées à ce calcul. Cependant, leurs approches 
                  diffèrent significativement en termes de <strong className="text-foreground">tarification</strong>, de <strong className="text-foreground">fonctionnalités</strong>{" "}
                  et d'<strong className="text-foreground">expérience utilisateur</strong>. Ce comparatif vous aidera à faire le bon choix selon 
                  votre profil professionnel.
                </p>

                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Le modèle économique : gratuit vs freemium
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  La différence fondamentale entre les deux applications réside dans leur modèle économique.{" "}
                  <strong className="text-foreground">IKtracker est 100% gratuit</strong>, sans limitation de trajets, d'exports ou de véhicules. 
                  Izika propose un modèle freemium avec une version gratuite limitée et des options payantes pour 
                  débloquer toutes les fonctionnalités. Pour les professionnels effectuant de nombreux déplacements, 
                  comme les <Link to="/blog/indemnites-kilometriques-commercial-itinerant" className="text-primary underline hover:text-primary/80">commerciaux itinérants</Link> ou 
                  les <Link to="/blog/indemnites-kilometriques-infirmier-liberal" className="text-primary underline hover:text-primary/80">infirmiers libéraux</Link>, 
                  cette différence peut représenter une économie significative.
                </p>
              </div>
            </div>
          </section>

          {/* Comparison Table */}
          <section className="py-12 px-4 bg-muted/30">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Tableau comparatif IKtracker vs Izika
              </h2>
              
              <Card className="overflow-hidden border-primary/20">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Fonctionnalité</TableHead>
                        <TableHead className="font-semibold text-center bg-primary/10">
                          <div className="flex items-center justify-center gap-2">
                            <img src="/logo-iktracker-250.webp" alt="IKtracker" className="h-6 w-6" />
                            IKtracker
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-center">Izika</TableHead>
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
                              <row.izIcon className={`h-5 w-5 ${row.izIcon === CheckCircle2 ? 'text-success' : row.izIcon === XCircle ? 'text-destructive' : 'text-muted-foreground'}`} />
                              <span className="text-sm">{row.izika}</span>
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
                    Prêt à essayer l'alternative gratuite ?
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Créez votre compte IKtracker en 30 secondes et commencez à enregistrer vos trajets professionnels. 
                    Aucune carte bancaire requise, accès illimité à toutes les fonctionnalités.
                  </p>
                  <Link to="/signup" onClick={trackCTAClick}>
                    <Button variant="gradient" size="lg" className="gap-2">
                      Créer mon compte gratuit
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
                  Le mode Tournée : une exclusivité IKtracker
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  L'une des fonctionnalités les plus demandées par les professionnels de santé et les artisans 
                  est le <Link to="/mode-tournee" className="text-primary underline hover:text-primary/80">mode Tournée</Link>. 
                  Cette fonction permet d'enregistrer plusieurs arrêts successifs lors d'une journée de travail, 
                  avec calcul automatique des distances entre chaque point. C'est particulièrement utile pour les 
                  <Link to="/blog/indemnites-kilometriques-kinesitherapeute" className="text-primary underline hover:text-primary/80"> kinésithérapeutes à domicile</Link> ou 
                  les <Link to="/blog/indemnites-kilometriques-artisan-batiment" className="text-primary underline hover:text-primary/80">artisans du bâtiment</Link>{" "}
                  qui visitent plusieurs clients par jour. Cette fonctionnalité n'est pas disponible sur Izika.
                </p>

                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Synchronisation calendrier : gagnez du temps
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  IKtracker propose une <Link to="/calendrier" className="text-primary underline hover:text-primary/80">synchronisation avec Google Calendar et Outlook</Link>. 
                  Vos rendez-vous professionnels sont automatiquement importés et convertis en trajets avec calcul des distances. 
                  Cette automatisation peut faire gagner plusieurs heures par mois aux professionnels très mobiles. 
                  Izika ne propose pas cette intégration calendrier.
                </p>

                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Conformité fiscale et barème 2026
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Les deux applications intègrent le <Link to="/bareme-ik-2026" className="text-primary underline hover:text-primary/80">barème kilométrique 2026</Link> officiel 
                  publié par l'administration fiscale. Cependant, IKtracker met automatiquement à jour les taux dès leur publication 
                  officielle sur{" "}
                  <a 
                    href="https://www.impots.gouv.fr/simulateur-bareme-kilometrique" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    impots.gouv.fr
                  </a>, garantissant des calculs toujours conformes. La majoration de 20% pour les véhicules 100% électriques 
                  est également appliquée automatiquement.
                </p>

                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Protection des données et RGPD
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  IKtracker héberge toutes les données en Europe et respecte strictement le RGPD. 
                  Vous pouvez consulter notre <Link to="/privacy" className="text-primary underline hover:text-primary/80">politique de confidentialité</Link> pour 
                  plus de détails. Les données de géolocalisation sont chiffrées et ne sont jamais partagées avec des tiers. 
                  Pour Izika, les informations sur l'hébergement des données ne sont pas clairement communiquées.
                </p>

                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Disponibilité et installation
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Les deux solutions sont disponibles sur smartphone. Izika propose une application native téléchargeable 
                  sur les stores. IKtracker fonctionne comme une <Link to="/install" className="text-primary underline hover:text-primary/80">Progressive Web App (PWA)</Link>, 
                  installable directement depuis le navigateur sur iPhone et Android. L'avantage de la PWA : pas besoin 
                  de passer par les stores, mises à jour automatiques et fonctionnement hors-ligne.
                </p>
              </div>
            </div>
          </section>

          {/* Conclusion */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="max-w-none space-y-6">
                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Notre verdict : quelle application choisir en 2026 ?
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Si vous cherchez une solution <strong className="text-foreground">complète et gratuite</strong> pour gérer vos indemnités kilométriques, 
                  IKtracker s'impose comme l'alternative idéale à Izika. Avec ses fonctionnalités exclusives (mode Tournée, 
                  synchronisation calendrier, calcul hors-ligne), son respect du RGPD et son accès 100% gratuit sans limitation, 
                  IKtracker répond aux besoins des professionnels les plus exigeants.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Pour approfondir le sujet des frais kilométriques, consultez notre{" "}
                  <Link to="/frais-reels" className="text-primary underline hover:text-primary/80">guide complet sur les frais réels</Link>{" "}
                  ou explorez notre{" "}
                  <Link to="/lexique" className="text-primary underline hover:text-primary/80">lexique des indemnités kilométriques</Link>.
                </p>
              </div>

              <div className="mt-8 text-center">
                <Link to="/signup" onClick={trackCTAClick}>
                  <Button variant="gradient" size="lg" className="gap-2">
                    Essayer IKtracker gratuitement
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground mt-4">
                  Aucune carte bancaire requise • Installation en 2 minutes
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

export default ComparatifIzika;
