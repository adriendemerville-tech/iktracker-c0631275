import { useState, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Calendar, Plus, CheckCircle2, ArrowRight, Navigation, Car, Signal, Moon, Sun } from 'lucide-react';

type MockupScreen = 'dashboard' | 'newTrip' | 'tour' | 'tourFocus' | 'calendar';

interface AnimatedPhoneMockupProps {
  screen?: MockupScreen;
  autoAnimate?: boolean;
  className?: string;
}

export function AnimatedPhoneMockup({ screen = 'dashboard', autoAnimate = false, className }: AnimatedPhoneMockupProps) {
  const [currentScreen, setCurrentScreen] = useState(screen);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (!autoAnimate) return;

    const screens: MockupScreen[] = ['dashboard', 'newTrip', 'tour', 'calendar'];
    let screenIndex = 0;

    const timer = setInterval(() => {
      screenIndex = (screenIndex + 1) % screens.length;
      setCurrentScreen(screens[screenIndex]);
      setAnimationStep(0);
    }, 4000);

    return () => clearInterval(timer);
  }, [autoAnimate]);

  useEffect(() => {
    setCurrentScreen(screen);
  }, [screen]);

  // Animation steps for tour mode
  useEffect(() => {
    if (currentScreen !== 'tour') return;

    const stepTimer = setInterval(() => {
      setAnimationStep((prev) => (prev + 1) % 4);
    }, 1000);

    return () => clearInterval(stepTimer);
  }, [currentScreen]);

  const renderDashboard = () => (
    <div className="p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <img 
            src="/iktracker-indemnites-kilometriques-logo.png" 
            alt="IKtracker" 
            className="w-8 h-8 rounded-lg" 
            loading="lazy"
            decoding="async"
          />
          <span className="font-bold text-foreground">IKtracker</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/20" />
      </div>

      <div className="bg-gradient-primary rounded-xl p-4 mb-4 text-primary-foreground animate-scale-in">
        <p className="text-sm opacity-80">Ce mois</p>
        <p className="text-3xl font-bold animate-pulse">1 247 km</p>
        <p className="text-sm">612,50 € d'IK</p>
      </div>

      {[
        { date: "Aujourd'hui", route: "Paris → Versailles", km: 42 },
        { date: "Hier", route: "Domicile → Client A", km: 35 },
        { date: "Lundi", route: "Bureau → Réunion", km: 28 }
      ].map((trip, i) => (
        <div 
          key={i}
          className="bg-card border border-border rounded-lg p-3 mb-2 animate-fade-in"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">{trip.date}</p>
              <p className="text-sm font-medium text-foreground">{trip.route}</p>
            </div>
            <span className="text-sm font-semibold text-primary">{trip.km} km</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderNewTrip = () => (
    <div className="p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Plus className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground">Nouveau trajet</span>
      </div>

      <div className="space-y-4">
        <div className="bg-muted rounded-lg p-3 animate-scale-in">
          <p className="text-xs text-muted-foreground mb-1">Départ</p>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Paris 15e</span>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowRight className="w-5 h-5 text-muted-foreground animate-bounce" />
        </div>

        <div className="bg-muted rounded-lg p-3 animate-scale-in" style={{ animationDelay: '200ms' }}>
          <p className="text-xs text-muted-foreground mb-1">Arrivée</p>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Versailles</span>
          </div>
        </div>

        <div className="bg-primary/10 rounded-lg p-3 text-center animate-fade-in" style={{ animationDelay: '400ms' }}>
          <p className="text-2xl font-bold text-primary">42 km</p>
          <p className="text-sm text-muted-foreground">Distance calculée</p>
        </div>
      </div>
    </div>
  );

  const renderTour = () => {
    const stops = [
      { name: "Départ", location: "Cabinet", active: animationStep >= 0, completed: animationStep > 0 },
      { name: "Client 1", location: "Mme Dupont", active: animationStep >= 1, completed: animationStep > 1 },
      { name: "Client 2", location: "M. Martin", active: animationStep >= 2, completed: animationStep > 2 },
      { name: "Client 3", location: "Mme Bernard", active: animationStep >= 3, completed: animationStep > 3 },
    ];

    return (
      <div className="p-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <Navigation className="w-4 h-4 text-accent-foreground" />
          </div>
          <span className="font-bold text-foreground">Mode Tournée</span>
        </div>

        <div className="bg-accent/10 rounded-lg p-3 mb-4 animate-pulse">
          <p className="text-sm font-medium text-accent">Tournée en cours</p>
          <p className="text-xs text-muted-foreground">4 étapes • 87 km au total</p>
        </div>

        <div className="relative">
          {stops.map((stop, i) => (
            <div key={i} className="flex items-start gap-3 mb-4">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500",
                  stop.completed ? "bg-success text-success-foreground" :
                  stop.active ? "bg-primary text-primary-foreground animate-pulse" :
                  "bg-muted text-muted-foreground"
                )}>
                  {stop.completed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                {i < stops.length - 1 && (
                  <div className={cn(
                    "w-0.5 h-8 transition-all duration-500",
                    stop.completed ? "bg-success" : "bg-muted"
                  )} />
                )}
              </div>
              <div className={cn(
                "transition-all duration-300",
                stop.active ? "opacity-100" : "opacity-50"
              )}>
                <p className="text-sm font-medium text-foreground">{stop.name}</p>
                <p className="text-xs text-muted-foreground">{stop.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTourFocus = () => (
    <div className="w-full h-full flex flex-col items-center py-6 px-4 bg-black animate-fade-in">
      {/* Top indicators */}
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-1">
          <Sun className="w-3 h-3 text-yellow-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <Moon className="w-3 h-3 text-indigo-400" />
          <Signal className="w-3 h-3 text-green-500" />
        </div>
      </div>

      {/* Time */}
      <div className="flex flex-col items-center mt-2">
        <span className="text-3xl font-bold text-zinc-400 tracking-tight">
          15:37
        </span>
      </div>

      {/* Central button - car icon */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-24 h-24 rounded-full flex items-center justify-center">
          {/* Rotating gradient border */}
          <span 
            className="absolute inset-[-4px] rounded-full overflow-hidden"
            style={{
              background: 'conic-gradient(from 0deg, #f97316, #ef4444, #f97316, #fbbf24, #f97316)',
              animation: 'rotate-gradient 2s linear infinite',
            }}
          >
            <span className="absolute inset-[4px] rounded-full bg-gradient-to-br from-blue-900 to-blue-800" />
          </span>
          
          {/* Speed lines */}
          <span className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
            <span className="w-3 h-0.5 bg-orange-500 opacity-60 rounded-full" />
            <span className="w-5 h-0.5 bg-orange-500 opacity-40 rounded-full -ml-1" />
            <span className="w-2 h-0.5 bg-orange-500 opacity-50 rounded-full" />
          </span>
          
          {/* Car icon */}
          <Car 
            className="w-12 h-12 text-orange-500 relative z-10"
            style={{
              animation: 'car-drive 0.2s ease-in-out infinite',
            }}
          />
        </div>
        
        <span className="text-zinc-500 text-xs mt-3">
          Tournée en cours
        </span>
      </div>

      {/* Bottom counters */}
      <div className="flex items-end justify-center gap-8 w-full pb-2">
        {/* KM Counter */}
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-zinc-400 tabular-nums">
            47.5
          </span>
          <span className="text-xs text-zinc-500 uppercase tracking-widest">
            KM
          </span>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-zinc-800" />

        {/* Stops Counter */}
        <div className="flex flex-col items-center">
          <span 
            className="text-2xl font-bold tabular-nums bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(180deg, #f97316, #ef4444, #f97316, #fbbf24, #f97316)',
            }}
          >
            3
          </span>
          <span className="text-xs text-white uppercase tracking-widest font-bold">
            ÉTAPES
          </span>
        </div>
      </div>
    </div>
  );

  const renderCalendar = () => (
    <div className="p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Calendar className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground">Calendrier</span>
      </div>

      <div className="bg-muted rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Décembre 2024</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">Synchro</span>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={i} className="text-muted-foreground">{d}</span>
          ))}
          {Array.from({ length: 14 }).map((_, i) => (
            <div 
              key={i}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                i === 10 && "bg-primary text-primary-foreground",
                [3, 7, 11].includes(i) && "bg-accent/20 text-accent"
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {[
          { time: "9:00", title: "Mme Dupont", synced: true },
          { time: "11:30", title: "M. Bernard", synced: true },
          { time: "14:00", title: "Cabinet Martin", synced: false }
        ].map((event, i) => (
          <div 
            key={i}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg animate-fade-in",
              event.synced ? "bg-success/10 border border-success/20" : "bg-muted"
            )}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span className="text-xs text-muted-foreground w-10">{event.time}</span>
            <span className="text-sm font-medium flex-1">{event.title}</span>
            {event.synced && <CheckCircle2 className="w-4 h-4 text-success" />}
          </div>
        ))}
      </div>
    </div>
  );

  const screens = {
    dashboard: renderDashboard,
    newTrip: renderNewTrip,
    tour: renderTour,
    tourFocus: renderTourFocus,
    calendar: renderCalendar
  };

  return (
    <div className={cn("relative", className)}>
      {/* Phone frame */}
      <div className="relative w-[280px] h-[560px] bg-foreground rounded-[3rem] p-3 shadow-2xl">
        {/* Screen */}
        <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden relative">
          {/* Status bar */}
          <div className="h-12 bg-primary/5 flex items-center justify-center">
            <div className="w-20 h-6 bg-foreground/10 rounded-full" />
          </div>
          
          {/* Content */}
          <div className="h-[calc(100%-4rem)] overflow-hidden">
            {screens[currentScreen]()}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-foreground/20 rounded-full" />
        </div>
      </div>

      {/* Decorative elements - using CSS instead of images */}
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/20 rounded-full blur-2xl animate-pulse" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-accent/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}

export const MemoizedAnimatedPhoneMockup = memo(AnimatedPhoneMockup);
