import { useState, useEffect, useCallback, memo } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Testimonial {
  quote: string;
  name: string;
  job: string;
  city: string;
  stars: 4 | 5;
}

const testimonials: Testimonial[] = [
  {
    quote: "Je récupère enfin tous mes kilomètres sans prise de tête.",
    name: "Sophie",
    job: "Infirmière libérale",
    city: "Lyon",
    stars: 5,
  },
  {
    quote: "Le mode tournée enregistre mes arrêts automatiquement, je ne note plus rien.",
    name: "Karim",
    job: "Technicien fibre",
    city: "Toulouse",
    stars: 5,
  },
  {
    quote: "Mon comptable a adoré le PDF mensuel, tout est carré.",
    name: "Élodie",
    job: "Consultante RH",
    city: "Nantes",
    stars: 4,
  },
  {
    quote: "Fini les oublis, mes indemnités ont augmenté de 30%.",
    name: "Thomas",
    job: "Commercial terrain",
    city: "Bordeaux",
    stars: 5,
  },
  {
    quote: "Simple, rapide, gratuit. Que demander de plus ?",
    name: "Nadia",
    job: "Agent immobilier",
    city: "Marseille",
    stars: 5,
  },
  {
    quote: "La synchro calendrier m'évite de tout ressaisir.",
    name: "Julien",
    job: "Artisan plombier",
    city: "Strasbourg",
    stars: 4,
  },
  {
    quote: "Adopté en 5 minutes, je le recommande à tous mes collègues.",
    name: "Claire",
    job: "Sage-femme libérale",
    city: "Rennes",
    stars: 5,
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function TestimonialsCarouselComponent() {
  const [current, setCurrent] = useState(0);
  const visibleCount = typeof window !== 'undefined' && window.innerWidth >= 768 ? 3 : 1;
  const maxIndex = testimonials.length - visibleCount;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [maxIndex]);

  const prev = useCallback(() => {
    setCurrent(c => (c <= 0 ? maxIndex : c - 1));
  }, [maxIndex]);

  const next = useCallback(() => {
    setCurrent(c => (c >= maxIndex ? 0 : c + 1));
  }, [maxIndex]);

  return (
    <section className="py-12 md:py-20 px-4 section-contained">
      <div className="container mx-auto">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-10">
          Ils utilisent IKtracker
        </h2>

        <div className="relative">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${current * (100 / visibleCount)}%)` }}
            >
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 px-2 md:px-3"
                  style={{ width: `${100 / visibleCount}%` }}
                >
                  <div className="bg-card border border-border rounded-2xl p-5 md:p-6 h-full flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <Quote className="h-5 w-5 text-primary/40 flex-shrink-0" />
                    <p className="text-foreground font-medium text-sm md:text-base italic leading-relaxed flex-1">
                      « {t.quote} »
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div>
                        <span className="font-semibold text-sm text-foreground">{t.name}</span>
                        <p className="text-xs text-muted-foreground">{t.job} · {t.city}</p>
                      </div>
                      <Stars count={t.stars} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nav arrows */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute -left-2 md:-left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm h-9 w-9"
            onClick={prev}
            aria-label="Témoignage précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-2 md:-right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm h-9 w-9"
            onClick={next}
            aria-label="Témoignage suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-6">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Aller au groupe ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === current ? "bg-primary w-6" : "bg-muted w-2 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export const TestimonialsCarousel = memo(TestimonialsCarouselComponent);
