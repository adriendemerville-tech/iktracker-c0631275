import { lazy, Suspense, memo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { buildSoftwareApplicationSchema } from "@/lib/seo-schemas";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { IKSimulator } from "@/components/marketing/IKSimulator";
import { useMarketingTracker } from "@/hooks/useMarketingTracker";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthLazy } from "@/hooks/useAuthLazy";
import { IK_BAREME_2024 } from "@/types/trip";
import { Breadcrumb } from "@/components/Breadcrumb";
import { 
  Calculator, 
  ArrowRight, 
  ExternalLink, 
  TrendingDown, 
  Wallet, 
  Car,
  CheckCircle2,
  Info,
  FileText,
  Users,
  Zap,
  AlertTriangle,
  Fuel,
  Bike
} from "lucide-react";

// FAQ Schema data
const faqData = [
  {
    question: "Quel est le barème kilométrique 2026 ?",
    answer: "Le barème kilométrique 2026 est identique au barème 2024, inchangé pour 2025 et 2026. Il prévoit des taux allant de 0,529 €/km pour un véhicule de 3 CV jusqu'à 5000 km, à 0,401 €/km pour un véhicule de 7 CV et plus au-delà de 20 000 km."
  },
  {
    question: "Comment calculer ses indemnités kilométriques ?",
    answer: "Pour calculer vos IK, multipliez le nombre de kilomètres professionnels parcourus par le taux correspondant à la puissance fiscale de votre véhicule et à votre tranche kilométrique (jusqu'à 5000 km, de 5001 à 20000 km, ou plus de 20000 km)."
  },
  {
    question: "Les véhicules électriques bénéficient-ils d'un avantage ?",
    answer: "Oui, les véhicules 100% électriques bénéficient d'une majoration de 20% sur le barème kilométrique. Cette mesure vise à encourager la transition vers des véhicules moins polluants."
  },
  {
    question: "Quelle différence entre frais réels et indemnités kilométriques ?",
    answer: "Les indemnités kilométriques sont calculées selon un barème forfaitaire qui couvre tous les frais (carburant, entretien, assurance, dépréciation). Les frais réels nécessitent de justifier chaque dépense individuellement avec des factures."
  },
  {
    question: "Dois-je tenir un carnet de bord pour mes trajets professionnels ?",
    answer: "Oui, en cas de contrôle fiscal, vous devez pouvoir justifier vos déplacements professionnels. Un relevé précis (date, motif, destination, distance) est recommandé. IKtracker automatise cette tâche pour vous."
  },
  {
    question: "Pourquoi les indemnités kilométriques sont-elles importantes pour les indépendants ?",
    answer: "Les indépendants supportent seuls tous les frais liés à l'usage de leur véhicule personnel : carburant lourdement taxé (TICPE), assurance, entretien (pneus, freins, vidange) et dépréciation du véhicule (15 à 20 % de perte de valeur la première année). Le barème IK compense forfaitairement l'ensemble de ces coûts et évite une amputation significative du revenu net."
  },
  {
    question: "Combien de kilomètres les utilisateurs d'IKtracker enregistrent-ils ?",
    answer: "Sur la plateforme IKtracker, les utilisateurs les plus mobiles enregistrent jusqu'à 5 900 km par mois. En moyenne, chaque utilisateur cumule environ 4 886 km de trajets professionnels. Le montant maximum d'IK comptabilisé par un seul utilisateur dépasse 58 000 €, avec une moyenne de 2 730 € par utilisateur."
  },
  {
    question: "Que risque-t-on en cas de mauvais suivi de ses trajets professionnels ?",
    answer: "L'administration fiscale exige un relevé détaillé de chaque trajet (date, lieu de départ, destination, distance, motif). En cas de contrôle, l'absence de justificatifs peut entraîner un redressement fiscal portant sur l'ensemble des frais déclarés. Un outil de suivi automatisé comme IKtracker permet de constituer un dossier fiscal solide et conforme aux exigences de l'URSSAF."
  }
];

