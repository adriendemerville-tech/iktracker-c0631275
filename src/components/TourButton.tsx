import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourButtonProps {
  isActive: boolean;
  isLoading?: boolean;
  distanceFromLastStop?: number; // in meters
  stopsCount?: number;
  onClick: () => void;
}

export function TourButton({ 
  isActive, 
  isLoading, 
  distanceFromLastStop = 0, 
  stopsCount = 0,
  onClick 
}: TourButtonProps) {
  // Format distance in km (rounded to unit)
  const distanceKm = Math.round(distanceFromLastStop / 1000);

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg relative",
        "focus:outline-none focus:ring-4 focus:ring-offset-2",
        isActive
          ? "bg-accent text-accent-foreground focus:ring-accent/50"
          : "bg-gradient-primary text-primary-foreground focus:ring-primary/50 hover:scale-105",
        isLoading && "opacity-70 cursor-wait"
      )}
      style={isActive ? { 
        animation: 'orange-border-glow 2s ease-in-out infinite',
      } : undefined}
      aria-label={isActive ? "Arrêter la tournée" : "Démarrer une tournée"}
    >
      <Truck className={cn("w-7 h-7", isLoading && "animate-bounce")} />
      
      {/* Stops count badge - top right */}
      {isActive && stopsCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold shadow-md">
          {stopsCount}
        </span>
      )}
      
      {/* Distance badge - bottom left */}
      {isActive && distanceKm > 0 && (
        <span 
          className="absolute -bottom-1 -left-1 min-w-5 h-5 px-1 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md"
        >
          {distanceKm}
        </span>
      )}
    </button>
  );
}
