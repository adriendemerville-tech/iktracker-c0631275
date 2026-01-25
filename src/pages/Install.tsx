import { useEffect, useState, lazy, Suspense, memo } from 'react';
import { useMarketingTracker } from '@/hooks/useMarketingTracker';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { 
  Smartphone, 
  Monitor, 
  Share, 
  Plus, 
  MoreVertical,
  Download,
  CheckCircle2,
  Wifi,
  Zap,
  Bell,
  Chrome,
  Globe,
  ArrowRight
} from 'lucide-react';

// Lazy load heavy components
const AnimatedPhoneMockup = lazy(() => import("@/components/marketing/AnimatedPhoneMockup").then(m => ({ default: m.AnimatedPhoneMockup })));
const AppCarousel = lazy(() => import("@/components/marketing/AppCarousel").then(m => ({ default: m.AppCarousel })));
const TourModeDemo = lazy(() => import("@/components/marketing/TourModeDemo").then(m => ({ default: m.TourModeDemo })));
const EnhancedMarketingFooter = lazy(() => import("@/components/marketing/EnhancedMarketingFooter").then(m => ({ default: m.EnhancedMarketingFooter })));
const MarketingPWANotification = lazy(() => import("@/components/marketing/MarketingPWANotification").then(m => ({ default: m.MarketingPWANotification })));
const QRCodeSVG = lazy(() => import('qrcode.react').then(m => ({ default: m.QRCodeSVG })));

