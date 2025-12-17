import { Truck } from 'lucide-react';
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
        "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg relative",
        "focus:outline-none focus:ring-4 focus:ring-offset-2",
        isActive
          ? "bg-accent text-orange-500 focus:ring-accent/50"
          : "bg-white text-muted-foreground focus:ring-primary/50 hover:scale-105",
        isLoading && "opacity-70 cursor-wait"
      )}
      style={isActive ? { 
        animation: 'orange-border-glow 2s ease-in-out infinite',
      } : undefined}
      aria-label={isActive ? "Arrêter la tournée" : "Démarrer une tournée"}
    >
      {/* Speed lines - only visible when active */}
      {isActive && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
          <span className="w-2 h-0.5 bg-current opacity-60 rounded-full" />
          <span className="w-3 h-0.5 bg-current opacity-40 rounded-full -ml-0.5" />
        </span>
      )}
      
      {/* Dot in front when inactive */}
      {!isActive && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-muted-foreground/40 rounded-full" />
      )}
      
      <Truck className={cn("w-7 h-7 relative z-10", isLoading && "animate-bounce")} />
      
      {/* Stops count badge - top right */}
      {isActive && stopsCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold shadow-md">
          {stopsCount}
        </span>
      )}
      
      {/* Distance badge - bottom left */}
      {isActive && displayDistance > 0 && (
        <span 
          className="absolute -bottom-1 -left-1 min-w-5 h-5 px-1 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md"
        >
          {displayDistance}
        </span>
      )}
    </button>
  );
}
