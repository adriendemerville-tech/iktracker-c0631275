import { useState, useEffect, lazy, Suspense, memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { useMarketingTracker } from "@/hooks/useMarketingTracker";
import { usePrefetch } from "@/hooks/usePrefetch";
import { 
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Car,
  Calculator,
  MapPin,
  Calendar,
  Route,
  FileText,
  Check,
  Star,
  Smartphone
} from "lucide-react";

// Lazy load AuthForm - not needed for initial LCP
const AuthForm = lazy(() => import("@/components/AuthForm").then(m => ({ default: m.AuthForm })));

// Auth form loading placeholder
const AuthFormSkeleton = memo(() => (
  <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-8 min-h-[420px]">
    <Skeleton className="h-8 w-32 mx-auto mb-2" />
    <Skeleton className="h-4 w-48 mx-auto mb-6" />
    <Skeleton className="h-12 w-full mb-4 rounded-lg" />
    <Skeleton className="h-4 w-8 mx-auto mb-4" />
    <Skeleton className="h-10 w-full mb-3" />
    <Skeleton className="h-10 w-full mb-4" />
    <Skeleton className="h-12 w-full rounded-lg" />
  </div>
));

// Lazy load heavy marketing components - reduces initial bundle
const AnimatedPhoneMockup = lazy(() => import("@/components/marketing/AnimatedPhoneMockup").then(m => ({ default: m.AnimatedPhoneMockup })));
const AppCarousel = lazy(() => import("@/components/marketing/AppCarousel").then(m => ({ default: m.AppCarousel })));
const TourModeDemo = lazy(() => import("@/components/marketing/TourModeDemo").then(m => ({ default: m.TourModeDemo })));
const TourModeMockup = lazy(() => import("@/components/marketing/TourModeMockup").then(m => ({ default: m.TourModeMockup })));
const CalendarSyncDemo = lazy(() => import("@/components/marketing/CalendarSyncDemo").then(m => ({ default: m.CalendarSyncDemo })));
const MarketingPWANotification = lazy(() => import("@/components/marketing/MarketingPWANotification").then(m => ({ default: m.MarketingPWANotification })));
const MarketingFooter = lazy(() => import("@/components/marketing/MarketingFooter").then(m => ({ default: m.MarketingFooter })));
const QRCodeSVG = lazy(() => import("qrcode.react").then(m => ({ default: m.QRCodeSVG })));

// Lazy load below-the-fold assets - use public path for lazy loading
const founderImage = "/founder-adrien-optimized.webp";

// Inline scroll animation hook to avoid extra import
const useScrollAnimation = (options?: { threshold?: number }) => {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (!ref) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: options?.threshold ?? 0.2 }
    );
    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, options?.threshold]);
  
  return { ref: setRef, isVisible };
};

// Placeholder for lazy components with explicit dimensions to prevent CLS
const LazyPlaceholder = memo(({ height = 300 }: { height?: number }) => (
  <div 
    className="animate-pulse bg-muted/50 rounded-2xl flex items-center justify-center"
    style={{ minHeight: height, aspectRatio: 'auto' }}
  >
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
));

// Phone mockup placeholder with exact dimensions to prevent CLS
const PhonePlaceholder = memo(() => (
  <div className="relative w-[280px] h-[560px] mx-auto bg-muted/30 rounded-[3rem] animate-pulse flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
));

// Calendar demo placeholder
const CalendarPlaceholder = memo(() => (
  <div className="w-full max-w-[400px] mx-auto bg-muted/30 rounded-2xl animate-pulse" style={{ aspectRatio: '1/1.2' }} />
));

