import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, CheckCircle2, RefreshCw, MapPin, ArrowRight, Zap } from 'lucide-react';

interface CalendarSyncDemoProps {
  className?: string;
  compact?: boolean;
}

export function CalendarSyncDemo({ className, compact = false }: CalendarSyncDemoProps) {
  const [syncStep, setSyncStep] = useState(0);
  const [showTrips, setShowTrips] = useState(false);

  const events = [
    { time: "9:00", title: "RDV Mme Dupont", address: "45 av. Victor Hugo", synced: false },
    { time: "11:30", title: "Visite M. Martin", address: "8 rue des Lilas", synced: false },
    { time: "14:00", title: "Cabinet Bernard", address: "23 bd Haussmann", synced: false },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setSyncStep((prev) => {
        const next = (prev + 1) % 5;
        if (next === 4) {
          setShowTrips(true);
          setTimeout(() => setShowTrips(false), 2000);
        }
        return next;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  if (compact) {
    return (
      <div className={cn("bg-card border border-border rounded-2xl p-6 overflow-hidden", className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Synchro Calendrier</h3>
            <p className="text-sm text-muted-foreground">Google Calendar & Outlook</p>
          </div>
        </div>

        <div className="space-y-2">
          {events.map((event, i) => (
            <div 
              key={i}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-all duration-500",
                syncStep > i ? "bg-success/10 border border-success/20" : "bg-muted"
              )}
            >
              <span className="text-xs text-muted-foreground w-10">{event.time}</span>
              <span className="text-sm font-medium flex-1 truncate">{event.title}</span>
              {syncStep > i ? (
                <CheckCircle2 className="w-4 h-4 text-success animate-scale-in" />
              ) : syncStep === i ? (
                <RefreshCw className="w-4 h-4 text-primary animate-spin" />
              ) : null}
            </div>
          ))}
        </div>

        {showTrips && (
          <div className="mt-4 p-3 bg-primary/10 rounded-lg animate-fade-in">
            <p className="text-sm font-medium text-primary flex items-center gap-2">
              <Zap className="w-4 h-4" />
              3 trajets créés automatiquement !
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("bg-card border border-border rounded-2xl md:rounded-3xl p-4 md:p-8 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 md:w-7 md:h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg md:text-2xl font-bold text-foreground">Synchronisation Calendrier</h3>
            <p className="text-sm md:text-base text-muted-foreground">Vos RDV deviennent des trajets automatiquement</p>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full transition-all duration-500 self-start sm:self-auto text-sm md:text-base",
          syncStep >= 3 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
        )}>
          {syncStep >= 3 ? (
            <>
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-medium">Synchronisé</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              <span className="font-medium">Synchro en cours...</span>
            </>
          )}
        </div>
      </div>

      {/* Two columns layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {/* Calendar side */}
        <div>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[#4285F4] flex items-center justify-center">
              <Calendar className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </div>
            <span className="font-medium text-foreground text-sm md:text-base">Google Calendar</span>
          </div>

          <div className="bg-muted/50 rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
            {events.map((event, i) => (
              <div 
                key={i}
                className={cn(
                  "flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-card border transition-all duration-500",
                  syncStep > i ? "border-success/50 bg-success/5" : "border-border"
                )}
              >
                <div className="text-center shrink-0">
                  <p className="text-base md:text-lg font-bold text-foreground">{event.time.split(':')[0]}</p>
                  <p className="text-xs text-muted-foreground">:{event.time.split(':')[1]}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm md:text-base truncate">{event.title}</p>
                  <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {event.address}
                  </p>
                </div>
                {syncStep > i && (
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-success shrink-0 animate-scale-in" />
                )}
                {syncStep === i && (
                  <RefreshCw className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0 animate-spin" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trips side */}
        <div>
          <div className="flex items-center gap-2 mb-3 md:mb-4 mt-4 md:mt-0">
            <img src="/iktracker-indemnites-kilometriques-logo.png" alt="IKtracker" className="w-6 h-6 md:w-8 md:h-8 rounded-lg" />
            <span className="font-medium text-foreground text-sm md:text-base">IKtracker</span>
          </div>

          <div className="bg-muted/50 rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
            {syncStep >= 3 ? (
              <>
                {events.map((event, i) => (
                  <div 
                    key={i}
                    className="p-2 md:p-3 rounded-lg bg-card border border-primary/20 animate-fade-in"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm flex-wrap">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 text-primary shrink-0" />
                      <span className="font-medium">Domicile</span>
                      <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0" />
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 text-accent shrink-0" />
                      <span className="font-medium truncate">{event.address.split(',')[0]}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 md:mt-2">
                      <span className="text-xs text-muted-foreground">{event.time}</span>
                      <span className="text-xs md:text-sm font-semibold text-primary">{12 + i * 5} km</span>
                    </div>
                  </div>
                ))}
                <div className="text-center py-2 text-success font-medium animate-fade-in text-sm md:text-base">
                  <Zap className="w-4 h-4 md:w-5 md:h-5 inline mr-1 md:mr-2" />
                  {events.length} trajets générés !
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 md:py-12 text-muted-foreground">
                <RefreshCw className="w-8 h-8 md:w-12 md:h-12 mb-3 md:mb-4 animate-spin opacity-30" />
                <p className="text-sm md:text-base">En attente de synchronisation...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-border grid grid-cols-3 gap-2 md:gap-4 text-center">
        <div>
          <p className="text-xl md:text-2xl font-bold text-foreground">0</p>
          <p className="text-xs md:text-sm text-muted-foreground">saisie manuelle</p>
        </div>
        <div>
          <p className="text-xl md:text-2xl font-bold text-primary">100%</p>
          <p className="text-xs md:text-sm text-muted-foreground">automatique</p>
        </div>
        <div>
          <p className="text-xl md:text-2xl font-bold text-success">2h</p>
          <p className="text-xs md:text-sm text-muted-foreground">gagnées/mois</p>
        </div>
      </div>
    </div>
  );
}
