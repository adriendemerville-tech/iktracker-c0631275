import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface FloatingActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const FloatingActionButton = ({ onClick, disabled }: FloatingActionButtonProps) => {
  const isMobile = useIsMobile();

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="gradient"
      className="fixed bottom-6 right-6 rounded-full px-6 py-6 shadow-lg shadow-primary/30 z-50 animate-cta-pulse"
      aria-label="Nouveau trajet"
    >
      <Plus className="w-5 h-5" />
      {!isMobile && <span className="ml-2">Nouveau trajet</span>}
    </Button>
  );
};
