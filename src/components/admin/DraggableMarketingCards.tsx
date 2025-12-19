import { useState, useEffect, ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Move } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MarketingCardData {
  id: string;
  icon: ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  isLoading: boolean;
}

interface SortableCardProps {
  card: MarketingCardData;
  isDesktop: boolean;
}

function SortableCard({ card, isDesktop }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: !isDesktop });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''} ${isDesktop ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {isDesktop && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 cursor-grab active:cursor-grabbing p-1.5 rounded-md bg-muted/80 hover:bg-muted transition-colors"
        >
          <Move className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {card.icon}
          <span className="text-xs text-muted-foreground">{card.label}</span>
        </div>
        {card.isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <p className="text-2xl font-bold">{card.value}</p>
            {card.subValue && <p className="text-xs text-muted-foreground">{card.subValue}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface DraggableMarketingCardsProps {
  cards: MarketingCardData[];
  storageKey?: string;
}

export function DraggableMarketingCards({ cards, storageKey = 'marketing-cards-order' }: DraggableMarketingCardsProps) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  
  const [orderedCards, setOrderedCards] = useState<MarketingCardData[]>(cards);

  // Load saved order from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        const reordered = orderIds
          .map(id => cards.find(c => c.id === id))
          .filter((c): c is MarketingCardData => c !== undefined);
        
        // Add any new cards that weren't in saved order
        const newCards = cards.filter(c => !orderIds.includes(c.id));
        setOrderedCards([...reordered, ...newCards]);
      } catch {
        setOrderedCards(cards);
      }
    } else {
      setOrderedCards(cards);
    }
  }, [cards, storageKey]);

  // Update cards when data changes but preserve order
  useEffect(() => {
    setOrderedCards(prev => {
      const newOrder = prev.map(oldCard => {
        const updated = cards.find(c => c.id === oldCard.id);
        return updated || oldCard;
      }).filter(c => cards.some(card => card.id === c.id));
      
      // Add any new cards
      const newCards = cards.filter(c => !prev.some(p => p.id === c.id));
      return [...newOrder, ...newCards];
    });
  }, [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedCards((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save to localStorage
        localStorage.setItem(storageKey, JSON.stringify(newOrder.map(c => c.id)));
        
        return newOrder;
      });
    }
  };

  if (!isDesktop) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {orderedCards.map((card) => (
          <SortableCard key={card.id} card={card} isDesktop={false} />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={orderedCards.map(c => c.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {orderedCards.map((card) => (
            <SortableCard key={card.id} card={card} isDesktop={true} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
