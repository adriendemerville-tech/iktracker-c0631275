import { useState, useEffect } from 'react';
import { Signal, Sun } from 'lucide-react';

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
      <div className="absolute top-4 right-4">
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

      {/* CENTER: Tour button with pulse animation */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          {/* Pulse animation rings */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 animate-pulse-glow opacity-40 scale-110" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 animate-pulse-glow-delayed opacity-30 scale-125" />
          
          {/* Main button */}
          <button
            onClick={onStop}
            className="relative w-40 h-40 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/30 transition-transform active:scale-95"
          >
            <span className="font-urbanist text-lg font-bold text-white tracking-wider">
              ARRÊTER
            </span>
          </button>
        </div>
        
        <span className="text-gray-500 text-sm font-urbanist">
          Tournée en cours
        </span>
      </div>

      {/* BOTTOM: Counters */}
      <div className="flex items-end justify-center gap-16 w-full">
        {/* KM Counter */}
        <div className="flex flex-col items-center">
          <span className="font-urbanist text-5xl font-bold text-white tabular-nums">
            {displayedKm.toFixed(1)}
          </span>
          <span className="font-urbanist text-sm text-gray-500 mt-1 uppercase tracking-widest">
            KM
          </span>
        </div>

        {/* Separator */}
        <div className="h-12 w-px bg-gray-800" />

        {/* Stops Counter */}
        <div className="flex flex-col items-center">
          <span className="font-urbanist text-5xl font-bold text-white tabular-nums">
            {stopsCount}
          </span>
          <span className="font-urbanist text-sm text-gray-500 mt-1 uppercase tracking-widest">
            ÉTAPES
          </span>
        </div>
      </div>
    </div>
  );
}
