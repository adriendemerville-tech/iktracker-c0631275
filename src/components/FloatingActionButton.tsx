import { Plus } from 'lucide-react';
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
      variant="gradient"
      className="fixed bottom-6 right-6 rounded-full px-6 py-6 shadow-lg shadow-primary/30 z-50 animate-cta-pulse"
      aria-label="Nouveau trajet"
    >
      <Plus className="w-5 h-5 mr-2" />
      Nouveau trajet
    </Button>
  );
};
