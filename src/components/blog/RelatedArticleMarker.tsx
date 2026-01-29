import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelatedArticleMarkerProps {
  id: string;
  isDraggable?: boolean;
}

export function RelatedArticleMarker({ id, isDraggable = true }: RelatedArticleMarkerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative my-4 p-3 rounded-lg border-2 border-dashed transition-all duration-200",
        "bg-primary/5 border-primary/30 hover:border-primary/50 hover:bg-primary/10",
        isDragging && "shadow-lg ring-2 ring-primary scale-[1.02]",
        isDraggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="flex items-center gap-3">
        {isDraggable && (
          <div
            {...attributes}
            {...listeners}
            className="p-1 rounded hover:bg-primary/20 transition-colors"
          >
            <GripVertical className="w-4 h-4 text-primary/70" />
          </div>
        )}
        <Newspaper className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <span className="text-sm font-medium text-primary">
            📰 Carte "À lire également"
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Glissez pour repositionner dans l'article
          </p>
        </div>
      </div>
    </div>
  );
}
