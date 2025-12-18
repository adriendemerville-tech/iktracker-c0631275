import { Car } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourButtonProps {
  isActive: boolean;
  isLoading?: boolean;
  totalDistanceKm?: number;
  stopsCount?: number;
  onClick: () => void;
}

export function TourButton({ 
  isActive, 
  isLoading, 
  totalDistanceKm = 0, 
  stopsCount = 0,
  onClick 
}: TourButtonProps) {
  // Display distance as whole number only
  const displayDistance = Math.floor(totalDistanceKm);

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center relative",
        "focus:outline-none focus:ring-4 focus:ring-offset-2",
        "transition-all duration-[8000ms] ease-[cubic-bezier(0.4,0,0.1,1)]",
        isActive
          ? "bg-gradient-primary text-orange-500 focus:ring-accent/50 scale-100"
          : "bg-gradient-primary text-white focus:ring-primary/50 hover:scale-105 animate-cta-pulse shadow-[0_0_16px_2px_rgba(59,130,246,0.35)]",
        isLoading && "opacity-70 cursor-wait"
      )}
      aria-label={isActive ? "Arrêter la tournée" : "Démarrer une tournée"}
    >
      {/* Rotating gradient border - only when active */}
      {isActive && (
        <span 
          className="absolute inset-[-3px] rounded-full overflow-hidden"
          style={{
            background: 'conic-gradient(from 0deg, #f97316, #ef4444, #f97316, #fbbf24, #f97316)',
            animation: 'rotate-gradient 3s linear infinite',
          }}
        >
          <span className="absolute inset-[3px] rounded-full bg-gradient-primary" />
        </span>
      )}
      
      {/* Loading spinner - minimal ring */}
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center z-20">
          <span className="w-14 h-14 rounded-full border-2 border-transparent border-t-primary animate-[spin_0.5s_linear_infinite]" />
        </span>
      )}
      
      {/* Speed lines - fade in/out based on active state */}
      <span className={cn(
        "absolute left-2.5 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 transition-opacity duration-[8000ms] ease-[cubic-bezier(0.4,0,0.1,1)] z-10",
        isActive && !isLoading ? "opacity-100" : "opacity-0"
      )}>
        <span className="w-2 h-0.5 bg-current opacity-60 rounded-full" />
        <span className="w-3 h-0.5 bg-current opacity-40 rounded-full -ml-0.5" />
      </span>
      
      {/* Dot in front when inactive */}
      {!isActive && !isLoading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full" />
      )}
      
      {/* Car icon with driving animation when active */}
      <Car 
        className={cn(
          "w-7 h-7 relative z-10 transition-colors duration-[8000ms] ease-[cubic-bezier(0.4,0,0.1,1)]",
          isLoading && "opacity-50"
        )}
        style={isActive && !isLoading ? {
          animation: 'car-drive 0.3s ease-in-out infinite',
        } : undefined}
      />
      
      {/* Stops count badge - top right */}
      {isActive && stopsCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold shadow-md z-20">
          {stopsCount}
        </span>
      )}
      
      {/* Distance badge - bottom left */}
      {isActive && displayDistance > 0 && (
        <span 
          className="absolute -bottom-1 -left-1 min-w-5 h-5 px-1 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md z-20"
        >
          {displayDistance}
        </span>
      )}
    </button>
  );
}