// Lazy load below-the-fold components to reduce initial bundle
const EnhancedMarketingFooter = lazy(() => import("@/components/marketing/EnhancedMarketingFooter").then(m => ({ default: m.EnhancedMarketingFooter })));
const MarketingPWANotification = lazy(() => import("@/components/marketing/MarketingPWANotification").then(m => ({ default: m.MarketingPWANotification })));

// Placeholder for lazy components
const FooterPlaceholder = memo(() => (
  <div className="min-h-[600px] bg-muted/30 animate-pulse" />
));

const BaremeIK2026 = () => {
  const { user, loading } = useAuthLazy();
  const { trackCTAClick } = useMarketingTracker('bareme-ik');

  return (
    <>
      <Helmet>
        <title>Barème kilométrique 2026 | Simulateur IK URSSAF</title>
        <meta 
          name="description" 
          content="Barème kilométrique 2025 & 2026 officiel URSSAF : tableau IK par CV, simulateur frais kilométrique gratuit et calcul automatique. Majoration véhicule électrique +20%." 
        />
        <meta name="keywords" content="barème kilométrique 2025, barème kilométrique 2026, simulateur frais kilométrique, indemnités kilométriques URSSAF, barème ik 2026, frais kilométrique impot, calcul IK, véhicule électrique IK, majoration 20% électrique" />
        <link rel="canonical" href="https://iktracker.fr/bareme-ik-2026" />
        <meta property="og:title" content="Barème Kilométrique 2026 Officiel - Simulateur IK Gratuit" />
        <meta property="og:description" content="Barème kilométrique 2026 officiel : tableau des indemnités kilométriques par CV, simulateur IK gratuit et calcul automatique." />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:url" content="https://iktracker.fr/bareme-ik-2026" />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Barème Kilométrique 2026 Officiel | IKtracker" />
        <meta name="twitter:description" content="Barème kilométrique 2026 officiel : tableau des indemnités kilométriques par CV, simulateur IK gratuit et calcul automatique." />
        <meta name="twitter:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="France" />
        <meta name="language" content="fr" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Barème Kilométrique 2026 Officiel : guide complet et simulateur",
            "description": "Découvrez le barème kilométrique 2026 officiel. Tableau des taux IK, simulateur gratuit et conseils fiscaux.",
            "author": {
              "@type": "Organization",
              "name": "IKtracker"
            },
            "publisher": {
              "@type": "Organization",
              "name": "IKtracker",
              "logo": {
                "@type": "ImageObject",
                "url": "https://iktracker.fr/logo-iktracker-250.webp"
              }
            },
            "datePublished": "2024-12-01",
            "dateModified": "2026-01-22",
            "mainEntityOfPage": "https://iktracker.fr/bareme-ik-2026",
            "inLanguage": "fr-FR",
            "about": {
              "@type": "Thing",
              "name": "Barème Kilométrique 2026",
              "description": "Barème fiscal officiel pour le calcul des frais de déplacement professionnels"
            }
          })}
        </script>
        {/* FAQ Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqData.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildSoftwareApplicationSchema({ pageUrl: "https://iktracker.fr/bareme-ik-2026", pageDescription: "Barème kilométrique 2026 officiel URSSAF : tableau par CV, simulateur gratuit, majoration +20% véhicule électrique. Outil communautaire gratuit à vie, conçu par un entrepreneur indépendant." }))}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background font-display select-text">
        <MarketingNav user={user} loading={loading} />

        <main id="main-content" tabIndex={-1} className="outline-none">
          {/* Breadcrumb */}
          <div className="container mx-auto px-4 pt-24 md:pt-28">
            <Breadcrumb items={[{ label: 'Barème IK 2026' }]} />
          </div>
          
          {/* Hero Section - NO animations for instant LCP */}
          <section className="pb-12 md:pb-16 px-4 relative overflow-hidden" aria-labelledby="hero-heading">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="container mx-auto relative z-10 max-w-4xl">
            {/* Removed animate-fade-in for instant mobile LCP */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Calculator className="h-4 w-4" />
                Barème fiscal 2026
              </div>
              <h1 id="hero-heading" className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-6">
                Barème des indemnités kilométriques 2026 :<br />
                <span className="text-gradient">calcul et tableau fiscal officiel</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto min-h-[4.5rem] sm:min-h-[3.5rem]">
                Le <strong>barème des indemnités kilométriques 2026</strong> est le barème officiel applicable. 
                Utilisez gratuitement notre simulateur et calculez vos <strong>indemnités kilométriques</strong>.
              </p>
            </div>

            {/* Table of contents */}
            <nav aria-label="Sommaire" className="mt-10 max-w-xl mx-auto">
              <div className="bg-muted/50 border border-border rounded-xl p-5">
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Sommaire</p>
                <ol className="space-y-2 text-sm list-decimal list-inside">
                  <li><a href="#simulateur" className="text-primary hover:underline">Simulateur IK 2026</a></li>
                  <li><a href="#tableau-voitures" className="text-primary hover:underline">Tableaux barème officiel</a></li>
                  <li><a href="#pourquoi-ik" className="text-primary hover:underline">Pourquoi les IK sont indispensables</a></li>
                  <li><a href="#donnees-communaute" className="text-primary hover:underline">Données de la communauté IKtracker</a></li>
                  <li><a href="#vehicules-electriques" className="text-primary hover:underline">Véhicules électriques (+20%)</a></li>
                  <li><a href="#faq" className="text-primary hover:underline">Questions fréquentes</a></li>
                </ol>
              </div>
            </nav>
          </div>
        </section>

        {/* Simulator Section - Moved to top for better visibility */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <IKSimulator
              idSuffix="Bareme"
              trackerPage="bareme-ik"
              title="Simulateur indemnités kilométriques 2026"
              subtitle="Calculez vos indemnités kilométriques 2026 en quelques secondes avec notre simulateur basé sur le barème IK 2026."
            />
          </div>
        </section>

        {/* Forecast Section */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400" id="bareme-officiel">
                  <Info className="h-5 w-5" />
                  Barème IK 2026 : barème officiel des indemnités kilométriques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-foreground">
                <p>
                  <strong>Le barème des indemnités kilométriques 2026 est le barème officiel applicable.</strong> Ces taux, publiés par l'{" "}
                  <a 
                    href="https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/indemnites-kilometriques.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                  >
                    URSSAF
                  </a>, permettent aux contribuables de calculer leurs frais de déplacement professionnels pour leurs déclarations fiscales.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-background rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="font-semibold">Prix du carburant stabilisés</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Depuis 2024, les prix à la pompe se sont stabilisés après les fortes hausses de 2022-2023. Cette accalmie ne justifie pas une revalorisation du barème aux yeux de l'administration fiscale.
                    </p>
                  </div>
                  
                  <div className="bg-background rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <h3 className="font-semibold">Contraintes budgétaires</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Les difficultés budgétaires de l'État n'incitent pas à revaloriser les IK. En effet, des taux plus élevés représenteraient un manque à gagner fiscal significatif pour les finances publiques.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Barème Table Section */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <h2 id="tableau-voitures" className="text-2xl md:text-3xl font-bold mb-4">
                Tableau du barème des indemnités kilométriques 2026
              </h2>
              <p className="text-muted-foreground">
                Voici le <strong>barème des IK 2026</strong> officiel avec les taux par puissance fiscale et kilomètres parcourus.
              </p>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table aria-label="Barème des indemnités kilométriques 2026">
                  <caption className="sr-only">
                    Tableau des taux d'indemnités kilométriques par puissance fiscale et distance parcourue
                  </caption>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead scope="col" className="font-bold">Puissance fiscale (CV)</TableHead>
                      <TableHead scope="col" className="text-center font-bold">Jusqu'à 5 000 km</TableHead>
                      <TableHead scope="col" className="text-center font-bold">De 5 001 à 20 000 km</TableHead>
                      <TableHead scope="col" className="text-center font-bold">Plus de 20 000 km</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {IK_BAREME_2024.map((row, index) => (
                      <TableRow key={row.cv} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <TableCell scope="row" className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-primary" aria-hidden="true" />
                            {row.cv === "7+" ? "7 CV et plus" : `${row.cv} CV`}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                            d × {row.upTo5000.rate.toFixed(3)} €
                          </code>
                        </TableCell>
                        <TableCell className="text-center">
                          <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                            (d × {row.from5001To20000.rate.toFixed(3)}) + {row.from5001To20000.fixed} €
                          </code>
                        </TableCell>
                        <TableCell className="text-center">
                          <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                            d × {row.over20000.rate.toFixed(3)} €
                          </code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground text-center mt-4">
              <strong>d</strong> = distance parcourue en kilomètres sur l'année
            </p>

            {/* Moto Table */}
            <div className="text-center mb-8 mt-16">
              <h2 id="tableau-motos" className="text-2xl md:text-3xl font-bold mb-4">
                Barème kilométrique 2026 pour motos thermiques (&gt; 50 cm³)
              </h2>
              <p className="text-muted-foreground">
                Voici le <strong>barème des IK 2026 pour les motos</strong> de plus de 50 cm³.
              </p>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table aria-label="Barème des indemnités kilométriques 2026 pour motos">
                  <caption className="sr-only">
                    Tableau des taux d'indemnités kilométriques pour motos par puissance fiscale et distance parcourue
                  </caption>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead scope="col" className="font-bold">Puissance</TableHead>
                      <TableHead scope="col" className="text-center font-bold">Jusqu'à 3 000 km</TableHead>
                      <TableHead scope="col" className="text-center font-bold">De 3 001 à 6 000 km</TableHead>
                      <TableHead scope="col" className="text-center font-bold">Au-delà de 6 000 km</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-background">
                      <TableCell scope="row" className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-primary" aria-hidden="true" />
                          1 ou 2 CV
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          d × 0,395 €
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          (d × 0,099) + 891 €
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          d × 0,248 €
                        </code>
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/20">
                      <TableCell scope="row" className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-primary" aria-hidden="true" />
                          3, 4, 5 CV
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          d × 0,468 €
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          (d × 0,082) + 1 158 €
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          d × 0,275 €
                        </code>
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-background">
                      <TableCell scope="row" className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-primary" aria-hidden="true" />
                          Plus de 5 CV
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          d × 0,606 €
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          (d × 0,079) + 1 583 €
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          d × 0,343 €
                        </code>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground text-center mt-4">
              <strong>d</strong> = distance parcourue en kilomètres sur l'année
            </p>

            {/* Cyclomoteur Table */}
            <div className="text-center mb-8 mt-16">
              <h2 id="tableau-cyclomoteurs" className="text-2xl md:text-3xl font-bold mb-4">
                Barème kilométrique 2026 pour cyclomoteurs thermiques (&lt; 50 cm³)
              </h2>
              <p className="text-muted-foreground">
                Voici le <strong>barème des IK 2026 pour les cyclomoteurs</strong> et scooters de moins de 50 cm³.
              </p>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table aria-label="Barème des indemnités kilométriques 2026 pour cyclomoteurs">
                  <caption className="sr-only">
                    Tableau des taux d'indemnités kilométriques pour cyclomoteurs par distance parcourue
                  </caption>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead scope="col" className="font-bold">Type</TableHead>
                      <TableHead scope="col" className="text-center font-bold">Jusqu'à 3 000 km</TableHead>
                      <TableHead scope="col" className="text-center font-bold">De 3 001 à 6 000 km</TableHead>
                      <TableHead scope="col" className="text-center font-bold">Au-delà de 6 000 km</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-background">
                      <TableCell scope="row" className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-primary" aria-hidden="true" />
                          Cyclomoteurs et scooters &lt; 50 cm³
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          d × 0,315 €
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          (d × 0,079) + 711 €
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          d × 0,198 €
                        </code>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground text-center mt-4">
              <strong>d</strong> = distance parcourue en kilomètres sur l'année
            </p>
          </div>
        </section>

        {/* SEO Content: Why IK are legitimate */}
        <section className="py-12 px-4" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 600px' }}>
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 prose prose-lg dark:prose-invert">
            <h2 id="pourquoi-ik" className="text-2xl md:text-3xl font-bold mb-6">
              Pourquoi les indemnités kilométriques sont indispensables pour les indépendants
            </h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">Le carburant : un poste lourdement taxé</h3>
            <p>
              Lorsqu'un travailleur indépendant — qu'il soit consultant, <a href="https://www.ordre-infirmiers.fr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">infirmier libéral</a>, commercial ou artisan — utilise son <strong>véhicule personnel</strong> pour se rendre chez ses clients ou sur ses chantiers, il supporte seul l'intégralité des coûts associés à ces déplacements. Contrairement à un salarié d'une grande entreprise disposant d'un véhicule de fonction, l'indépendant avance <strong>le carburant, lourdement taxé</strong> (la <a href="https://www.ecologie.gouv.fr/fiscalite-des-energies" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">TICPE</a> représente environ 60 centimes par litre d'essence), paie son assurance auto, finance les révisions et les réparations courantes (pneus, freins, vidange). La page <Link to="/frais-reels" className="text-primary hover:underline">frais réels vs barème IK</Link> détaille les différences entre ces deux régimes.
            </p>
            <h3 className="text-xl font-semibold mt-6 mb-3">Usure, entretien et dépréciation du véhicule</h3>
            <p>
              Au-delà du carburant, l'indépendant subit la <strong>dépréciation naturelle</strong> de son véhicule, qui perd en moyenne 15 à 20 % de sa valeur dès la première année. Le <a href="https://www.service-public.fr/particuliers/vosdroits/F1989" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">barème des indemnités kilométriques 2026</a> existe précisément pour compenser forfaitairement l'ensemble de ces frais réels : usure mécanique, consommation de carburant, entretien régulier et perte de valeur du véhicule. Sans ce dispositif fiscal, des centaines de milliers de professionnels mobiles verraient leur revenu net amputé de plusieurs milliers d'euros chaque année.
            </p>

            <h2 id="donnees-communaute" className="text-2xl md:text-3xl font-bold mb-6 mt-12 flex items-center gap-3">
              <Users className="h-7 w-7 text-primary" aria-hidden="true" />
              Données de la communauté IKtracker
            </h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">Les chiffres clés de la plateforme</h3>
            <p>
              IKtracker accompagne aujourd'hui plus de <strong>160 utilisateurs actifs</strong> dans le suivi quotidien de leurs déplacements professionnels. Les données agrégées et anonymisées de la plateforme offrent un aperçu concret de la réalité terrain des indépendants français. En termes de volume, les utilisateurs les plus mobiles enregistrent jusqu'à <strong>5 900 km par mois</strong>, soit l'équivalent d'un aller-retour Paris–Bucarest chaque mois. Le <Link to="/mode-tournee" className="text-primary hover:underline">mode tournée GPS</Link> permet de suivre ces trajets en temps réel.
            </p>
            <h3 className="text-xl font-semibold mt-6 mb-3">Des montants qui parlent d'eux-mêmes</h3>
            <p>
              Sur l'ensemble de la plateforme, le <strong>montant maximum d'indemnités kilométriques</strong> comptabilisé par un seul utilisateur dépasse <strong>58 000 €</strong>, ce qui illustre l'ampleur des déplacements dans certaines professions itinérantes. En moyenne, chaque utilisateur a cumulé environ <strong>2 730 € d'IK</strong>, pour une distance moyenne de <strong>4 886 km</strong> enregistrés. Au total, plus de <strong>4 600 trajets professionnels</strong> ont été documentés sur la plateforme. Ces chiffres démontrent que les indemnités kilométriques ne sont pas un avantage symbolique : elles représentent un levier fiscal majeur pour les professionnels qui sillonnent les routes de France au quotidien. Découvrez comment <Link to="/expert-comptable" className="text-primary hover:underline">exporter vos IK pour votre comptable</Link>.
            </p>

            <h2 id="optimiser-ik" className="text-2xl md:text-3xl font-bold mb-6 mt-12">
              Optimiser ses IK : l'importance d'un suivi rigoureux
            </h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">Le risque fiscal de l'oubli de trajets</h3>
            <p>
              L'un des pièges les plus fréquents en matière d'indemnités kilométriques est <strong>l'oubli de trajets</strong>. Un déplacement non noté, c'est une déduction fiscale perdue — et sur une année entière, ces oublis peuvent représenter plusieurs centaines d'euros. L'<a href="https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/indemnites-kilometriques.html" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">administration fiscale (URSSAF)</a> exige par ailleurs un <strong>relevé détaillé</strong> de chaque trajet : date, lieu de départ, destination, distance et motif professionnel. En cas de contrôle, l'absence de justificatifs peut entraîner un <strong>redressement fiscal</strong> portant sur l'ensemble des frais déclarés.
            </p>
            <h3 className="text-xl font-semibold mt-6 mb-3">Un suivi automatisé pour un dossier fiscal solide</h3>
            <p>
              C'est pourquoi un outil de suivi automatisé comme IKtracker devient un allié stratégique : il enregistre chaque déplacement en temps réel grâce au <Link to="/mode-tournee" className="text-primary hover:underline">mode tournée GPS</Link>, calcule automatiquement les distances via Google Maps, et applique instantanément le barème kilométrique 2026 en vigueur. Le relevé généré est directement exploitable par votre comptable ou lors de votre <a href="https://www.impots.gouv.fr/particulier/frais-de-transport" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">déclaration de revenus</a>. La <Link to="/calendrier" className="text-primary hover:underline">synchronisation avec votre calendrier</Link> Google ou Outlook complète le dispositif. Plutôt que de reconstituer vos trajets en fin d'année à partir de souvenirs approximatifs, vous constituez un <strong>dossier fiscal solide</strong> au fil de l'eau, conforme aux exigences de l'URSSAF et du fisc.
            </p>
          </div>
        </section>

        {/* Electric Vehicle Section */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <h2 id="vehicules-electriques" className="text-2xl md:text-3xl font-bold mb-4">
                Véhicules électriques : majoration de 20% des indemnités kilométriques
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Depuis 2021 et confirmé pour les <strong>indemnités kilométriques 2026</strong>, les véhicules 100% électriques bénéficient d'un avantage fiscal significatif.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Electric Bonus Card */}
              <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <Zap className="h-5 w-5" />
                    Véhicules 100% électriques
                  </CardTitle>
                  <CardDescription className="text-emerald-600/80 dark:text-emerald-300/80">
                    Majoration applicable depuis 2021
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-black/20">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                      +20%
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Majoration automatique</p>
                      <p className="text-sm text-muted-foreground">Sur le montant total calculé avec le barème</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>S'applique aux véhicules <strong>exclusivement électriques</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>Aucune démarche supplémentaire requise</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>Applicable que vous soyez salarié ou indépendant</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Warning Card - Hybrid vehicles */}
              <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                    Attention aux véhicules hybrides
                  </CardTitle>
                  <CardDescription className="text-amber-600/80 dark:text-amber-300/80">
                    Une confusion fréquente à éviter
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">
                    <strong className="text-amber-700 dark:text-amber-400">Les véhicules hybrides et hybrides rechargeables ne bénéficient PAS de la majoration de 20%.</strong>
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-red-100/60 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <Fuel className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-red-700 dark:text-red-400">Hybride classique</p>
                        <p className="text-muted-foreground text-xs">Barème standard, pas de majoration</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-red-100/60 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <Fuel className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-red-700 dark:text-red-400">Hybride rechargeable (PHEV)</p>
                        <p className="text-muted-foreground text-xs">Barème standard, pas de majoration</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Ces véhicules utilisent le barème classique car ils disposent d'un moteur thermique, même partiel.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Important Note */}
            <Card className="mt-6 border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                    Le type de carburant n'influence pas le calcul des IK
                  </p>
                  <p className="text-muted-foreground">
                    Que vous rouliez à l'essence, au diesel ou au GPL, le calcul des <strong>indemnités kilométriques 2026</strong> reste identique. 
                    Seuls les véhicules 100% électriques bénéficient d'un traitement fiscal avantageux avec la majoration de 20%.
                  </p>
                  <a 
                    href="https://bofip.impots.gouv.fr/bofip/2568-PGP.html/identifiant%3DBOI-BAREME-000003-20210309" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <FileText className="h-3 w-3" />
                    Source officielle : BOFiP – Majoration véhicules électriques
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>


        {/* How IK Works Section - content-visibility for mobile perf */}
        <section className="py-12 px-4 bg-muted/30" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 800px' }}>
          <div className="container mx-auto max-w-4xl">
            <h2 id="calcul-ik" className="text-2xl md:text-3xl font-bold mb-8 text-center">
              Comment calculer ses indemnités kilométriques 2026 ?
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Le calcul des IK
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    Les indemnités kilométriques (IK) permettent de <strong>déduire de vos revenus les frais liés à l'utilisation de votre véhicule personnel</strong> pour des déplacements professionnels.
                  </p>
                  <p>
                    Le calcul tient compte de :
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>La <strong>puissance fiscale</strong> de votre véhicule (en CV)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>La <strong>distance totale parcourue</strong> sur l'année</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>Le <strong>barème fiscal officiel</strong> publié chaque année</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Qui peut en bénéficier ?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    Les indemnités kilométriques concernent principalement :
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span><strong>Salariés</strong> optant pour les frais réels plutôt que l'abattement de 10%</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span><strong>Indépendants et freelances</strong> (BNC, BIC)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span><strong>Dirigeants de société</strong> utilisant leur véhicule personnel</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span><strong>Bénévoles associatifs</strong> en déplacement</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Legal Sources - content-visibility for mobile perf */}
        <section className="py-12 px-4" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}>
          <div className="container mx-auto max-w-4xl">
            <h2 id="sources-officielles" className="text-2xl md:text-3xl font-bold mb-8 text-center">
              Sources officielles et références légales
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <a 
                href="https://www.service-public.fr/particuliers/vosdroits/F1989" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">Service-public.fr</p>
                      <p className="text-xs text-muted-foreground">Barème kilométrique officiel</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </CardContent>
                </Card>
              </a>

              <a 
                href="https://www.impots.gouv.fr/particulier/frais-de-transport" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">Impots.gouv.fr</p>
                      <p className="text-xs text-muted-foreground">Frais de transport</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </CardContent>
                </Card>
              </a>

              <a 
                href="https://bofip.impots.gouv.fr/bofip/2568-PGP.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">BOFIP</p>
                      <p className="text-xs text-muted-foreground">Doctrine fiscale</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </CardContent>
                </Card>
              </a>
            </div>
          </div>
        </section>

        {/* Related Links & CTA - content-visibility for mobile perf */}
        <section className="py-12 px-4 bg-muted/30" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              En savoir plus sur IKtracker
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Link to="/mode-tournee" className="group">
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Car className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-sm">Mode Tournée</p>
                    <p className="text-xs text-muted-foreground">Multi-arrêts GPS</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/calendrier" className="group">
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Calculator className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-sm">Sync Calendrier</p>
                    <p className="text-xs text-muted-foreground">Google & Outlook</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/expert-comptable" className="group">
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-sm">Export Comptable</p>
                    <p className="text-xs text-muted-foreground">PDF & Excel</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/installer" className="group">
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-sm">Installation</p>
                    <p className="text-xs text-muted-foreground">App mobile</p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <div className="text-center">
              <Link to="/signup">
                <Button variant="gradient" size="lg" className="gap-2">
                  Accéder à l'outil
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4 bg-muted/30" aria-labelledby="faq">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-10">
              <h2 id="faq" className="text-2xl md:text-3xl font-bold mb-4">
                Questions fréquentes sur le barème IK 2026
              </h2>
              <p className="text-muted-foreground">
                Tout ce que vous devez savoir sur les indemnités kilométriques
              </p>
            </div>
            
            <div className="space-y-4">
              {faqData.map((faq, index) => (
                <Card key={index} className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-foreground flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pl-12">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        </main>

        <Suspense fallback={<FooterPlaceholder />}>
          <EnhancedMarketingFooter />
        </Suspense>
        <Suspense fallback={null}>
          <MarketingPWANotification />
        </Suspense>

        {/* Sticky mobile CTA */}
        {!user && (
          <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-sm border-t border-border p-3 safe-area-pb">
            <Link to="/signup" onClick={trackCTAClick} className="block">
              <Button variant="gradient" size="lg" className="w-full gap-2 text-sm">
                Automatiser mes IK avec IKtracker
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default BaremeIK2026;
