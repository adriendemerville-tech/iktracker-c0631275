import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedPhoneMockup } from './AnimatedPhoneMockup';

interface CarouselSlide {
  title: string;
  description: string;
  screen: 'dashboard' | 'newTrip' | 'tour' | 'calendar';
}

interface AppCarouselProps {
  slides?: CarouselSlide[];
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}

const defaultSlides: CarouselSlide[] = [
  {
    title: "Tableau de bord",
    description: "Visualisez vos kilomètres et indemnités du mois en un coup d'œil.",
    screen: 'dashboard'
  },
  {
    title: "Nouveau trajet",
    description: "Ajoutez un trajet en quelques secondes avec calcul automatique des distances.",
    screen: 'newTrip'
  },
  {
    title: "Mode Tournée",
    description: "Enregistrez plusieurs arrêts en un seul trajet avec le GPS en temps réel.",
    screen: 'tour'
  },
  {
    title: "Sync Calendrier",
    description: "Importez vos rendez-vous Google ou Outlook automatiquement.",
    screen: 'calendar'
  }
];

export function AppCarousel({ slides = defaultSlides, autoPlay = true, interval = 5000, className }: AppCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoPlay) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      {/* Slides Container */}
      <div 
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div 
            key={index}
            className="min-w-full px-4"
          >
            <div className="grid md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
              {/* Mockup */}
              <div className="flex justify-center">
                <AnimatedPhoneMockup screen={slide.screen} />
              </div>
              
              {/* Text Content */}
              <div className="text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  {slide.title}
                </h3>
                <p className="text-muted-foreground text-lg">
                  {slide.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background"
        onClick={goToPrevious}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background"
        onClick={goToNext}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-6">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              index === currentIndex 
                ? "bg-primary w-8" 
                : "bg-muted hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}
