import { Car } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const FloatingActionButton = ({ onClick, disabled }: FloatingActionButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 z-50 p-0 animate-cta-pulse"
      aria-label="Nouveau trajet"
    >
      <Car className="w-6 h-6 text-primary-foreground" />
    </Button>
  );
};