const FooterPlaceholder = memo(() => <div className="h-64 bg-muted/30 animate-pulse" />);
const DemoLoader = () => <div className="h-64 flex items-center justify-center text-muted-foreground">Chargement...</div>;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const { trackSignupClick } = useMarketingTracker('install');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    document.title = "Installer IKtracker | Guide PWA gratuit";
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background select-text">
      <Helmet>
        <title>Installer IKtracker | Application PWA gratuite iOS et Android</title>
        <meta name="description" content="Installez librement IKtracker sur votre smartphone iOS ou Android en 2 minutes. Outil professionnel PWA gratuit, sans App Store." />
        <meta name="keywords" content="installer IKtracker, PWA indemnités kilométriques, application iOS IK, Android frais kilométriques, installer sans App Store, application gratuite mobile" />
        <link rel="canonical" href="https://iktracker.fr/install" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Installer IKtracker | Application PWA iOS et Android" />
        <meta property="og:description" content="Installez librement IKtracker sur votre smartphone iOS ou Android en 2 minutes. Outil professionnel PWA gratuit, sans App Store." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://iktracker.fr/install" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Installer IKtracker | PWA iOS et Android" />
        <meta name="twitter:description" content="Installez librement IKtracker sur votre smartphone iOS ou Android en 2 minutes. Outil professionnel PWA gratuit, sans App Store." />
        <meta name="twitter:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        
        {/* Geo */}
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="France" />
        <meta name="language" content="fr" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Installer IKtracker",
            "description": "Guide d'installation de l'application PWA IKtracker sur iOS et Android",
            "url": "https://iktracker.fr/install",
            "isPartOf": {
              "@type": "WebSite",
              "name": "IKtracker",
              "url": "https://iktracker.fr"
            },
            "mainEntity": {
              "@type": "HowTo",
              "name": "Comment installer IKtracker",
              "step": [
                {
                  "@type": "HowToStep",
                  "name": "Ouvrir iktracker.fr",
                  "text": "Accédez à iktracker.fr depuis votre navigateur mobile"
                },
                {
                  "@type": "HowToStep",
                  "name": "Ajouter à l'écran d'accueil",
                  "text": "Cliquez sur Partager puis 'Ajouter à l'écran d'accueil'"
                },
                {
                  "@type": "HowToStep",
                  "name": "Lancer l'application",
                  "text": "L'icône IKtracker apparaît sur votre écran d'accueil"
                }
              ],
              "totalTime": "PT2M"
            }
          })}
        </script>
      </Helmet>
      
      <MarketingNav />

      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Hero */}
        <section 
          className="pt-24 pb-16 px-4 relative overflow-hidden"
          aria-labelledby="hero-heading"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/10" aria-hidden="true" />
          <div className="container mx-auto relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Smartphone className="h-4 w-4" aria-hidden="true" />
                  <span>Application PWA</span>
                </div>
                <h1 id="hero-heading" className="text-4xl md:text-5xl font-bold tracking-tight">
                  Installez en
                  <br />
                  <span className="text-primary">30 secondes</span>
                </h1>
              <p className="text-xl text-muted-foreground">
                Accédez librement à l'app. Aucun store requis, directement sur votre écran d'accueil.
              </p>
              
              {deferredPrompt && !isInstalled && (
                <Button size="lg" variant="gradient" onClick={handleInstallClick} className="gap-2">
                  <Download className="h-5 w-5" />
                  Installer maintenant
                </Button>
              )}
              
              {isInstalled && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">IKtracker est installé !</span>
                </div>
              )}
            </div>
            <div className="animate-scale-in">
              <Suspense fallback={<DemoLoader />}>
                <AnimatedPhoneMockup screen="dashboard" />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-muted/30" aria-labelledby="benefits-heading">
        <div className="container mx-auto px-4">
          <h3 id="benefits-heading" className="sr-only">Avantages de l'application PWA</h3>
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="list">
            {[
              { icon: Zap, title: "Accès instantané" },
              { icon: Wifi, title: "Mode hors-ligne" },
              { icon: Bell, title: "Notifications" },
              { icon: Download, title: "Sans App Store" },
            ].map((item, i) => (
              <li key={i}>
                <Card className="border-border animate-fade-in h-full" style={{ animationDelay: `${i * 100}ms` }}>
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3" aria-hidden="true">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold">{item.title}</h4>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Installation Steps */}
      <section className="py-20" aria-labelledby="install-steps-heading">
        <div className="container mx-auto px-4">
          <h2 id="install-steps-heading" className="text-3xl font-bold text-center mb-12">Comment installer</h2>
          
          <Tabs defaultValue="iphone" className="w-full max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-8" aria-label="Choisir votre appareil">
              <TabsTrigger value="iphone" className="gap-2">
                <span aria-hidden="true">🍎</span> iPhone / iPad
              </TabsTrigger>
              <TabsTrigger value="android" className="gap-2">
                <span aria-hidden="true">🤖</span> Android
              </TabsTrigger>
            </TabsList>

            <TabsContent value="iphone">
              <Card>
                <CardHeader className="sr-only">
                  <CardTitle>Instructions pour iPhone et iPad</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ol className="space-y-4" aria-label="Étapes d'installation pour iOS">
                    {[
                      { icon: Globe, text: "Ouvrez Safari (obligatoire sur iOS)" },
                      { icon: Share, text: "Appuyez sur le bouton Partager" },
                      { icon: Plus, text: "Sélectionnez 'Sur l'écran d'accueil'" },
                      { icon: CheckCircle2, text: "Confirmez l'ajout" },
                    ].map((step, i) => (
                      <li key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0" aria-hidden="true">
                          {i + 1}
                        </div>
                        <step.icon className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                        <span className="font-medium">{step.text}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="android">
              <Card>
                <CardHeader className="sr-only">
                  <CardTitle>Instructions pour Android</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ol className="space-y-4" aria-label="Étapes d'installation pour Android">
                    {[
                      { icon: Chrome, text: "Ouvrez Chrome" },
                      { icon: MoreVertical, text: "Appuyez sur le menu ⋮" },
                      { icon: Download, text: "Sélectionnez 'Installer l'application'" },
                      { icon: CheckCircle2, text: "Confirmez l'installation" },
                    ].map((step, i) => (
                      <li key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0" aria-hidden="true">
                          {i + 1}
                        </div>
                        <step.icon className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                        <span className="font-medium">{step.text}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* App Preview Carousel */}
      <section className="py-20 bg-muted/30" aria-labelledby="app-preview-heading">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <h2 id="app-preview-heading" className="text-3xl font-bold">Aperçu de l'application</h2>
            <p className="text-muted-foreground">Une expérience native sur votre mobile</p>
          </div>
          <Suspense fallback={<DemoLoader />}>
            <AppCarousel />
          </Suspense>
        </div>
      </section>

      {/* Tour Mode Demo */}
      <section className="py-20" aria-labelledby="tour-mode-heading">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 id="tour-mode-heading" className="text-3xl font-bold">Découvrez le Mode Tournée</h2>
              <p className="text-lg text-muted-foreground">
                Enregistrez plusieurs arrêts en un seul trajet avec le suivi GPS en temps réel.
              </p>
              <Link to="/mode-tournee" aria-label="En savoir plus sur le Mode Tournée">
                <Button variant="outline" className="gap-2">
                  En savoir plus
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
            <Suspense fallback={<DemoLoader />}>
              <TourModeDemo />
            </Suspense>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground" aria-labelledby="cta-heading">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h2 id="cta-heading" className="text-3xl font-bold">Prêt à installer ?</h2>
          <p className="text-lg opacity-90">Ouvrez cette page sur votre mobile et suivez les instructions.</p>
          
          {/* QR Code for desktop users */}
          <div className="hidden md:flex flex-col items-center gap-3 py-4" aria-label="QR code pour accéder à cette page sur mobile">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <Suspense fallback={<div className="w-40 h-40 bg-muted animate-pulse" />}>
                <QRCodeSVG 
                  value="https://iktracker.fr/install" 
                  size={160}
                  level="M"
                  includeMargin={false}
                  role="img"
                  aria-label="QR code vers iktracker.fr/install"
                />
              </Suspense>
            </div>
            <p className="text-sm opacity-80">Scannez ce QR code avec votre téléphone</p>
          </div>
          
          <Link to="/signup" onClick={trackSignupClick} aria-label="Créer mon compte IKtracker">
            <Button size="lg" variant="secondary" className="gap-2">
              Créer mon compte
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </Link>
        </div>
        </section>
      </main>

      <Suspense fallback={<FooterPlaceholder />}>
        <EnhancedMarketingFooter />
      </Suspense>
      <Suspense fallback={null}>
        <MarketingPWANotification />
      </Suspense>
    </div>
  );
};

export default Install;
