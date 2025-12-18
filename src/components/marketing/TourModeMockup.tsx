import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Car, Signal, Moon, Sun } from 'lucide-react';

interface TourModeMockupProps {
  className?: string;
}

export function TourModeMockup({ className }: TourModeMockupProps) {
  const [stopsCount, setStopsCount] = useState(1);
  const [displayedKm, setDisplayedKm] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isKmPulsing, setIsKmPulsing] = useState(false);
  const prevStopsRef = useRef(stopsCount);
  
  // Animate stops count with pulse
  useEffect(() => {
    const timer = setInterval(() => {
      setStopsCount(prev => (prev % 4) + 1);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Trigger pulse when stops change
  useEffect(() => {
    if (stopsCount !== prevStopsRef.current) {
      setIsPulsing(true);
      const timeout = setTimeout(() => setIsPulsing(false), 300);
      prevStopsRef.current = stopsCount;
      return () => clearTimeout(timeout);
    }
  }, [stopsCount]);

  // Trigger km pulse when stops change
  useEffect(() => {
    if (stopsCount !== prevStopsRef.current) {
      setIsKmPulsing(true);
      const timeout = setTimeout(() => setIsKmPulsing(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [stopsCount]);

  // Animate km counter
  useEffect(() => {
    const targetKm = stopsCount * 15.5; // Approximate km per stop
    const duration = 500;
    const startValue = displayedKm;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (targetKm - startValue) * easeOut;
      
      setDisplayedKm(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [stopsCount]);

  return (
    <div className={cn("relative", className)}>
      {/* Phone frame - iPhone style */}
      <div className="relative w-[280px] h-[560px] bg-zinc-900 rounded-[3rem] p-2 shadow-2xl border border-zinc-700">
        {/* Side buttons */}
        <div className="absolute -left-[2px] top-24 w-1 h-8 bg-zinc-700 rounded-l-full" />
        <div className="absolute -left-[2px] top-36 w-1 h-12 bg-zinc-700 rounded-l-full" />
        <div className="absolute -left-[2px] top-52 w-1 h-12 bg-zinc-700 rounded-l-full" />
        <div className="absolute -right-[2px] top-32 w-1 h-16 bg-zinc-700 rounded-r-full" />
        
        {/* Screen */}
        <div className="w-full h-full bg-black rounded-[2.5rem] overflow-hidden relative">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-b-2xl z-10 flex items-center justify-center">
            <div className="w-16 h-4 bg-zinc-900 rounded-full flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
              <div className="w-1 h-1 rounded-full bg-zinc-700" />
            </div>
          </div>
          
          {/* Focus Tour View Content */}
          <div className="w-full h-full flex flex-col items-center justify-between py-10 px-4">
            {/* Top indicators */}
            <div className="w-full flex justify-between items-center px-2">
              <div className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-yellow-400 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <Moon className="w-3 h-3 text-indigo-400" />
                <Signal className="w-3 h-3 text-green-500" />
              </div>
            </div>

            {/* Time */}
            <div className="flex flex-col items-center mt-2">
              <span className="font-urbanist text-4xl font-bold text-zinc-400 tracking-tight">
                15:37
              </span>
            </div>

            {/* Central button */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-28 h-28 rounded-full flex items-center justify-center">
                {/* Rotating gradient border */}
                <span 
                  className="absolute inset-[-4px] rounded-full overflow-hidden"
                  style={{
                    background: 'conic-gradient(from 0deg, #f97316, #ef4444, #f97316, #fbbf24, #f97316)',
                    animation: 'rotate-gradient 2s linear infinite',
                  }}
                >
                  <span className="absolute inset-[4px] rounded-full bg-gradient-to-br from-blue-900 to-blue-800" />
                </span>
                
                {/* Speed lines */}
                <span className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
                  <span className="w-4 h-1 bg-orange-500 opacity-60 rounded-full" />
                  <span className="w-6 h-1 bg-orange-500 opacity-40 rounded-full -ml-1" />
                  <span className="w-3 h-1 bg-orange-500 opacity-50 rounded-full" />
                </span>
                
                {/* Car icon */}
                <Car 
                  className="w-14 h-14 text-orange-500 relative z-10"
                  style={{
                    animation: 'car-drive 0.2s ease-in-out infinite',
                  }}
                />
              </div>
              
              <span className="text-zinc-500 text-xs font-urbanist">
                Mode nuit actif
              </span>
            </div>

            {/* Bottom counters */}
            <div className="flex items-end justify-center gap-10 w-full mt-auto">
              {/* KM Counter */}
              <div className="flex flex-col items-center">
                <span 
                  className={cn(
                    "font-urbanist text-3xl font-bold text-zinc-400 tabular-nums transition-all duration-500 ease-out",
                    isKmPulsing && "scale-110 text-zinc-300"
                  )}
                >
                  62.0
                </span>
                <span className="font-urbanist text-xs text-zinc-500 uppercase tracking-widest">
                  KM
                </span>
              </div>

              {/* Separator */}
              <div className="h-8 w-px bg-zinc-800" />

              {/* Stops Counter */}
              <div className="flex flex-col items-center">
                <span 
                  className={cn(
                    "font-urbanist text-3xl font-bold tabular-nums bg-clip-text text-transparent transition-transform duration-300",
                    isPulsing && "scale-125"
                  )}
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #f97316, #ef4444, #f97316, #fbbf24, #f97316)',
                    backgroundSize: '100% 300%',
                    animation: 'gradient-scroll 6s linear infinite',
                  }}
                >
                  {stopsCount}
                </span>
                <span className="font-urbanist text-xs text-white uppercase tracking-widest font-bold">
                  {stopsCount === 1 ? 'ÉTAPE' : 'ÉTAPES'}
                </span>
              </div>
            </div>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-zinc-700 rounded-full" />
        </div>
      </div>

      {/* Decorative glow effects */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-accent/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Floating particles */}
      <div className="absolute top-10 right-0 w-2 h-2 bg-orange-500/50 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-20 left-0 w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
    </div>
  );
}
