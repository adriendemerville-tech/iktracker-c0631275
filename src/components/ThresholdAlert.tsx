import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { getIKBareme } from '@/types/trip';

interface ThresholdAlertProps {
  totalKm: number;
  fiscalPower: number;
  variant?: 'home' | 'report';
}

const THRESHOLDS = [5000, 20000];

export function ThresholdAlert({ totalKm, fiscalPower, variant = 'home' }: ThresholdAlertProps) {
  const bareme = getIKBareme(fiscalPower);
  
  // Determine which threshold we're approaching or just crossed
  let alertMessage: string | null = null;
  let justCrossed = false;
  let isRateIncreasing = false;

  for (const threshold of THRESHOLDS) {
    const kmUntilThreshold = threshold - totalKm;
    
    // Just crossed (within 200km after threshold)
    if (kmUntilThreshold < 0 && kmUntilThreshold >= -200) {
      justCrossed = true;
      
      if (threshold === 5000) {
        // Rate changes from upTo5000 to from5001To20000
        isRateIncreasing = false; // Rate decreases but fixed amount is added
        alertMessage = `Vous venez de passer la barre des ${threshold.toLocaleString('fr-FR')} km, votre nouveau barème a changé.`;
      } else if (threshold === 20000) {
        // Rate changes from from5001To20000 to over20000
        isRateIncreasing = bareme.over20000.rate > bareme.from5001To20000.rate;
        alertMessage = `Vous venez de passer la barre des ${threshold.toLocaleString('fr-FR')} km, votre nouveau barème a ${isRateIncreasing ? 'augmenté' : 'baissé'}.`;
      }
      break;
    }
    
    // Approaching threshold (within 200km before)
    if (kmUntilThreshold > 0 && kmUntilThreshold <= 200) {
      if (threshold === 5000) {
        // After 5000km, rate per km decreases but fixed amount is added
        alertMessage = `Attention, dans ${Math.round(kmUntilThreshold)} km vous passez à la tranche supérieure, votre calcul d'indemnité va changer.`;
      } else if (threshold === 20000) {
        // After 20000km, rate changes
        isRateIncreasing = bareme.over20000.rate > bareme.from5001To20000.rate;
        alertMessage = `Attention, dans ${Math.round(kmUntilThreshold)} km vous passez à la tranche supérieure, votre indemnité par km va ${isRateIncreasing ? 'augmenter' : 'baisser'}.`;
      }
      break;
    }
  }

  if (!alertMessage) return null;

  const isHome = variant === 'home';
  
  return (
    <div className={`flex items-start gap-2 text-sm px-3 py-2 rounded-md ${
      isHome 
        ? 'text-muted-foreground bg-muted/50' 
        : 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30'
    }`}>
      {justCrossed ? (
        <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isHome ? 'text-muted-foreground' : 'text-orange-500'}`} />
      ) : (
        <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isHome ? 'text-muted-foreground' : 'text-orange-500'}`} />
      )}
      <span>{alertMessage}</span>
    </div>
  );
}
