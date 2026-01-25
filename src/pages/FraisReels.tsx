import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { EnhancedMarketingFooter } from '@/components/marketing/EnhancedMarketingFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Scale
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
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <MarketingNav user={user} loading={loading} />
        
        <main id="main-content" className="pt-20 md:pt-24">
          {/* Hero Section */}
          <section className="container mx-auto px-4 py-12 md:py-16">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
                <Scale className="h-4 w-4" />
                <span className="text-sm font-medium">Barème fiscal 2026</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                Frais réels ou abattement 10% ?
                <span className="block text-primary mt-2">Calculez la meilleure option</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Comparez gratuitement les deux méthodes de déduction fiscale pour vos frais kilométriques 
                et optimisez votre déclaration d'impôts en quelques clics.
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
                      Calculer et comparer
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
                    {/* Abattement 10% */}
                    <div className={cn(
                      "p-4 rounded-lg border-2 transition-all",
                      hasCalculated && results.bestOption === 'abattement'
                        ? "border-primary bg-primary/10"
                        : "border-muted bg-muted/30"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Percent className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">Abattement forfaitaire 10%</span>
                        </div>
                        {hasCalculated && results.bestOption === 'abattement' && (
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
                      hasCalculated && results.bestOption === 'frais-reels'
                        ? "border-primary bg-primary/10"
                        : "border-muted bg-muted/30"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Car className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">Frais réels kilométriques</span>
                        </div>
                        {hasCalculated && results.bestOption === 'frais-reels' && (
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
                    {hasCalculated && (
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
                    )}

                    {/* CTA */}
                    {hasCalculated && results.bestOption === 'frais-reels' && (
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
                      Vous déclarez vos frais réels en utilisant le barème kilométrique officiel publié 
                      chaque année par l'administration fiscale.
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

          {/* SEO Content Section */}
          <section className="container mx-auto px-4 py-12 md:py-16">
            <div className="max-w-3xl mx-auto prose prose-lg dark:prose-invert">
              <h2>Questions fréquentes sur les frais réels et l'abattement</h2>
              
              <h3>Quand choisir les frais réels plutôt que l'abattement de 10% ?</h3>
              <p>
                Les <strong>frais réels kilométriques</strong> sont généralement plus avantageux si vous parcourez 
                plus de 15 000 km par an pour des raisons professionnelles, ou si votre trajet domicile-travail 
                est supérieur à 40 km. L'option des <strong>frais réels</strong> permet de déduire l'intégralité 
                de vos dépenses liées aux déplacements professionnels selon le <strong>barème kilométrique URSSAF</strong>.
              </p>

              <h3>Comment justifier ses frais réels auprès de l'administration fiscale ?</h3>
              <p>
                Pour bénéficier de la déduction des <strong>frais réels</strong>, vous devez conserver des 
                <strong> justificatifs fiscaux</strong> précis : un carnet de bord avec la date, le motif et la 
                distance de chaque trajet professionnel. C'est exactement ce que permet IKtracker : automatiser 
                ce suivi grâce à la synchronisation de votre agenda et au GPS.
              </p>

              <h3>Le barème kilométrique 2026 : quels taux ?</h3>
              <p>
                Le <strong>barème kilométrique 2026</strong> varie selon la puissance fiscale de votre véhicule 
                et le nombre de kilomètres parcourus. Les véhicules électriques bénéficient d'une majoration de 20%. 
                Ce barème couvre l'ensemble des frais liés à l'utilisation de votre véhicule : carburant, 
                assurance, entretien et amortissement.
              </p>
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
