import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourButtonProps {
  isActive: boolean;
  isLoading?: boolean;
  distanceFromLastStop?: number; // in meters
  onClick: () => void;
}

export function TourButton({ isActive, isLoading, distanceFromLastStop = 0, onClick }: TourButtonProps) {
  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 100) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const distanceText = formatDistance(distanceFromLastStop);

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
      style={isActive ? { animation: 'gentle-glow 3s ease-in-out infinite' } : undefined}
      aria-label={isActive ? "Arrêter la tournée" : "Démarrer une tournée"}
    >
      <Truck className={cn("w-7 h-7", isLoading && "animate-bounce")} />
      
      {/* Distance indicator - only show when active and distance > 100m */}
      {isActive && distanceText && (
        <span 
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-yellow-400 animate-pulse whitespace-nowrap"
          style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
        >
          {distanceText}
        </span>
      )}
    </button>
  );
}
