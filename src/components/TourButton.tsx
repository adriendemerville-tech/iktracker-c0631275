import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourButtonProps {
  isActive: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

export function TourButton({ isActive, isLoading, onClick }: TourButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
        "focus:outline-none focus:ring-4 focus:ring-offset-2",
        isActive
          ? "bg-accent text-accent-foreground focus:ring-accent/50 animate-pulse"
          : "bg-gradient-primary text-primary-foreground focus:ring-primary/50 hover:scale-105",
        isLoading && "opacity-70 cursor-wait"
      )}
      aria-label={isActive ? "Arrêter la tournée" : "Démarrer une tournée"}
    >
      <Truck className={cn("w-7 h-7", isLoading && "animate-bounce")} />
    </button>
  );
}