const Landing = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { ref: pdfRef, isVisible: pdfVisible } = useScrollAnimation({ threshold: 0.2 });
  const { trackCTAClick, trackSignupClick } = useMarketingTracker('landing');
  const prefetchApp = usePrefetch('/app');
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && session) {
        navigate('/app');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Remove logout transition overlay once React has fully mounted
  useEffect(() => {
    const overlay = document.getElementById('logout-shell-overlay');
    if (overlay) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        overlay.style.transition = 'opacity 0.5s ease-out';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background font-display overflow-x-hidden select-text">
      <Helmet>
        <title>IKtracker - Suivi kilométrique automatique et indemnités IK | Gratuit</title>
        <meta name="description" content="Automatisez vos indemnités kilométriques gratuitement. Application pour freelances, infirmiers libéraux et indépendants en France. Calcul IK selon barème fiscal 2025." />
        <link rel="canonical" href="https://iktracker.fr/" />
      </Helmet>
      
      <MarketingNav user={user} loading={loading} />
      <main>
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-28 md:pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text content - NO animation on LCP elements for instant render */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
                <Star className="h-4 w-4" />
                100% Gratuit
              </div>
              {/* LCP Element - H1 must render instantly without any animation */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
                Vos trajets pro.
                <br />
                <span className="text-gradient">Automatiquement.</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8">
                Enregistrez, calculez et exportez vos indemnités kilométriques en quelques clics.
              </p>
              
              {user && (
                <div className="lg:hidden mb-8">
                  <Link to="/app" {...prefetchApp}>
                    <Button size="lg" variant="gradient" className="w-full sm:w-auto group">
                      <LayoutDashboard className="h-5 w-5 mr-2" />
                      Mon tableau de bord
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              )}

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm text-muted-foreground">
                {["Sans carte bancaire", "Installation 2 min", "Export PDF/CSV"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Auth form or Phone mockup - Reserved space with fixed dimensions to prevent CLS */}
            <div id="auth-section" className="animate-scale-in min-h-[420px] min-w-[320px] lg:min-w-[400px]">
              {user ? (
                <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Bienvenue !
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Accédez à votre tableau de bord pour gérer vos trajets.
                  </p>
                  <Link to="/app" {...prefetchApp}>
                    <Button size="lg" variant="gradient" className="w-full group">
                      <LayoutDashboard className="h-5 w-5 mr-2" />
                      Tableau de bord
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <Suspense fallback={<AuthFormSkeleton />}>
                  <AuthForm />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pain Point Section - Excel */}
      <section className="py-16 md:py-24 bg-muted/30 relative overflow-hidden">
        {/* Excel grid background */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '80px 32px'
          }} />
          <div className="absolute top-0 left-0 right-0 h-10 bg-green-600/20" />
          <div className="absolute top-0 left-0 w-12 bottom-0 bg-muted/50" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6 md:space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
              <FileText className="h-4 w-4" />
              Fini les tableaux Excel
            </div>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight">
              Vous perdez encore du temps avec des <span className="text-destructive line-through decoration-2">fichiers Excel</span> ?
            </h2>
            <p className="text-base md:text-xl text-muted-foreground">
              Formules cassées, oublis de trajets, calculs d'IK approximatifs... 
              IKtracker automatise tout et vous fait gagner des heures chaque mois.
            </p>
            <div className="grid grid-cols-3 gap-3 md:gap-6 pt-4 md:pt-6">
              {[
                { value: "0", label: "formule à écrire" },
                { value: "2 min", label: "par trajet" },
                { value: "100%", label: "conforme fiscalement" }
              ].map((stat, i) => (
                <div key={i} className="p-3 md:p-4 rounded-xl bg-card border border-border">
                  <div className="text-xl md:text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - Icons only */}
      <section className="py-12 md:py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Tout ce dont vous avez besoin</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
            {[
              { icon: Car, title: "Multi-véhicules" },
              { icon: Calculator, title: "Calcul IK auto" },
              { icon: MapPin, title: "GPS intégré" },
              { icon: Calendar, title: "Sync calendriers" },
              { icon: FileText, title: "Export PDF/CSV" },
            ].map((feature, i) => (
              <div 
                key={i}
                className="group p-4 md:p-6 rounded-xl md:rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 text-center animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/10 text-primary mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-5 w-5 md:h-7 md:w-7" />
                </div>
                <h3 className="font-semibold text-sm md:text-base">{feature.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phone Mockup Demo */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <Suspense fallback={<PhonePlaceholder />}>
                <AnimatedPhoneMockup />
              </Suspense>
            </div>
            <div className="space-y-4 md:space-y-6 order-1 lg:order-2">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Une app mobile complète</h2>
              <p className="text-base md:text-lg text-muted-foreground">
                Installez IKtracker sur votre téléphone et enregistrez vos trajets en déplacement.
              </p>
              <ul className="space-y-2 md:space-y-3">
                {["Fonctionne hors-ligne", "Notifications rappels", "GPS temps réel"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/install">
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  Guide d'installation
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tour Mode Demo */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-16 items-center">
            <div className="space-y-4 md:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                <Route className="h-4 w-4" />
                Nouveau
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Mode Tournée</h2>
              <p className="text-base md:text-lg text-muted-foreground">
                Plusieurs arrêts, un seul enregistrement. Parfait pour les commerciaux et livreurs.
              </p>
              <ul className="space-y-2 md:space-y-3">
                {["GPS en temps réel", "Arrêts illimités", "Calcul automatique"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/mode-tournee">
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  En savoir plus
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <Suspense fallback={<PhonePlaceholder />}>
              <TourModeMockup />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Calendar Sync Demo */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <Suspense fallback={<CalendarPlaceholder />}>
                <CalendarSyncDemo />
              </Suspense>
            </div>
            <div className="space-y-4 md:space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                <Calendar className="h-4 w-4" />
                Intégration
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Sync Calendriers</h2>
              <p className="text-base md:text-lg text-muted-foreground">
                Importez vos rendez-vous et transformez-les en trajets automatiquement.
              </p>
              <ul className="space-y-2 md:space-y-3">
                {["Google Calendar", "Microsoft Outlook", "Import en un clic"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/calendrier">
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  En savoir plus
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PDF Report Section - iOS Style */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-16 items-center">
            <div className="space-y-4 md:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                <FileText className="h-4 w-4" />
                Export
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Rapport PDF professionnel</h2>
              <p className="text-base md:text-lg text-muted-foreground">
                Générez un relevé complet de vos trajets conforme au barème fiscal, prêt à envoyer à votre comptable.
              </p>
              <ul className="space-y-2 md:space-y-3">
                {["Format PDF ou Excel", "Barème fiscal 2025", "Envoi direct par email"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/expert-comptable">
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  En savoir plus
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            {/* iOS-style PDF Report Mockup */}
            <div 
              ref={pdfRef}
              className={`relative transition-all duration-700 ${pdfVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}
            >
              {/* Subtle shadow backdrop */}
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 to-transparent rounded-[2rem] blur-2xl" />
              
              {/* Main PDF Document */}
              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col" style={{ aspectRatio: '0.7' }}>
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
                    <img 
                      src="/logo-iktracker-250.webp" 
                      alt="IKtracker" 
                      width={24}
                      height={24}
                      className="h-6 w-6 opacity-60" 
                      loading="lazy"
                      decoding="async"
                    />
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
                      <p className="text-lg font-bold text-gray-900">1 247 km</p>
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
                      <p className="text-lg font-bold text-primary">687,50 €</p>
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
                        <p className="text-sm font-medium text-gray-900">Peugeot 308</p>
                        <p className="text-xs text-gray-500">5 CV fiscaux • AB-123-CD</p>
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
                      { date: "18 déc", from: "Paris", to: "Lyon", km: "465 km" },
                      { date: "15 déc", from: "Lyon", to: "Marseille", km: "315 km" },
                      { date: "12 déc", from: "Marseille", to: "Nice", km: "198 km" }
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
                    <span className="text-xl font-bold text-primary">687,50 €</span>
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
                      <img 
                        src="/logo-iktracker-250.webp" 
                        alt="IKtracker" 
                        width={20}
                        height={20}
                        className="h-5 opacity-50" 
                        loading="lazy"
                        decoding="async"
                      />
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
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Prêt à simplifier vos trajets ?</h2>
            <p className="text-xl opacity-90">
              Rejoignez des milliers d'utilisateurs qui gagnent du temps chaque mois.
            </p>
          </div>
          
          {/* QR Code for desktop users */}
          <div className="hidden md:flex flex-col items-center gap-3 mt-8">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <Suspense fallback={<div className="w-[140px] h-[140px] bg-gray-200 animate-pulse rounded" />}>
                <QRCodeSVG 
                  value="https://iktracker.fr/install" 
                  size={140}
                  level="M"
                  includeMargin={false}
                />
              </Suspense>
            </div>
            <p className="text-sm opacity-80 flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Scannez pour installer sur mobile
            </p>
          </div>
          
          <div className="mt-10">
            <Link to="/signup" onClick={trackSignupClick}>
              <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 py-6">
                Créer mon compte gratuit
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial / Disclaimer Section */}
      <section className="py-12 md:py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-background border border-border rounded-2xl p-6 md:p-10">
            <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground mb-4 md:mb-6 font-display">
              Pourquoi IKtracker est-il gratuit ?
            </h3>
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start">
              <img 
                src={founderImage} 
                srcSet={`${founderImage} 1x, ${founderImage} 2x`}
                sizes="75px"
                alt="Adrien de Volontat, fondateur d'IKtracker" 
                width={75}
                height={75}
                className="w-[75px] h-[75px] rounded-full object-cover flex-shrink-0 border-2 border-border transition-transform duration-300 hover:scale-110"
                loading="lazy"
                decoding="async"
              />
              <div className="text-center md:text-left">
                <blockquote className="text-sm md:text-base text-muted-foreground leading-relaxed font-display">
                  "Dirigeant d'une agence Avenir Rénovations, je n'ai trouvé aucune solution satisfaisante pour automatiser mes indemnités kilométriques. J'ai donc créé IKtracker pour mon usage professionnel. L'infrastructure étant en place, je la partage gratuitement avec ceux qui ont les mêmes besoins de gestion. Pas de carte bancaire, pas de frais cachés."
                </blockquote>
                <p className="mt-4 md:mt-6 text-xs md:text-sm text-muted-foreground font-display">
                  — Adrien de Volontat, fondateur
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                  <a 
                    href="https://www.avenir-renovations.fr/agence/avenir-renovations-13-saint-remy-de-provence/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline transition-colors font-display"
                  >
                    Avenir Rénovations →
                  </a>
                  <span className="text-muted-foreground/50">•</span>
                  <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors font-display">
                    CGU
                  </Link>
                  <span className="text-muted-foreground/50">•</span>
                  <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors font-display">
                    Confidentialité
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      <MarketingFooter />
      <Suspense fallback={null}>
        <MarketingPWANotification />
      </Suspense>
    </div>
  );
};

export default Landing;
