import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { AnimatedPhoneMockup } from "@/components/marketing/AnimatedPhoneMockup";
import { AppCarousel } from "@/components/marketing/AppCarousel";
import { TourModeDemo } from "@/components/marketing/TourModeDemo";
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
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
    <div className="min-h-screen bg-background">
      <title>Installer IKtracker - Application PWA gratuite</title>
      <meta name="description" content="Installez IKtracker sur votre smartphone iOS ou Android en 2 minutes." />
      
      <MarketingNav />

      {/* Hero */}
      <section className="pt-24 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/10" />
        <div className="container mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Smartphone className="h-4 w-4" />
                Application PWA
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Installez en
                <br />
                <span className="text-primary">30 secondes</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Aucun store requis. Directement sur votre écran d'accueil.
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
              <AnimatedPhoneMockup screen="dashboard" />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Zap, title: "Accès instantané" },
              { icon: Wifi, title: "Mode hors-ligne" },
              { icon: Bell, title: "Notifications" },
              { icon: Download, title: "Sans App Store" },
            ].map((item, i) => (
              <Card key={i} className="border-border animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold">{item.title}</h4>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Installation Steps */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Comment installer</h2>
          
          <Tabs defaultValue="iphone" className="w-full max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="iphone" className="gap-2">
                🍎 iPhone / iPad
              </TabsTrigger>
              <TabsTrigger value="android" className="gap-2">
                🤖 Android
              </TabsTrigger>
            </TabsList>

            <TabsContent value="iphone">
              <Card>
                <CardContent className="p-6 space-y-4">
                  {[
                    { icon: Globe, text: "Ouvrez Safari (obligatoire sur iOS)" },
                    { icon: Share, text: "Appuyez sur le bouton Partager" },
                    { icon: Plus, text: "Sélectionnez 'Sur l'écran d'accueil'" },
                    { icon: CheckCircle2, text: "Confirmez l'ajout" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                        {i + 1}
                      </div>
                      <step.icon className="h-5 w-5 text-primary shrink-0" />
                      <span className="font-medium">{step.text}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="android">
              <Card>
                <CardContent className="p-6 space-y-4">
                  {[
                    { icon: Chrome, text: "Ouvrez Chrome" },
                    { icon: MoreVertical, text: "Appuyez sur le menu ⋮" },
                    { icon: Download, text: "Sélectionnez 'Installer l'application'" },
                    { icon: CheckCircle2, text: "Confirmez l'installation" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                        {i + 1}
                      </div>
                      <step.icon className="h-5 w-5 text-primary shrink-0" />
                      <span className="font-medium">{step.text}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* App Preview Carousel */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl font-bold">Aperçu de l'application</h2>
            <p className="text-muted-foreground">Une expérience native sur votre mobile</p>
          </div>
          <AppCarousel />
        </div>
      </section>

      {/* Tour Mode Demo */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Découvrez le Mode Tournée</h2>
              <p className="text-lg text-muted-foreground">
                Enregistrez plusieurs arrêts en un seul trajet avec le suivi GPS en temps réel.
              </p>
              <Link to="/mode-tournee">
                <Button variant="outline" className="gap-2">
                  En savoir plus
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <TourModeDemo />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold">Prêt à installer ?</h2>
          <p className="text-lg opacity-90">Ouvrez cette page sur votre mobile et suivez les instructions.</p>
          <Link to="/signup">
            <Button size="lg" variant="secondary" className="gap-2">
              Créer mon compte
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Install;
