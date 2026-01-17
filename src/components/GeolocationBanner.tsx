import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GeolocationBannerProps {
  onActivate: () => void;
  onDismiss: () => void;
  isLoading?: boolean;
  className?: string;
}

export function GeolocationBanner({
  onActivate,
  onDismiss,
  isLoading = false,
  className,
}: GeolocationBannerProps) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center gap-3 px-4 py-3 mx-4 bg-primary/10 border border-primary/20 rounded-lg max-w-sm',
        'animate-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
      
      <Button
        size="sm"
        onClick={onActivate}
        disabled={isLoading}
        className="flex-shrink-0"
      >
        {isLoading ? 'Activation...' : 'Activer la localisation'}
      </Button>
      
      <button
        onClick={onDismiss}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
