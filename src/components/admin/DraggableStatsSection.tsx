import { ReactNode } from 'react';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Move } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface DraggableStatsSectionProps {
  id: string;
  children: ReactNode;
  className?: string;
  isCard?: boolean;
  isDraggable?: boolean; // Explicitly control if drag handle should be shown
}

export function DraggableStatsSection({ id, children, className = '', isCard = true, isDraggable = true }: DraggableStatsSectionProps) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const canDrag = isDesktop && isDraggable;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  if (!isDesktop) {
    return isCard ? (
      <Card className={`w-full ${className}`}>{children}</Card>
    ) : (
      <div className={`w-full ${className}`}>{children}</div>
    );
  }

  const Wrapper = isCard ? Card : 'div';

  return (
    <Wrapper
      ref={setNodeRef}
      style={style}
      className={`w-full relative group ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''} ${className}`}
    >
      {canDrag && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-3 right-3 z-10 cursor-grab active:cursor-grabbing p-1.5 rounded-md bg-muted/80 hover:bg-muted transition-colors"
        >
          <Move className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      {children}
    </Wrapper>
  );
}
