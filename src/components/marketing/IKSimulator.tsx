import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { getIKBareme, calculateTotalAnnualIK } from "@/types/trip";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import { useMarketingTracker } from "@/hooks/useMarketingTracker";

interface IKSimulatorProps {
  idSuffix?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  trackerPage?: string;
}

export const IKSimulator = ({
  idSuffix = "",
  title = "Simulateur indemnités kilométriques 2026",
  subtitle = "Calculez vos indemnités kilométriques 2026 en quelques secondes avec notre simulateur basé sur le barème IK 2026.",
  className = "",
  trackerPage = "landing",
}: IKSimulatorProps) => {
  const { trackIKSimulation, trackCTAClick } = useMarketingTracker(trackerPage);
  const [fiscalPower, setFiscalPower] = useState<string>("5");
  const [annualKm, setAnnualKm] = useState<string>("10000");
  const [isElectric, setIsElectric] = useState<boolean>(false);

  const hasTracked = useRef(false);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (!hasTracked.current) {
      const t = setTimeout(() => { trackIKSimulation(); hasTracked.current = true; }, 1000);
      return () => clearTimeout(t);
    }
  }, [fiscalPower, annualKm, isElectric, trackIKSimulation]);

  const simulation = useMemo(() => {
    const cv = parseInt(fiscalPower) || 5;
    const km = parseInt(annualKm) || 0;
    const bareme = getIKBareme(cv);
    const totalIK = calculateTotalAnnualIK(km, cv);
    const electricBonus = isElectric ? totalIK * 0.20 : 0;
    const totalWithBonus = totalIK + electricBonus;
    let bracket = "", rate = 0;
    if (km <= 5000) { bracket = "jusqu'à 5 000 km"; rate = bareme.upTo5000.rate; }
    else if (km <= 20000) { bracket = "de 5 001 à 20 000 km"; rate = bareme.from5001To20000.rate; }
    else { bracket = "plus de 20 000 km"; rate = bareme.over20000.rate; }
    return { totalIK, totalWithBonus, electricBonus, bracket, rate };
  }, [fiscalPower, annualKm, isElectric]);

  const fpId = `fiscalPower${idSuffix}`;
  const kmId = `annualKm${idSuffix}`;
  const evId = `electric${idSuffix}`;

  return (
    <div className={className}>
      <div className="text-center mb-8">
        <h2 id={`simulateur${idSuffix}`} className="text-2xl md:text-3xl font-bold mb-4">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor={fpId} className="text-sm font-medium">Puissance fiscale du véhicule</Label>
                <Select value={fiscalPower} onValueChange={setFiscalPower}>
                  <SelectTrigger id={fpId} className="mt-1.5">
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
                <Label htmlFor={kmId} className="text-sm font-medium">Kilomètres annuels estimés</Label>
                <Input id={kmId} type="number" value={annualKm} onChange={(e) => setAnnualKm(e.target.value)} placeholder="Ex: 15000" className="mt-1.5" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <Label htmlFor={evId} className="text-sm font-medium cursor-pointer">Véhicule 100% électrique</Label>
                    <p className="text-xs text-muted-foreground">Majoration de 20%</p>
                  </div>
                </div>
                <Switch id={evId} checked={isElectric} onCheckedChange={setIsElectric} />
              </div>
            </div>

            <div className={`rounded-xl p-6 flex flex-col justify-center ${isElectric ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/20' : 'bg-gradient-to-br from-primary/5 to-primary/10'}`}>
              <p className="text-sm text-muted-foreground mb-1">
                Estimation IK 2026 {isElectric && <span className="text-emerald-600 dark:text-emerald-400 font-medium">(véhicule électrique)</span>}
              </p>
              <p className={`text-4xl font-bold mb-4 ${isElectric ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}>
                {simulation.totalWithBonus.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
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
            <p className="text-sm text-muted-foreground mb-4">Automatisez le calcul de vos IK tout au long de l'année avec IKtracker</p>
            <Link to="/signup" onClick={trackCTAClick}>
              <Button variant="gradient" size="lg" className="gap-2">
                Automatiser mes {simulation.totalWithBonus.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € d'IK
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-4">
              Consultez le{" "}
              <a href="https://www.impots.gouv.fr/simulateur-bareme-kilometrique" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
                simulateur officiel sur impots.gouv.fr
              </a>
              {" "}pour vérifier vos calculs.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IKSimulator;
