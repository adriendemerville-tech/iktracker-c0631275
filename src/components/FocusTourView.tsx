import { useState, useEffect } from 'react';
import { Signal, SignalLow, SignalZero, Sun, Moon, Car, BatteryLow, Square, Radio, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNightMode } from '@/hooks/useNightMode';
import { cn } from '@/lib/utils';

interface PendingStop {
  lat: number;
  lng: number;
  arrivalTime: Date;
  address?: string;
  city?: string;
}

interface FocusTourViewProps {
  isActive: boolean;
  isLoading?: boolean;
  totalDistanceKm: number;
  detectedStopsCount: number; // Number of detected stops (excludes departure)
  wakeLockActive: boolean;
  lowBattery: boolean;
  tourStartTime?: Date;
  gpsSignalStrength?: 'excellent' | 'good' | 'poor' | 'lost';
  gpsAccuracy?: number | null;
  pendingStop?: PendingStop | null;
  onFinish: () => void; // Directly finish and save the tour
  onCancel?: () => void; // Cancel during loading
}

// Hook to detect if on desktop (width >= 1024px)
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  return isDesktop;
}

export function FocusTourView({
  isActive,
  isLoading,
  totalDistanceKm,
  detectedStopsCount,
  wakeLockActive,
  lowBattery,
  tourStartTime,
  gpsSignalStrength = 'lost',
  gpsAccuracy,
  pendingStop,
  onFinish,
  onCancel,
}: FocusTourViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayedKm, setDisplayedKm] = useState(0);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const { isNightMode } = useNightMode({ startHour: 17, endHour: 7 });

  const handleStopClick = () => {
    setShowStopConfirm(true);
  };

  const handleConfirmStop = () => {
    setShowStopConfirm(false);
    onFinish();
  };

  // Determine display mode based on distance
  // < 0.1 km (100m): show "DÉPART" with green-orange gradient
  // >= 0.1 km and < 1 km: still show "DÉPART"
  // >= 1 km: show stops counter (0 if no detected stops yet)
  const showDeparture = totalDistanceKm < 1;
  
  // Determine which gradient to use for stops counter
  // 0 stops: green-orange gradient (same as DÉPART)
  // 1+ stops: current orange-red gradient
  const useGreenOrangeGradient = showDeparture || detectedStopsCount === 0;

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Animate km counter
  useEffect(() => {
    const target = totalDistanceKm;
    const duration = 500;
    const startValue = displayedKm;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (target - startValue) * easeOut;
      
      setDisplayedKm(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [totalDistanceKm]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatElapsedTime = () => {
    if (!tourStartTime) return null;
    const elapsed = currentTime.getTime() - tourStartTime.getTime();
    const totalMinutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')} minutes`;
    }
    return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  };

  // Get GPS signal icon and color
  const getGpsSignalDisplay = () => {
    switch (gpsSignalStrength) {
      case 'excellent':
        return { icon: Signal, color: 'text-green-500', label: 'Excellent' };
      case 'good':
        return { icon: Signal, color: 'text-green-400', label: 'Bon' };
      case 'poor':
        return { icon: SignalLow, color: 'text-yellow-500', label: 'Faible' };
      case 'lost':
      default:
        return { icon: SignalZero, color: 'text-red-500', label: 'Perdu' };
    }
  };

  const gpsDisplay = getGpsSignalDisplay();
  const GpsIcon = gpsDisplay.icon;

  // Show only when active (removed loading banner)
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between py-12 px-6">
      {/* Top status bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        {/* Left side - Wake lock indicator */}
        <div className="flex items-center gap-2">
          {wakeLockActive && (
            <div className="flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-yellow-400" />
            </div>
          )}
        </div>
        
        {/* Right side - GPS Signal and Night mode */}
        <div className="flex items-center gap-2">
          {isNightMode && (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
            <GpsIcon className={cn("w-4 h-4", gpsDisplay.color)} />
            {gpsAccuracy !== null && gpsAccuracy !== undefined && (
              <span className={cn("text-xs font-mono", gpsDisplay.color)}>
                {gpsAccuracy.toFixed(0)}m
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TOP: Current time and tour duration */}
      <div className="flex flex-col items-center mt-8">
        <span className="font-urbanist text-6xl font-bold text-gray-400 tracking-tight">
          {formatTime(currentTime)}
        </span>
        {tourStartTime && (
          <span className="font-urbanist text-lg text-gray-600 mt-1 tabular-nums">
            {formatElapsedTime()}
          </span>
        )}
      </div>

      {/* CENTER: Tour button and stop button */}
      <div className="flex flex-col items-center gap-6">
        {/* Car button - triggers confirmation - Blue to green gradient over 10s */}
        <button
          onClick={handleStopClick}
          className="relative w-40 h-40 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 car-button-gradient"
          aria-label="Arrêter la tournée"
        >
          {/* Rotating gradient border - amber #D97706 */}
          <span 
            className="absolute inset-[-6px] rounded-full overflow-hidden opacity-100"
            style={{
              background: 'conic-gradient(from 0deg, #D97706, #F59E0B, #D97706, #B45309, #D97706)',
              animation: 'rotate-gradient 6s linear infinite',
            }}
          >
            <span 
              className="absolute inset-[6px] rounded-full car-button-gradient"
            />
          </span>
          
          {/* Speed lines behind the car - 50% bigger, white for contrast */}
          <span className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10 text-white">
            <span className="w-7 h-1.5 bg-current opacity-60 rounded-full" />
            <span className="w-10 h-1.5 bg-current opacity-40 rounded-full -ml-1" />
            <span className="w-5 h-1.5 bg-current opacity-50 rounded-full" />
          </span>
          
          {/* Car icon with driving animation - 50% bigger, white for contrast */}
          <Car 
            className="w-24 h-24 relative z-10 text-white"
            style={{
              animation: 'car-drive 0.2s ease-in-out infinite',
            }}
          />
        </button>
        
        {/* Stop button - elegant, compact design */}
        <button
          onClick={handleStopClick}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-gray-300 font-medium text-sm hover:bg-white/20 transition-all active:scale-95"
          aria-label="Arrêter la tournée"
        >
          <Square className="w-4 h-4 fill-current" />
          <span>Terminer</span>
        </button>
        
        <span className="text-gray-500 text-sm font-urbanist">
          {isNightMode ? 'Mode nuit actif' : 'Tournée en cours'}
        </span>
      </div>

      {/* Low battery warning - centered between button and counters */}
      {lowBattery && (
        <div className="w-[80%] max-w-xs bg-orange-500/20 border border-orange-500/40 rounded-xl px-5 py-2.5 flex items-center justify-center gap-3">
          <BatteryLow className="w-6 h-6 text-orange-400" />
          <span className="text-orange-400 text-base font-urbanist text-center">
            Batterie faible
          </span>
        </div>
      )}

      {/* GPS signal warning when poor or lost */}
      {(gpsSignalStrength === 'poor' || gpsSignalStrength === 'lost') && !lowBattery && (
        <div className={cn(
          "w-[80%] max-w-xs border rounded-xl px-5 py-2.5 flex items-center justify-center gap-3",
          gpsSignalStrength === 'lost' 
            ? "bg-red-500/20 border-red-500/40" 
            : "bg-yellow-500/20 border-yellow-500/40"
        )}>
          <Radio className={cn(
            "w-6 h-6",
            gpsSignalStrength === 'lost' ? "text-red-400" : "text-yellow-400"
          )} />
          <span className={cn(
            "text-base font-urbanist text-center",
            gpsSignalStrength === 'lost' ? "text-red-400" : "text-yellow-400"
          )}>
            {gpsSignalStrength === 'lost' ? 'Signal GPS perdu' : 'Signal GPS faible'}
          </span>
        </div>
      )}

      {/* Pending stop notification - only shown from the 2nd stop onwards */}
      {pendingStop && detectedStopsCount >= 1 && (
        <div className="w-[80%] max-w-xs bg-amber-500/20 border border-amber-500/40 rounded-xl px-5 py-3 flex items-center justify-center gap-3 animate-fade-in">
          <div className="flex flex-col items-center">
            <span className="text-amber-300 text-sm font-urbanist font-medium text-center">
              Arrêt détecté
            </span>
            <span className="text-amber-500/70 text-xs font-urbanist text-center">
              Validation en cours...
            </span>
          </div>
        </div>
      )}

      {/* BOTTOM: Counters with fixed widths to prevent CLS */}
      <div className="flex items-end justify-center gap-16 w-full">
        {/* KM Counter - fixed width for stable layout */}
        <div className="flex flex-col items-center min-w-[100px]">
          <span className="font-urbanist text-5xl font-bold text-gray-400 tabular-nums">
            {displayedKm.toFixed(1)}
          </span>
          <span className="font-urbanist text-sm text-gray-500 mt-1 uppercase tracking-widest">
            KM
          </span>
        </div>

        {/* Separator */}
        <div className="h-12 w-px bg-gray-800" />

        {/* Stops Counter or Departure indicator - fixed width */}
        <div className="flex flex-col items-center min-w-[100px]">
          {showDeparture ? (
            // Show "DÉPART" while under 1km
            <>
              <span 
                className="font-urbanist text-4xl font-bold bg-clip-text text-transparent uppercase tracking-wide"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #166534 0%, #22c55e 50%, #84cc16 75%, #f97316 100%)',
                }}
              >
                Départ
              </span>
              <span className="font-urbanist text-sm text-gray-500 mt-1 uppercase tracking-widest">
                &nbsp;
              </span>
            </>
          ) : (
            // Show stops counter once >= 1km
            <>
              <span 
                className="font-urbanist text-5xl font-bold tabular-nums bg-clip-text text-transparent"
                style={{
                  backgroundImage: useGreenOrangeGradient 
                    ? 'linear-gradient(180deg, #22c55e, #84cc16, #f97316, #22c55e)'
                    : 'linear-gradient(180deg, #f97316, #ef4444, #f97316, #fbbf24, #f97316)',
                  backgroundSize: '100% 300%',
                  animation: 'gradient-scroll 6s linear infinite',
                }}
              >
                {detectedStopsCount}
              </span>
              <span className="font-urbanist text-sm text-white mt-1 uppercase tracking-widest font-bold">
                {detectedStopsCount === 1 ? 'ÉTAPE' : 'ÉTAPES'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Stop confirmation dialog */}
      <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <AlertDialogContent className="max-w-[320px] p-6 rounded-2xl">
          <AlertDialogHeader className="pb-2">
            <AlertDialogTitle className="text-lg font-semibold text-center">Terminer la tournée ?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row items-center gap-3 pt-4 sm:space-x-0">
            <AlertDialogCancel className="flex-1 h-11 text-sm rounded-xl mt-0">
              Continuer
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStop}
              className="flex-1 h-11 text-sm rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Terminer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
