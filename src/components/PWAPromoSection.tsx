import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, 
  Download, 
  Wifi, 
  Zap, 
  Bell,
  CheckCircle2,
  Share,
  Plus,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PWAPromoSectionProps {
  className?: string;
  compact?: boolean;
}

export const PWAPromoSection = ({ className, compact = false }: PWAPromoSectionProps) => {
  const benefits = [
    {
      icon: Zap,
      title: "Accès instantané",
      description: "Lancez l'app en un clic depuis votre écran d'accueil"
    },
    {
      icon: Wifi,
      title: "Fonctionne hors-ligne",
      description: "Consultez vos trajets même sans connexion"
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Soyez alerté des nouveaux rendez-vous détectés"
    }
  ];

  const installSteps = [
    { os: "iPhone", icon: Share, step: "Appuyez sur", action: "Partager", final: "puis \"Sur l'écran d'accueil\"" },
    { os: "Android", icon: Plus, step: "Appuyez sur", action: "Menu ⋮", final: "puis \"Installer l'application\"" }
  ];

  return (
    <section className={cn("py-16 px-4", className)}>
      <div className="container mx-auto">
        <div className={cn(
          "bg-gradient-to-br from-muted/80 to-muted/40 rounded-3xl border border-border overflow-hidden",
          compact ? "p-6 md:p-8" : "p-8 md:p-12"
        )}>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Smartphone className="h-4 w-4" />
                Application mobile
              </div>
              
              <h2 className={cn(
                "font-bold text-foreground mb-4",
                compact ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"
              )}>
                Installez IKtracker sur votre{" "}
                <span className="text-gradient">téléphone</span>
              </h2>
              
              <p className="text-muted-foreground mb-6 text-lg">
                Accédez à vos trajets en un instant, comme une vraie application native. 
                Pas besoin de télécharger sur l'App Store !
              </p>

              {/* Benefits */}
              <div className="space-y-4 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{benefit.title}</h4>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Install instructions */}
              <div className="bg-card/60 rounded-xl p-4 border border-border">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  Comment installer ?
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  {installSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">{step.os} :</span>
                      <span className="text-muted-foreground">{step.step}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded text-primary font-medium">
                        <step.icon className="h-3 w-3" />
                        {step.action}
                      </span>
                    </div>
                  ))}
                </div>
                <Link to="/install">
                  <Button variant="outline" size="sm" className="w-full group">
                    Voir le guide complet
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Phone mockup */}
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="relative">
                {/* Phone frame */}
                <div className="relative w-[280px] h-[560px] bg-foreground rounded-[3rem] p-3 shadow-2xl">
                  {/* Screen */}
                  <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden relative">
                    {/* Status bar */}
                    <div className="h-12 bg-primary/5 flex items-center justify-center">
                      <div className="w-20 h-6 bg-foreground/10 rounded-full" />
                    </div>
                    
                    {/* App content mockup */}
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <img src="/logo.png" alt="IKtracker" className="w-8 h-8 rounded-lg" />
                          <span className="font-bold text-foreground">IKtracker</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-muted" />
                      </div>

                      {/* Stats card */}
                      <div className="bg-gradient-primary rounded-xl p-4 mb-4 text-primary-foreground">
                        <p className="text-sm opacity-80">Ce mois</p>
                        <p className="text-2xl font-bold">847 km</p>
                        <p className="text-sm">412,50 € d'IK</p>
                      </div>

                      {/* Trip cards */}
                      {[
                        { date: "Aujourd'hui", from: "Paris", to: "Versailles", km: 42 },
                        { date: "Hier", from: "Domicile", to: "Paris 8e", km: 35 }
                      ].map((trip, i) => (
                        <div key={i} className="bg-card border border-border rounded-lg p-3 mb-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-muted-foreground">{trip.date}</p>
                              <p className="text-sm font-medium text-foreground">{trip.from} → {trip.to}</p>
                            </div>
                            <span className="text-sm font-semibold text-primary">{trip.km} km</span>
                          </div>
                        </div>
                      ))}

                      {/* Add button */}
                      <Button variant="gradient" className="w-full mt-4" size="sm">
                        + Nouveau trajet
                      </Button>
                    </div>

                    {/* Home indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-foreground/20 rounded-full" />
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/20 rounded-full blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-accent/20 rounded-full blur-2xl" />

                {/* Install badge */}
                <div className="absolute -right-2 top-20 bg-success text-success-foreground px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1.5 animate-pulse">
                  <CheckCircle2 className="h-4 w-4" />
                  Installée !
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PWAPromoSection;
