import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Navigation, CheckCircle2, Clock, ArrowRight, Car } from 'lucide-react';

interface TourModeDemoProps {
  className?: string;
  compact?: boolean;
}

export function TourModeDemo({ className, compact = false }: TourModeDemoProps) {
  const [activeStop, setActiveStop] = useState(0);
  const [totalKm, setTotalKm] = useState(0);

  const stops = [
    { name: "Cabinet", address: "12 rue de la Paix, Paris", km: 0, time: "8:00" },
    { name: "Mme Dupont", address: "45 av. Victor Hugo", km: 12, time: "8:30" },
    { name: "M. Martin", address: "8 rue des Lilas", km: 8, time: "9:15" },
    { name: "Mme Bernard", address: "23 bd Haussmann", km: 15, time: "10:00" },
    { name: "Retour Cabinet", address: "12 rue de la Paix, Paris", km: 18, time: "11:00" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStop((prev) => {
        const next = (prev + 1) % stops.length;
        return next;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [stops.length]);

  useEffect(() => {
    let km = 0;
    for (let i = 0; i <= activeStop; i++) {
      km += stops[i].km;
    }
    setTotalKm(km);
  }, [activeStop, stops]);

  if (compact) {
    return (
      <div className={cn("bg-card border border-border rounded-2xl p-6 overflow-hidden", className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <Navigation className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Mode Tournée</h3>
            <p className="text-sm text-muted-foreground">Optimisé pour les professionnels itinérants</p>
          </div>
        </div>

        <div className="flex items-center justify-around py-4 border-y border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary animate-pulse">{totalKm}</p>
            <p className="text-xs text-muted-foreground">km parcourus</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{activeStop + 1}/{stops.length}</p>
            <p className="text-xs text-muted-foreground">étapes</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-hidden">
          {stops.map((stop, i) => (
            <div 
              key={i}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 shrink-0",
                i < activeStop ? "bg-success text-success-foreground scale-90" :
                i === activeStop ? "bg-primary text-primary-foreground scale-110 animate-pulse" :
                "bg-muted text-muted-foreground scale-90"
              )}
            >
              {i < activeStop ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <span className="text-xs font-bold">{i + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card border border-border rounded-3xl p-8 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center animate-pulse">
            <Navigation className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground">Mode Tournée</h3>
            <p className="text-muted-foreground">Enregistrez tous vos arrêts en un seul trajet</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-primary">{totalKm} km</p>
          <p className="text-sm text-muted-foreground">distance totale</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
        <div 
          className="absolute left-6 top-0 w-0.5 bg-gradient-to-b from-primary to-accent transition-all duration-500"
          style={{ height: `${(activeStop / (stops.length - 1)) * 100}%` }}
        />

        {/* Stops */}
        <div className="space-y-6">
          {stops.map((stop, i) => (
            <div 
              key={i}
              className={cn(
                "relative flex items-start gap-4 transition-all duration-500",
                i <= activeStop ? "opacity-100" : "opacity-40"
              )}
            >
              {/* Marker */}
              <div className={cn(
                "relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 shrink-0",
                i < activeStop ? "bg-success text-success-foreground" :
                i === activeStop ? "bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse" :
                "bg-muted text-muted-foreground"
              )}>
                {i < activeStop ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : i === activeStop ? (
                  <Car className="w-6 h-6" />
                ) : (
                  <MapPin className="w-5 h-5" />
                )}
              </div>

              {/* Content */}
              <div className={cn(
                "flex-1 bg-muted/50 rounded-xl p-4 transition-all duration-500",
                i === activeStop && "bg-primary/5 border border-primary/20 shadow-lg"
              )}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{stop.name}</p>
                    <p className="text-sm text-muted-foreground">{stop.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">+{stop.km} km</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {stop.time}
                    </p>
                  </div>
                </div>

                {i === activeStop && i < stops.length - 1 && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm text-accent animate-fade-in">
                    <Navigation className="w-4 h-4" />
                    En route vers {stops[i + 1].name}
                    <ArrowRight className="w-4 h-4 animate-bounce" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 pt-6 border-t border-border grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-foreground">{stops.length}</p>
          <p className="text-sm text-muted-foreground">étapes</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-primary">{stops.reduce((a, s) => a + s.km, 0)} km</p>
          <p className="text-sm text-muted-foreground">total</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-success">26,43 €</p>
          <p className="text-sm text-muted-foreground">IK générées</p>
        </div>
      </div>
    </div>
  );
}
