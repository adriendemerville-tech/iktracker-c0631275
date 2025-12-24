import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingPWANotification } from "@/components/marketing/MarketingPWANotification";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { useMarketingTracker } from "@/hooks/useMarketingTracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { IK_BAREME_2024, getIKBareme, calculateTotalAnnualIK } from "@/types/trip";
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
  Fuel
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

const BaremeIK2026 = () => {
  const { user, loading } = useAuth();
  const { trackCTAClick, trackIKSimulation } = useMarketingTracker('bareme-ik');
  const [fiscalPower, setFiscalPower] = useState<string>("5");
  const [annualKm, setAnnualKm] = useState<string>("10000");
  const [isElectric, setIsElectric] = useState<boolean>(false);

  // Simulate IK calculation with electric vehicle bonus
  const simulation = useMemo(() => {
    const cv = parseInt(fiscalPower) || 5;
    const km = parseInt(annualKm) || 0;
    const bareme = getIKBareme(cv);
    let totalIK = calculateTotalAnnualIK(km, cv);
    
    // Apply 20% bonus for 100% electric vehicles
    const electricBonus = isElectric ? totalIK * 0.20 : 0;
    const totalWithBonus = totalIK + electricBonus;
    
    let bracket = "";
    let rate = 0;
    if (km <= 5000) {
      bracket = "jusqu'à 5 000 km";
      rate = bareme.upTo5000.rate;
    } else if (km <= 20000) {
      bracket = "de 5 001 à 20 000 km";
      rate = bareme.from5001To20000.rate;
    } else {
      bracket = "plus de 20 000 km";
      rate = bareme.over20000.rate;
    }

    return { totalIK, totalWithBonus, electricBonus, bracket, rate, bareme, isElectric };
  }, [fiscalPower, annualKm, isElectric]);

  return (
    <>
      <Helmet>
        <title>Barème indemnités kilométriques 2026 (IK) : calcul et tableau fiscal | IKtracker</title>
        <meta 
          name="description" 
          content="Barème des indemnités kilométriques 2025 reconduit en 2026. Simulateur IK gratuit, tableau des taux par CV et calcul automatique de vos frais kilométriques professionnels." 
        />
        <meta name="keywords" content="indemnités kilométriques 2026, indemnités kilométriques 2025, barème des indemnités kilométriques 2025, barème ik 2026, barème kilométrique 2026, frais kilométriques, calcul IK, barème fiscal véhicule, véhicule électrique IK, majoration 20% électrique" />
        <link rel="canonical" href="https://iktracker.fr/bareme-ik-2026" />
        <meta property="og:title" content="Barème indemnités kilométriques 2026 - Simulateur et calcul IK" />
        <meta property="og:description" content="Tableau complet du barème IK 2026 basé sur le barème des indemnités kilométriques 2025. Simulateur gratuit pour calculer vos IK." />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:url" content="https://iktracker.lovable.app/bareme-ik-2026" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Barème indemnités kilométriques 2026 | IKtracker" />
        <meta name="twitter:description" content="Découvrez le barème IK 2026 et calculez vos indemnités kilométriques avec notre simulateur gratuit." />
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="France" />
        <meta name="language" content="fr" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Barème des indemnités kilométriques 2026 : guide complet et simulateur",
            "description": "Découvrez le barème IK 2026 basé sur les indemnités kilométriques 2025. Tableau des taux, simulateur gratuit et conseils fiscaux.",
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
            "dateModified": "2024-12-19",
            "mainEntityOfPage": "https://iktracker.lovable.app/bareme-ik-2026",
            "inLanguage": "fr-FR",
            "about": {
              "@type": "Thing",
              "name": "Indemnités kilométriques",
              "description": "Barème fiscal permettant de calculer les frais de déplacement professionnels"
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Quel est le barème des indemnités kilométriques 2026 ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Le barème des indemnités kilométriques 2026 reprend les taux du barème 2025. Pour un véhicule de 5 CV, le taux est de 0.603 €/km jusqu'à 5000 km, puis (d × 0.339) + 1320 € jusqu'à 20000 km, et 0.405 €/km au-delà."
                }
              },
              {
                "@type": "Question",
                "name": "Comment calculer ses indemnités kilométriques 2025 et 2026 ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Le calcul des IK dépend de la puissance fiscale du véhicule (CV) et du nombre de kilomètres parcourus. Utilisez le simulateur IKtracker pour un calcul automatique selon le barème officiel."
                }
              },
              {
                "@type": "Question",
                "name": "Le barème IK 2026 est-il différent du barème 2025 ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Non, le barème des IK 2026 devrait être identique au barème des indemnités kilométriques 2025, compte tenu de la stabilisation des prix du carburant et des contraintes budgétaires de l'État."
                }
              },
              {
                "@type": "Question",
                "name": "Les véhicules électriques bénéficient-ils d'un avantage pour les IK ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Oui, depuis 2021 et confirmé pour 2025-2026, les véhicules 100% électriques bénéficient d'une majoration de 20% sur le montant des indemnités kilométriques. Attention : les véhicules hybrides et hybrides rechargeables ne bénéficient pas de cet avantage."
                }
              }
            ]
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background font-display select-text">
        <MarketingNav user={user} loading={loading} />

        {/* Hero Section */}
        <section className="pt-24 pb-12 md:pt-28 md:pb-16 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="container mx-auto relative z-10 max-w-4xl">
            <div className="text-center animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Calculator className="h-4 w-4" />
                Barème fiscal 2026
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-6">
                Barème des indemnités kilométriques 2026 :<br />
                <span className="text-gradient">calcul et tableau fiscal officiel</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Le <strong>barème des indemnités kilométriques 2025</strong> sera reconduit en 2026. 
                Découvrez les taux applicables, notre simulateur gratuit et comment calculer vos <strong>indemnités kilométriques 2026</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Forecast Section */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Info className="h-5 w-5" />
                  Barème IK 2026 : reconduction du barème des indemnités kilométriques 2025
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-foreground">
                <p>
                  <strong>Le barème des indemnités kilométriques 2025 devrait être reconduit à l'identique pour 2026.</strong> Cette stabilité permet aux contribuables de planifier leurs déclarations fiscales avec les mêmes taux que l'année précédente.
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
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Tableau du barème des indemnités kilométriques 2025-2026
              </h2>
              <p className="text-muted-foreground">
                Voici le <strong>barème des IK 2026</strong> (identique au barème 2025) avec les taux par puissance fiscale et kilomètres parcourus.
              </p>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table aria-label="Barème des indemnités kilométriques 2025-2026">
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
          </div>
        </section>

        {/* Electric Vehicle Section */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Véhicules électriques : majoration de 20% des indemnités kilométriques
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Depuis 2021 et confirmé pour les <strong>indemnités kilométriques 2025</strong> et 2026, les véhicules 100% électriques bénéficient d'un avantage fiscal significatif.
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

        {/* Simulator Section */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Simulateur indemnités kilométriques 2025-2026
              </h2>
              <p className="text-muted-foreground">
                Calculez vos <strong>indemnités kilométriques 2026</strong> en quelques secondes avec notre simulateur basé sur le <strong>barème IK 2026</strong>.
              </p>
            </div>

            <Card className="border-primary/20">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Inputs */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fiscalPower" className="text-sm font-medium">
                        Puissance fiscale du véhicule
                      </Label>
                      <Select value={fiscalPower} onValueChange={setFiscalPower}>
                        <SelectTrigger id="fiscalPower" className="mt-1.5">
                          <SelectValue placeholder="Choisir la puissance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 CV</SelectItem>
                          <SelectItem value="4">4 CV</SelectItem>
                          <SelectItem value="5">5 CV</SelectItem>
                          <SelectItem value="6">6 CV</SelectItem>
                          <SelectItem value="7">7 CV et plus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="annualKm" className="text-sm font-medium">
                        Kilomètres annuels estimés
                      </Label>
                      <Input
                        id="annualKm"
                        type="number"
                        value={annualKm}
                        onChange={(e) => setAnnualKm(e.target.value)}
                        placeholder="Ex: 15000"
                        className="mt-1.5"
                      />
                    </div>

                    {/* Electric Vehicle Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <Label htmlFor="electric" className="text-sm font-medium cursor-pointer">
                            Véhicule 100% électrique
                          </Label>
                          <p className="text-xs text-muted-foreground">Majoration de 20%</p>
                        </div>
                      </div>
                      <Switch
                        id="electric"
                        checked={isElectric}
                        onCheckedChange={setIsElectric}
                      />
                    </div>
                  </div>

                  {/* Results */}
                  <div className={`rounded-xl p-6 flex flex-col justify-center ${isElectric ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/20' : 'bg-gradient-to-br from-primary/5 to-primary/10'}`}>
                    <p className="text-sm text-muted-foreground mb-1">
                      Estimation IK 2026 {isElectric && <span className="text-emerald-600 dark:text-emerald-400 font-medium">(véhicule électrique)</span>}
                    </p>
                    <p className={`text-4xl font-bold mb-4 ${isElectric ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}>
                      {simulation.totalWithBonus.toLocaleString('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR',
                        maximumFractionDigits: 0 
                      })}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span>Barème applicable : <strong>{simulation.bracket}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span>Taux de base : <strong>{simulation.rate.toFixed(3)} €/km</strong></span>
                      </div>
                      {isElectric && (
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <Zap className="h-4 w-4" />
                          <span>Bonus électrique : <strong>+{simulation.electricBonus.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Automatisez le calcul de vos IK tout au long de l'année avec IKtracker
                  </p>
                  <Link to="/#auth-section">
                    <Button variant="gradient" size="lg" className="gap-2">
                      Accéder à l'outil
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How IK Works Section */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              Comment calculer ses indemnités kilométriques 2025 et 2026 ?
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

        {/* Legal Sources */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
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

        {/* Related Links & CTA */}
        <section className="py-12 px-4 bg-muted/30">
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

              <Link to="/install" className="group">
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
              <Link to="/#auth-section">
                <Button variant="gradient" size="lg" className="gap-2">
                  Accéder à l'outil
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <MarketingFooter />
        <MarketingPWANotification />
      </div>
    </>
  );
};

export default BaremeIK2026;
