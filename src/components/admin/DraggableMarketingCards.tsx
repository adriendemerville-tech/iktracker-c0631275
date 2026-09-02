import { useState, useEffect, ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Move } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MarketingCardData {
  id: string;
  icon: ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  isLoading: boolean;
  header?: ReactNode;
}

interface SortableCardProps {
  card: MarketingCardData;
  isDesktop: boolean;
}

function SortableCard({ card, isDesktop }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !isDesktop,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`relative group/card overflow-hidden ${isDragging ? "shadow-lg ring-2 ring-primary" : ""} ${isDesktop ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {isDesktop && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 cursor-grab active:cursor-grabbing p-1.5 rounded-md bg-muted/80 hover:bg-muted transition-colors opacity-0 group-hover/card:opacity-100"
        >
          <Move className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5 min-h-[22px]">
          {card.header ? (
            card.header
          ) : (
            <>
              <span className="[&_svg]:w-4 [&_svg]:h-4 shrink-0">{card.icon}</span>
              <span className="text-[11px] leading-tight text-muted-foreground truncate">
                {card.label}
              </span>
            </>
          )}
        </div>
        {card.isLoading ? (
          <Skeleton className="h-6 w-14" />
        ) : (
          <>
            <p className="text-xl font-bold">{card.value}</p>
            {card.subValue && (
              <p className="text-[11px] leading-tight text-muted-foreground truncate">
                {card.subValue}
              </p>
            )}
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

export function DraggableMarketingCards({
  cards,
  storageKey = "marketing-cards-order",
}: DraggableMarketingCardsProps) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  const [savedOrder, setSavedOrder] = useLayoutPreference<string[]>(storageKey, []);
  const [orderedCards, setOrderedCards] = useState<MarketingCardData[]>(cards);

  // Apply saved order (from DB/local cache) whenever it or the cards change
  useEffect(() => {
    const reordered = savedOrder
      .map((id) => cards.find((c) => c.id === id))
      .filter((c): c is MarketingCardData => c !== undefined);
    const newCards = cards.filter((c) => !savedOrder.includes(c.id));
    setOrderedCards([...reordered, ...newCards]);
  }, [cards, savedOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedCards.findIndex((i) => i.id === active.id);
      const newIndex = orderedCards.findIndex((i) => i.id === over.id);
      const newOrder = arrayMove(orderedCards, oldIndex, newIndex);
      setOrderedCards(newOrder);
      setSavedOrder(newOrder.map((c) => c.id));
    }
  };


  if (!isDesktop) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 auto-rows-fr">
        {orderedCards.map((card) => (
          <SortableCard key={card.id} card={card} isDesktop={false} />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedCards.map((c) => c.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-3 mb-6 auto-rows-fr">
          {orderedCards.map((card) => (
            <SortableCard key={card.id} card={card} isDesktop={true} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
