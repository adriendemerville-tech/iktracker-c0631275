import { ReactNode } from 'react';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Move, Columns3 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type CardWidth = 1 | 2 | 3;

interface DraggableStatsSectionProps {
  id: string;
  children: ReactNode;
  className?: string;
  isCard?: boolean;
  isDraggable?: boolean;
  cardWidth?: CardWidth;
  onWidthChange?: (id: string, width: CardWidth) => void;
}

const widthClassMap: Record<CardWidth, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
};

const widthLabels: Record<CardWidth, string> = {
  1: '⅓',
  2: '⅔',
  3: '3/3',
};

function cycleWidth(current: CardWidth): CardWidth {
  if (current === 3) return 2;
  if (current === 2) return 1;
  return 3;
}

export function DraggableStatsSection({ 
  id, children, className = '', isCard = true, isDraggable = true,
  cardWidth = 3, onWidthChange 
}: DraggableStatsSectionProps) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const canDrag = isDesktop && isDraggable;
  const canResize = isDesktop && !!onWidthChange;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto' as const,
  };

  if (!isDesktop) {
    return isCard ? (
      <Card className={`w-full ${className}`}>{children}</Card>
    ) : (
      <div className={`w-full ${className}`}>{children}</div>
    );
  }

  const Wrapper = isCard ? Card : 'div';
  const gridClass = onWidthChange ? widthClassMap[cardWidth] : '';

  return (
    <div className={`relative ${gridClass}`}>
      {/* Drop indicator above */}
      <div
        className={`transition-all duration-200 rounded-md ${
          isOver && !isDragging
            ? 'h-16 mb-2 border-2 border-dashed border-primary/40 bg-primary/5'
            : 'h-0'
        }`}
      />
      <Wrapper
        ref={setNodeRef}
        style={style}
        className={`w-full h-full relative group/card transition-shadow duration-200 ${
          isDragging ? 'shadow-2xl ring-2 ring-primary scale-[1.01]' : ''
        } ${className}`}
      >
        {canDrag && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-3 right-3 z-10 cursor-grab active:cursor-grabbing p-1.5 rounded-md bg-muted/80 hover:bg-muted transition-colors opacity-0 group-hover/card:opacity-100"
          >
            <Move className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        )}

        {/* Width resize handle — right edge, vertically centered */}
        {canResize && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWidthChange(id, cycleWidth(cardWidth));
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 flex items-center gap-1 px-1.5 py-1 rounded-md border border-border bg-card shadow-md opacity-0 group-hover/card:opacity-100 hover:!opacity-100 hover:bg-accent transition-all duration-150 cursor-pointer"
            title={`Largeur : ${widthLabels[cardWidth]} → ${widthLabels[cycleWidth(cardWidth)]}`}
          >
            <Columns3 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{widthLabels[cardWidth]}</span>
          </button>
        )}

        {children}
      </Wrapper>
    </div>
  );
}
