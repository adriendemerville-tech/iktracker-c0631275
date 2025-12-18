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
        'relative flex items-center gap-3 px-4 py-3 bg-primary/10 border border-primary/20 rounded-lg',
        'animate-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
        <MapPin className="w-5 h-5 text-primary" />
      </div>
      
      <p className="flex-1 text-sm text-foreground/90">
        L'activation de la localisation est nécessaire pour automatiser vos trajets.
      </p>
      
      <Button
        size="sm"
        onClick={onActivate}
        disabled={isLoading}
        className="flex-shrink-0"
      >
        {isLoading ? 'Activation...' : 'Activer'}
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
