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
        "transition-all duration-500",
        isActive
          ? "focus:ring-[#25D366]/50"
          : "focus:ring-primary/50 hover:scale-105",
        isLoading && "opacity-70 cursor-wait"
      )}
      aria-label={isActive ? "Arrêter la tournée" : "Démarrer une tournée"}
    >
      {/* Rotating border - clockwise animation when active */}
      {isActive && (
        <span 
          className="absolute inset-[-3px] rounded-full z-0"
          style={{
            background: 'conic-gradient(from 0deg, #25D366, #128C7E, #0F7B6C, #25D366)',
            animation: 'spin 2s linear infinite',
            boxShadow: '0 0 16px 2px rgba(37, 211, 102, 0.5)',
          }}
        />
      )}

      {/* Background with gradient */}
      <span 
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-1000 z-[1]",
          isActive 
            ? "animate-tour-gradient-active" 
            : "animate-tour-gradient-idle"
        )}
        style={{
          background: isActive 
            ? 'linear-gradient(135deg, #25D366 0%, #128C7E 50%, #25D366 100%)'
            : 'linear-gradient(135deg, #2661D9 0%, #1E4BA8 50%, #2661D9 100%)',
          backgroundSize: '200% 200%',
        }}
      />
      
      {/* Loading spinner - minimal ring */}
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center z-[20]">
          <span className="w-14 h-14 rounded-full border-2 border-transparent border-t-white animate-[spin_0.5s_linear_infinite]" />
        </span>
      )}
      
      {/* Speed lines - fade in/out based on active state, animated with car */}
      <span className={cn(
        "absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity duration-500 z-[10]",
        isActive && !isLoading ? "opacity-100 animate-speed-lines" : "opacity-0"
      )}>
        <span className="w-2 h-0.5 bg-white/70 rounded-full" />
        <span className="w-3 h-0.5 bg-white/50 rounded-full -ml-0.5" />
        <span className="w-2.5 h-0.5 bg-white/60 rounded-full -ml-1" />
      </span>
      
      {/* Dot in front when inactive */}
      {!isActive && !isLoading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full z-[10]" />
      )}
      
      {/* Car icon with driving animation when active */}
      <Car 
        className={cn(
          "w-7 h-7 relative z-[10] text-white transition-all duration-500",
          isLoading && "opacity-50"
        )}
        style={isActive && !isLoading ? {
          animation: 'car-drive 0.3s ease-in-out infinite',
        } : undefined}
      />
      
      {/* Stops count badge - top right */}
      {isActive && stopsCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold shadow-md z-[20]">
          {stopsCount}
        </span>
      )}
      
      {/* Distance badge - bottom left */}
      {isActive && displayDistance > 0 && (
        <span 
          className="absolute -bottom-1 -left-1 min-w-5 h-5 px-1 bg-[#25D366] text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md z-[20]"
        >
          {displayDistance}
        </span>
      )}
    </button>
  );
}
