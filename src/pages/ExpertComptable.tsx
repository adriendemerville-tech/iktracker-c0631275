import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useMarketingTracker } from "@/hooks/useMarketingTracker";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { AppCarousel } from "@/components/marketing/AppCarousel";
import { CalendarSyncDemo } from "@/components/marketing/CalendarSyncDemo";
import { 
  FileSpreadsheet, 
  Mail, 
  Download, 
  Check, 
  ArrowRight, 
  Shield, 
  Clock, 
  Calculator,
  Euro,
  Briefcase,
  MapPin,
  Users,
  Car,
  FileText
} from "lucide-react";

const ExpertComptable = () => {
  const { ref: pdfRef, isVisible: pdfVisible } = useScrollAnimation({ threshold: 0.2 });
  const { trackCTAClick } = useMarketingTracker('expert-comptable');
  
  return (
    <div className="min-h-screen bg-background">
      <title>Export comptable - IKtracker pour experts-comptables</title>
      <meta name="description" content="Exportez vos trajets professionnels au format Excel ou PDF. Conforme au barème fiscal des indemnités kilométriques 2024." />
      
      <MarketingNav />

      {/* Hero */}
      <section className="pt-24 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/10" />
        <div className="container mx-auto relative">
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Briefcase className="h-4 w-4" />
              Pour Experts-Comptables
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Simplifiez <span className="text-2xl md:text-3xl font-medium text-emerald-500">gratuitement</span> les
              <br />
              <span className="text-primary">déclarations IK</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Exports standardisés. Calcul automatique. Gain de temps garanti.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" variant="gradient" className="gap-2">
                  Recommander à mes clients
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Export Flow Animation */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative p-8 rounded-2xl bg-card border border-border overflow-hidden">
              <div className="grid md:grid-cols-3 gap-8 relative z-10">
                {[
                  { icon: Calculator, title: "Calcul auto", desc: "Barème fiscal 2024" },
                  { icon: FileSpreadsheet, title: "Export", desc: "Excel, PDF, CSV" },
                  { icon: Mail, title: "Envoi", desc: "Direct au comptable" },
                ].map((step, i) => (
                  <div key={i} className="text-center space-y-4 animate-fade-in" style={{ animationDelay: `${i * 200}ms` }}>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <step.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                ))}
              </div>
              <div className="hidden md:block absolute top-1/2 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Pourquoi recommander IKtracker</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Euro, title: "100% Gratuit", desc: "Aucun coût pour vos clients" },
              { icon: MapPin, title: "Made in France", desc: "Données hébergées en Europe" },
              { icon: Shield, title: "RGPD Compliant", desc: "Confidentialité garantie" },
              { icon: Calculator, title: "Barème fiscal 2024", desc: "Mise à jour automatique" },
              { icon: Clock, title: "Gain de temps", desc: "Fini les relevés manuscrits" },
              { icon: Users, title: "Multi-clients", desc: "Format standardisé" },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-card border border-border text-center hover:border-primary/50 transition-colors animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Screenshots */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl font-bold">L'application en images</h2>
            <p className="text-muted-foreground">Interface simple pour vos clients</p>
          </div>
          <AppCarousel />
        </div>
      </section>

      {/* Calendar Demo */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Synchronisation calendrier</h2>
              <p className="text-lg text-muted-foreground">
                Vos clients connectent leur agenda et les rendez-vous deviennent des trajets automatiquement.
              </p>
              <ul className="space-y-3">
                {["Google Calendar", "Microsoft Outlook", "Import automatique"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/calendrier">
                <Button variant="outline" className="gap-2">
                  Voir la démo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <CalendarSyncDemo />
          </div>
        </div>
      </section>

      {/* PDF Report Demo */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div 
              ref={pdfRef}
              className={`relative order-2 lg:order-1 transition-all duration-700 ${pdfVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}
            >
              {/* Subtle shadow backdrop */}
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 to-transparent rounded-[2rem] blur-2xl" />
              
              {/* Main PDF Document - iOS Style */}
              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-w-md mx-auto" style={{ aspectRatio: '0.7' }}>
                {/* Header bar with logo */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Relevé IK</p>
                        <p className="text-xs text-gray-500">Décembre 2025</p>
                      </div>
                    </div>
                    <img src="/iktracker-indemnites-kilometriques-logo.png" alt="IKtracker" className="h-6 opacity-60" />
                  </div>
                </div>
                
                {/* Document content */}
                <div className="p-6 space-y-5 flex-1">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      className="bg-gray-50 rounded-xl p-4 transition-all duration-500"
                      style={{ 
                        transitionDelay: pdfVisible ? '100ms' : '0ms',
                        opacity: pdfVisible ? 1 : 0,
                        transform: pdfVisible ? 'translateY(0)' : 'translateY(10px)'
                      }}
                    >
                      <p className="text-xs text-gray-500 mb-1">Distance totale</p>
                      <p className="text-lg font-bold text-gray-900">2 458 km</p>
                    </div>
                    <div 
                      className="bg-primary/5 rounded-xl p-4 transition-all duration-500"
                      style={{ 
                        transitionDelay: pdfVisible ? '200ms' : '0ms',
                        opacity: pdfVisible ? 1 : 0,
                        transform: pdfVisible ? 'translateY(0)' : 'translateY(10px)'
                      }}
                    >
                      <p className="text-xs text-gray-500 mb-1">Indemnités</p>
                      <p className="text-lg font-bold text-primary">1 352,90 €</p>
                    </div>
                  </div>
                  
                  {/* Vehicle info */}
                  <div 
                    className="bg-gray-50 rounded-xl p-4 transition-all duration-500"
                    style={{ 
                      transitionDelay: pdfVisible ? '300ms' : '0ms',
                      opacity: pdfVisible ? 1 : 0,
                      transform: pdfVisible ? 'translateY(0)' : 'translateY(10px)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                        <Car className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Renault Clio</p>
                        <p className="text-xs text-gray-500">5 CV fiscaux • CD-456-EF</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Trip list preview */}
                  <div 
                    className="space-y-2 transition-all duration-500"
                    style={{ 
                      transitionDelay: pdfVisible ? '400ms' : '0ms',
                      opacity: pdfVisible ? 1 : 0,
                      transform: pdfVisible ? 'translateY(0)' : 'translateY(10px)'
                    }}
                  >
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Derniers trajets</p>
                    {[
                      { date: "20 déc", from: "Bordeaux", to: "Toulouse", km: "245 km" },
                      { date: "17 déc", from: "Toulouse", to: "Montpellier", km: "242 km" },
                      { date: "14 déc", from: "Montpellier", to: "Nîmes", km: "58 km" }
                    ].map((trip, i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 shadow-sm border border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-12">{trip.date}</span>
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <span>{trip.from}</span>
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                            <span>{trip.to}</span>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{trip.km}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total */}
                  <div 
                    className="flex items-center justify-between pt-3 border-t border-gray-100 transition-all duration-500"
                    style={{ 
                      transitionDelay: pdfVisible ? '500ms' : '0ms',
                      opacity: pdfVisible ? 1 : 0,
                      transform: pdfVisible ? 'translateY(0)' : 'translateY(10px)'
                    }}
                  >
                    <span className="text-sm text-gray-500">Total à déclarer</span>
                    <span className="text-xl font-bold text-primary">1 352,90 €</span>
                  </div>
                </div>
                
                {/* Footer with logo and marketing */}
                <div 
                  className="bg-gray-50 px-6 py-4 border-t border-gray-100 transition-all duration-500"
                  style={{ 
                    transitionDelay: pdfVisible ? '550ms' : '0ms',
                    opacity: pdfVisible ? 1 : 0
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="/iktracker-indemnites-kilometriques-logo.png" alt="IKtracker" className="h-5 opacity-50" />
                    </div>
                    <p className="text-xs text-gray-400">
                      Simplifiez vos IK • <span className="text-primary">iktracker.fr</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Floating badge */}
              <div 
                className="absolute -bottom-3 -right-3 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-500"
                style={{ 
                  transitionDelay: pdfVisible ? '600ms' : '0ms',
                  opacity: pdfVisible ? 1 : 0,
                  transform: pdfVisible ? 'scale(1)' : 'scale(0.8)'
                }}
              >
                <Check className="h-4 w-4" />
                Conforme fiscal
              </div>
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <h2 className="text-3xl font-bold">Exports professionnels</h2>
              <p className="text-lg text-muted-foreground">
                Vos clients génèrent des relevés conformes au barème fiscal, prêts pour la comptabilité.
              </p>
              <ul className="space-y-3">
                {[
                  "PDF avec tableau détaillé",
                  "Excel pour intégration comptable",
                  "Envoi direct par email",
                  "Historique complet conservé"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche</h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {[
              "Vos clients enregistrent leurs trajets",
              "Les IK sont calculées automatiquement",
              "Ils exportent en PDF ou Excel",
              "Vous recevez des données exploitables",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                  {i + 1}
                </div>
                <span className="font-medium">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold">Recommandez IKtracker à vos clients</h2>
          <p className="text-lg opacity-90">Gratuit, français, et fiable.</p>
          <Link to="/signup">
            <Button size="lg" variant="secondary" className="gap-2">
              Créer un compte test
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default ExpertComptable;
