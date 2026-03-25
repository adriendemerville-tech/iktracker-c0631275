import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { EnhancedMarketingFooter } from '@/components/marketing/EnhancedMarketingFooter';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/hooks/useAuth';
import { useMarketingTracker } from '@/hooks/useMarketingTracker';
import { 
  Calculator, 
  ArrowRight, 
  TrendingUp, 
  Percent, 
  Car, 
  CheckCircle2,
  AlertCircle,
  FileText,
  Scale,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Barème kilométrique 2026 (véhicules thermiques)
const BAREME_2026 = {
  '3': { low: 0.529, mid: 0.316, high: 0.370 },
  '4': { low: 0.606, mid: 0.340, high: 0.407 },
  '5': { low: 0.636, mid: 0.357, high: 0.427 },
  '6': { low: 0.665, mid: 0.374, high: 0.447 },
  '7+': { low: 0.697, mid: 0.394, high: 0.470 },
};

type FiscalPower = '3' | '4' | '5' | '6' | '7+';

function calculateIK(distance: number, fiscalPower: FiscalPower, isElectric: boolean): number {
  const rates = BAREME_2026[fiscalPower];
  let baseAmount = 0;
  
  if (distance <= 5000) {
    baseAmount = distance * rates.low;
  } else if (distance <= 20000) {
    baseAmount = (distance * rates.mid) + 1065;
  } else {
    baseAmount = distance * rates.high;
  }
  
  // Majoration 20% pour véhicules électriques
  if (isElectric) {
    baseAmount *= 1.20;
  }
  
  return Math.round(baseAmount * 100) / 100;
}

function calculateAbattement(grossIncome: number): number {
  const abattement = grossIncome * 0.10;
  // Plafond 2026 estimé (à ajuster selon les données officielles)
  const plafond = 14171;
  const plancher = 495;
  
  return Math.min(Math.max(abattement, plancher), plafond);
}

export default function FraisReels() {
  const { user, loading } = useAuth();
  const { trackIKSimulation } = useMarketingTracker('frais-reels');
  
  const [grossIncome, setGrossIncome] = useState<string>('35000');
  const [annualKm, setAnnualKm] = useState<string>('15000');
  const [fiscalPower, setFiscalPower] = useState<FiscalPower>('5');
  const [isElectric, setIsElectric] = useState<boolean>(false);
  const [hasCalculated, setHasCalculated] = useState<boolean>(false);

  const results = useMemo(() => {
    const income = parseFloat(grossIncome) || 0;
    const km = parseFloat(annualKm) || 0;
    
    const abattement = calculateAbattement(income);
    const fraisReels = calculateIK(km, fiscalPower, isElectric);
    const difference = fraisReels - abattement;
    const bestOption = fraisReels > abattement ? 'frais-reels' : 'abattement';
    
    return {
      abattement,
      fraisReels,
      difference,
      bestOption,
      economie: Math.abs(difference),
    };
  }, [grossIncome, annualKm, fiscalPower, isElectric]);

  const handleCalculate = () => {
    setHasCalculated(true);
    trackIKSimulation();
  };

  return (
    <>
      <Helmet>
        <title>Frais Réels vs Abattement 10% : Calculateur Gratuit 2026 | IKtracker</title>
        <meta 
          name="description" 
          content="Comparez gratuitement l'abattement forfaitaire de 10% et les frais réels kilométriques. Calculateur barème 2026 pour optimiser votre déclaration d'impôts."
        />
        <meta name="keywords" content="frais réels, abattement 10%, indemnités kilométriques, déclaration impôts, barème kilométrique 2026, optimisation fiscale" />
        <link rel="canonical" href="https://iktracker.fr/frais-reels" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Frais Réels vs Abattement 10% : Calculateur Gratuit 2026" />
        <meta property="og:description" content="Comparez l'abattement forfaitaire et les frais réels kilométriques. Outil gratuit pour optimiser votre déclaration d'impôts." />
        <meta property="og:url" content="https://iktracker.fr/frais-reels" />
        <meta property="og:type" content="website" />
        
        {/* JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Calculateur Frais Réels vs Abattement 10%",
            "url": "https://iktracker.fr/frais-reels",
            "description": "Outil gratuit de comparaison entre l'abattement forfaitaire de 10% et les frais réels kilométriques pour la déclaration d'impôts.",
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "EUR"
            },
            "speakable": {
              "@type": "SpeakableSpecification",
              "cssSelector": ["#main-content h1", "#main-content > section:first-of-type p"]
            }
          })}
        </script>
        {/* FAQ Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "Quand choisir les frais réels plutôt que l'abattement de 10% ?", "acceptedAnswer": { "@type": "Answer", "text": "Les frais réels kilométriques sont généralement plus avantageux si vous parcourez plus de 15 000 km par an pour des raisons professionnelles, ou si votre trajet domicile-travail est supérieur à 40 km." }},
              { "@type": "Question", "name": "Comment justifier ses frais réels auprès de l'administration fiscale ?", "acceptedAnswer": { "@type": "Answer", "text": "Vous devez conserver des justificatifs fiscaux précis : un carnet de bord avec la date, le motif et la distance de chaque trajet professionnel. IKtracker automatise ce suivi grâce à la synchronisation de votre agenda et au GPS." }},
              { "@type": "Question", "name": "Le barème kilométrique 2026 : quels sont les taux ?", "acceptedAnswer": { "@type": "Answer", "text": "Le barème kilométrique 2026 varie selon la puissance fiscale de votre véhicule et le nombre de kilomètres parcourus. Les véhicules électriques bénéficient d'une majoration de 20%." }},
              { "@type": "Question", "name": "Peut-on cumuler frais réels kilométriques et autres frais professionnels ?", "acceptedAnswer": { "@type": "Answer", "text": "Oui, en optant pour les frais réels, vous pouvez déduire l'ensemble de vos frais professionnels : indemnités kilométriques, repas, formation, matériel. Le choix s'applique à l'ensemble de vos revenus." }},
              { "@type": "Question", "name": "Quelle est la distance maximale déductible pour le trajet domicile-travail ?", "acceptedAnswer": { "@type": "Answer", "text": "En principe, seuls les 40 premiers kilomètres sont déductibles (soit 80 km aller-retour). Au-delà, vous devez justifier de circonstances particulières." }},
              { "@type": "Question", "name": "Comment déclarer ses frais réels sur la déclaration d'impôts ?", "acceptedAnswer": { "@type": "Answer", "text": "Sur votre déclaration de revenus (formulaire 2042), cochez la case frais réels et indiquez le montant total. Conservez les justificatifs pendant 3 ans en cas de contrôle." }},
              { "@type": "Question", "name": "Les véhicules électriques sont-ils avantagés fiscalement ?", "acceptedAnswer": { "@type": "Answer", "text": "Oui, les véhicules électriques bénéficient d'une majoration de 20% sur le barème kilométrique standard." }},
              { "@type": "Question", "name": "Comment prouver l'usage professionnel de son véhicule personnel ?", "acceptedAnswer": { "@type": "Answer", "text": "Vous devez tenir un carnet de bord détaillant chaque déplacement professionnel. IKtracker automatise cette tâche en synchronisant votre agenda et en calculant les distances via GPS." }}
            ]
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <MarketingNav user={user} loading={loading} />
        
        <main id="main-content" className="pt-20 md:pt-24">
          {/* Breadcrumb */}
          <div className="container mx-auto px-4 pt-4">
            <Breadcrumb items={[{ label: 'Frais Réels vs Abattement' }]} />
          </div>
          {/* Hero Section */}
          <section className="container mx-auto px-4 py-12 md:py-16">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
                <Scale className="h-4 w-4" />
                <span className="text-sm font-medium">Barème fiscal 2026</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                Frais réels ou abattement 10% ?
                <span className="block text-primary mt-2">Calculez la meilleure option en 2026</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Comparez gratuitement les deux méthodes de déduction fiscale pour vos frais kilométriques 
                et optimisez votre déclaration d'impôts en quelques clics.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Retrouvez toutes les informations sur la déclaration des frais professionnels sur{" "}
                <a 
                  href="https://www.impots.gouv.fr/particulier/je-declare-mes-frais-professionnels" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-primary transition-colors"
                >
                  impots.gouv.fr
                </a>.
              </p>
            </div>
          </section>

          {/* Calculator Section */}
          <section className="container mx-auto px-4 py-8 md:py-12">
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Input Card */}
                <Card className="shadow-lg border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-primary" />
                      Vos données
                    </CardTitle>
                    <CardDescription>
                      Renseignez vos informations pour comparer les deux options
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Revenu brut */}
                    <div className="space-y-2">
                      <Label htmlFor="income" className="text-base font-medium">
                        Revenu brut annuel (€)
                      </Label>
                      <Input
                        id="income"
                        type="number"
                        value={grossIncome}
                        onChange={(e) => setGrossIncome(e.target.value)}
                        placeholder="35000"
                        className="text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Salaire brut ou chiffre d'affaires pour les indépendants
                      </p>
                    </div>

                    {/* Kilomètres annuels */}
                    <div className="space-y-2">
                      <Label htmlFor="km" className="text-base font-medium">
                        Kilomètres professionnels annuels
                      </Label>
                      <Input
                        id="km"
                        type="number"
                        value={annualKm}
                        onChange={(e) => setAnnualKm(e.target.value)}
                        placeholder="15000"
                        className="text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Trajets domicile-travail + déplacements professionnels
                      </p>
                    </div>

                    {/* Puissance fiscale */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Puissance fiscale du véhicule (CV)
                      </Label>
                      <RadioGroup
                        value={fiscalPower}
                        onValueChange={(v) => setFiscalPower(v as FiscalPower)}
                        className="grid grid-cols-5 gap-2"
                      >
                        {['3', '4', '5', '6', '7+'].map((cv) => (
                          <div key={cv} className="flex items-center">
                            <RadioGroupItem
                              value={cv}
                              id={`cv-${cv}`}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={`cv-${cv}`}
                              className={cn(
                                "flex h-12 w-full cursor-pointer items-center justify-center rounded-lg border-2 text-sm font-medium transition-all",
                                "hover:bg-primary/5",
                                fiscalPower === cv
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-muted bg-background text-muted-foreground"
                              )}
                            >
                              {cv}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Véhicule électrique */}
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <input
                        type="checkbox"
                        id="electric"
                        checked={isElectric}
                        onChange={(e) => setIsElectric(e.target.checked)}
                        className="h-5 w-5 rounded border-primary text-primary focus:ring-primary"
                      />
                      <Label htmlFor="electric" className="text-base cursor-pointer">
                        Véhicule électrique (+20% sur le barème)
                      </Label>
                    </div>

                    <Button 
                      onClick={handleCalculate}
                      variant="gradient"
                      size="lg"
                      className="w-full"
                    >
                      <Calculator className="h-5 w-5 mr-2" />
                      Calculer
                    </Button>
                  </CardContent>
                </Card>

                {/* Results Card */}
                <Card className={cn(
                  "shadow-lg border-2 transition-all duration-500",
                  hasCalculated ? "border-primary/50" : "border-muted"
                )}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Résultats de la comparaison
                    </CardTitle>
                    <CardDescription>
                      {hasCalculated 
                        ? "Voici la meilleure option pour votre situation"
                        : "Remplissez le formulaire pour voir les résultats"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {!hasCalculated ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Calculator className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">
                          Remplissez le formulaire et cliquez sur "Calculer" pour voir les résultats
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Abattement 10% */}
                        <div className={cn(
                          "p-4 rounded-lg border-2 transition-all",
                          results.bestOption === 'abattement'
                            ? "border-primary bg-primary/10"
                            : "border-muted bg-muted/30"
                        )}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Percent className="h-5 w-5 text-muted-foreground" />
                              <span className="font-semibold">Abattement forfaitaire 10%</span>
                            </div>
                            {results.bestOption === 'abattement' && (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <p className="text-2xl font-bold text-foreground">
                            {results.abattement.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Déduction automatique sans justificatif
                          </p>
                        </div>

                        {/* Frais réels */}
                        <div className={cn(
                          "p-4 rounded-lg border-2 transition-all",
                          results.bestOption === 'frais-reels'
                            ? "border-primary bg-primary/10"
                            : "border-muted bg-muted/30"
                        )}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Car className="h-5 w-5 text-muted-foreground" />
                              <span className="font-semibold">Frais réels kilométriques</span>
                            </div>
                            {results.bestOption === 'frais-reels' && (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <p className="text-2xl font-bold text-foreground">
                            {results.fraisReels.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Basé sur le barème kilométrique 2026
                          </p>
                        </div>

                        {/* Recommandation */}
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-foreground">
                                {results.bestOption === 'frais-reels' 
                                  ? "Les frais réels sont plus avantageux !"
                                  : "L'abattement forfaitaire est plus avantageux !"
                                }
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Économie potentielle : <strong className="text-primary">
                                  {results.economie.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                                </strong>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* CTA */}
                        {results.bestOption === 'frais-reels' && (
                          <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-3">
                              Automatisez le suivi de vos trajets pour justifier vos frais réels
                            </p>
                            <Button asChild variant="gradient" className="w-full">
                              <Link to="/signup">
                                Créer mon compte gratuit
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Link>
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Explanation Section */}
          <section className="container mx-auto px-4 py-12 md:py-16 bg-muted/30">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Comprendre les deux options de déduction fiscale
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Abattement */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Percent className="h-5 w-5 text-primary" />
                      L'abattement forfaitaire de 10%
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      L'administration fiscale applique automatiquement une déduction de 10% sur vos revenus 
                      pour couvrir vos frais professionnels.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                        <span className="text-sm">Application automatique, aucun justificatif</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                        <span className="text-sm">Minimum 495 €, maximum 14 171 € (2026)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                        <span className="text-sm">Simple et sans risque de contrôle</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Frais réels */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Les frais réels kilométriques
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Vous déclarez vos frais réels en utilisant le{" "}
                      <a 
                        href="https://www.economie.gouv.fr/entreprises/gerer-sa-fiscalite-et-ses-impots/limpot-sur-les-benefices-ir-et/comment-deduire-les" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-primary transition-colors"
                      >
                        barème kilométrique officiel
                      </a>{" "}
                      publié chaque année par l'administration fiscale.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                        <span className="text-sm">Plus avantageux si vous roulez beaucoup</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                        <span className="text-sm">Majoration de 20% pour les véhicules électriques</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive mt-1 shrink-0" />
                        <span className="text-sm">Nécessite des justificatifs (carnet de bord)</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="faq-heading">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                  <HelpCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">FAQ</span>
                </div>
                <h2 id="faq-heading" className="text-2xl md:text-3xl font-bold">
                  Questions fréquentes sur les frais réels
                </h2>
              </div>
              
              <Accordion type="single" collapsible className="w-full space-y-4">
                <AccordionItem value="item-1" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    Quand choisir les frais réels plutôt que l'abattement de 10% ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    Les <strong className="text-foreground">frais réels kilométriques</strong> sont généralement plus avantageux si vous parcourez 
                    plus de 15 000 km par an pour des raisons professionnelles, ou si votre trajet domicile-travail 
                    est supérieur à 40 km. L'option des frais réels permet de déduire l'intégralité 
                    de vos dépenses liées aux déplacements professionnels selon le <strong className="text-foreground">barème kilométrique URSSAF</strong>.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    Comment justifier ses frais réels auprès de l'administration fiscale ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    Pour bénéficier de la déduction des frais réels, vous devez conserver des 
                    <strong className="text-foreground"> justificatifs fiscaux</strong> précis : un carnet de bord avec la date, le motif et la 
                    distance de chaque trajet professionnel. C'est exactement ce que permet IKtracker : automatiser 
                    ce suivi grâce à la synchronisation de votre agenda et au GPS.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    Le barème kilométrique 2026 : quels sont les taux ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    Le <strong className="text-foreground">barème kilométrique 2026</strong> varie selon la puissance fiscale de votre véhicule 
                    et le nombre de kilomètres parcourus. Les véhicules électriques bénéficient d'une majoration de 20%. 
                    Ce barème couvre l'ensemble des frais liés à l'utilisation de votre véhicule : carburant, 
                    assurance, entretien et amortissement.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    Peut-on cumuler frais réels kilométriques et autres frais professionnels ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    Oui, en optant pour les frais réels, vous pouvez déduire l'ensemble de vos frais professionnels : 
                    <strong className="text-foreground"> indemnités kilométriques</strong>, repas, formation, matériel, etc. 
                    Attention : le choix des frais réels s'applique à l'ensemble de vos revenus, vous ne pouvez pas 
                    cumuler abattement forfaitaire sur une partie et frais réels sur l'autre.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    Quelle est la distance maximale déductible pour le trajet domicile-travail ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    En principe, seuls les 40 premiers kilomètres du trajet domicile-travail sont déductibles 
                    (soit 80 km aller-retour). Au-delà, vous devez justifier de circonstances particulières 
                    (emploi précaire, mutations, raisons familiales) pour déduire la distance réelle. 
                    Les déplacements professionnels hors trajet domicile-travail sont intégralement déductibles.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    Comment déclarer ses frais réels sur la déclaration d'impôts ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    Sur votre déclaration de revenus (formulaire 2042), vous devez cocher la case "frais réels" 
                    et indiquer le montant total de vos frais dans la case dédiée. L'administration fiscale 
                    ne demandera pas systématiquement les justificatifs, mais vous devez les conserver 
                    pendant 3 ans en cas de contrôle. IKtracker génère automatiquement un rapport PDF 
                    conforme pour faciliter cette démarche.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    Les véhicules électriques sont-ils avantagés fiscalement ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    Oui, les <strong className="text-foreground">véhicules électriques</strong> bénéficient d'une majoration de 20% sur le barème 
                    kilométrique standard. Par exemple, pour un véhicule de 5 CV parcourant 15 000 km/an, 
                    l'indemnité passe de 6 420 € à 7 704 € pour un véhicule électrique. Cette mesure 
                    vise à encourager la transition vers des mobilités plus propres.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-8" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    Comment prouver l'usage professionnel de son véhicule personnel ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    Vous devez tenir un <strong className="text-foreground">carnet de bord</strong> détaillant chaque déplacement professionnel 
                    avec : la date, le lieu de départ, la destination, le motif du déplacement et la distance parcourue. 
                    IKtracker automatise cette tâche en synchronisant votre agenda professionnel et en calculant 
                    automatiquement les distances via GPS, générant un rapport conforme aux exigences fiscales.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Final CTA */}
          <section className="container mx-auto px-4 py-12 md:py-16">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Automatisez le suivi de vos frais kilométriques
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                IKtracker génère automatiquement vos justificatifs fiscaux conformes au barème 2026.
              </p>
              <Button asChild variant="gradient" size="lg">
                <Link to="/signup">
                  Accéder à l'outil gratuitement
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
            </div>
          </section>
        </main>

        <EnhancedMarketingFooter />
      </div>
    </>
  );
}
