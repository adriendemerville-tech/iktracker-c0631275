import { useState, useEffect } from 'react';
import { Signal, Sun, Moon, Car } from 'lucide-react';
import { useNightMode } from '@/hooks/useNightMode';

interface FocusTourViewProps {
  isActive: boolean;
  totalDistanceKm: number;
  stopsCount: number;
  wakeLockActive: boolean;
  lowBattery: boolean;
  onStop: () => void;
}

export function FocusTourView({
  isActive,
  totalDistanceKm,
  stopsCount,
  wakeLockActive,
  lowBattery,
  onStop,
}: FocusTourViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayedKm, setDisplayedKm] = useState(0);
  const { isNightMode } = useNightMode({ startHour: 17, endHour: 7 });

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

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between py-12 px-6">
      {/* GPS Signal indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {isNightMode && (
          <Moon className="w-4 h-4 text-indigo-400" />
        )}
        <Signal className="w-4 h-4 text-green-500" />
      </div>

      {/* Wake lock indicator */}
      {wakeLockActive && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5">
          <Sun className="w-4 h-4 text-yellow-400" />
        </div>
      )}

      {/* Low battery warning */}
      {lowBattery && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-orange-500/20 border border-orange-500/40 rounded-lg px-3 py-1.5">
          <span className="text-orange-400 text-xs font-urbanist">
            Batterie faible - Branchez sur l'allume-cigare
          </span>
        </div>
      )}

      {/* TOP: Current time */}
      <div className="flex flex-col items-center">
        <span className="font-urbanist text-6xl font-bold text-gray-400 tracking-tight">
          {formatTime(currentTime)}
        </span>
      </div>

      {/* CENTER: Tour button with exact TourButton active design */}
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={onStop}
          className="relative w-40 h-40 rounded-full flex items-center justify-center bg-gradient-primary text-orange-500 shadow-2xl transition-transform active:scale-95"
          aria-label="Arrêter la tournée"
        >
          {/* Rotating gradient border - 30% wider */}
          <span 
            className="absolute inset-[-6px] rounded-full overflow-hidden"
            style={{
              background: 'conic-gradient(from 0deg, #f97316, #ef4444, #f97316, #fbbf24, #f97316)',
              animation: 'rotate-gradient 2s linear infinite',
            }}
          >
            <span className="absolute inset-[6px] rounded-full bg-gradient-primary" />
          </span>
          
          {/* Speed lines behind the car - 50% bigger */}
          <span className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
            <span className="w-7 h-1.5 bg-current opacity-60 rounded-full" />
            <span className="w-10 h-1.5 bg-current opacity-40 rounded-full -ml-1" />
            <span className="w-5 h-1.5 bg-current opacity-50 rounded-full" />
          </span>
          
          {/* Car icon with driving animation - 50% bigger */}
          <Car 
            className="w-24 h-24 relative z-10"
            style={{
              animation: 'car-drive 0.2s ease-in-out infinite',
            }}
          />
        </button>
        
        <span className="text-gray-500 text-sm font-urbanist">
          {isNightMode ? 'Mode nuit actif' : 'Tournée en cours'}
        </span>
      </div>

      {/* BOTTOM: Counters */}
      <div className="flex items-end justify-center gap-16 w-full">
        {/* KM Counter */}
        <div className="flex flex-col items-center">
          <span className="font-urbanist text-5xl font-bold text-gray-400 tabular-nums">
            {displayedKm.toFixed(1)}
          </span>
          <span className="font-urbanist text-sm text-gray-500 mt-1 uppercase tracking-widest">
            KM
          </span>
        </div>

        {/* Separator */}
        <div className="h-12 w-px bg-gray-800" />

        {/* Stops Counter - gradient orange-red with animation */}
        <div className="flex flex-col items-center">
          <span 
            className="font-urbanist text-5xl font-bold tabular-nums bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(180deg, #f97316, #ef4444, #f97316, #fbbf24, #f97316)',
              backgroundSize: '100% 300%',
              animation: 'gradient-scroll 6s linear infinite',
            }}
          >
            {stopsCount}
          </span>
          <span className="font-urbanist text-sm text-white mt-1 uppercase tracking-widest font-bold">
            {stopsCount === 1 ? 'ÉTAPE' : 'ÉTAPES'}
          </span>
        </div>
      </div>
    </div>
  );
}
