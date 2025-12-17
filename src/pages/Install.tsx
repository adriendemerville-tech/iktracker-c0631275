import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
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
  Globe
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // SEO meta tags
    document.title = "Installer IKtracker | Guide d'installation PWA";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', "Guide complet pour installer IKtracker sur votre téléphone ou navigateur. Instructions pas à pas pour iPhone, Android, Chrome, Firefox, Safari et Edge.");
    }
    return () => {
      document.title = 'IKtracker - Calcul automatique des indemnités kilométriques';
    };
  }, []);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capture the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const benefits = [
    {
      icon: Zap,
      title: "Accès instantané",
      description: "Lancez IKtracker en un clic depuis votre écran d'accueil"
    },
    {
      icon: Wifi,
      title: "Mode hors-ligne",
      description: "Consultez vos trajets même sans connexion internet"
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Recevez des alertes pour vos nouveaux rendez-vous"
    },
    {
      icon: Download,
      title: "Pas de téléchargement",
      description: "Aucune installation via l'App Store ou Google Play nécessaire"
    }
  ];

  const mobileGuides = [
    {
      id: 'iphone',
      name: 'iPhone / iPad',
      browser: 'Safari',
      icon: '🍎',
      steps: [
        {
          step: 1,
          title: "Ouvrez Safari",
          description: "Assurez-vous d'utiliser Safari (le navigateur par défaut). L'installation ne fonctionne pas avec Chrome ou Firefox sur iOS.",
          tip: "Safari est obligatoire sur iPhone/iPad"
        },
        {
          step: 2,
          title: "Allez sur iktracker.fr",
          description: "Tapez iktracker.fr dans la barre d'adresse et attendez que la page charge complètement."
        },
        {
          step: 3,
          title: "Appuyez sur le bouton Partager",
          description: "En bas de l'écran (ou en haut sur iPad), appuyez sur l'icône de partage (carré avec une flèche vers le haut).",
          icon: Share
        },
        {
          step: 4,
          title: "Faites défiler et sélectionnez \"Sur l'écran d'accueil\"",
          description: "Dans le menu qui apparaît, faites défiler vers le bas et appuyez sur \"Sur l'écran d'accueil\".",
          icon: Plus
        },
        {
          step: 5,
          title: "Confirmez l'ajout",
          description: "Vérifiez le nom (IKtracker) et appuyez sur \"Ajouter\" en haut à droite. L'icône apparaîtra sur votre écran d'accueil !"
        }
      ]
    },
    {
      id: 'android',
      name: 'Android',
      browser: 'Chrome',
      icon: '🤖',
      steps: [
        {
          step: 1,
          title: "Ouvrez Chrome",
          description: "Utilisez Google Chrome pour la meilleure expérience. Firefox et Samsung Internet fonctionnent aussi.",
          tip: "Chrome recommandé"
        },
        {
          step: 2,
          title: "Allez sur iktracker.fr",
          description: "Tapez iktracker.fr dans la barre d'adresse et attendez que la page charge."
        },
        {
          step: 3,
          title: "Appuyez sur le menu ⋮",
          description: "En haut à droite de Chrome, appuyez sur les trois points verticaux pour ouvrir le menu.",
          icon: MoreVertical
        },
        {
          step: 4,
          title: "Sélectionnez \"Installer l'application\"",
          description: "Dans le menu, cherchez \"Installer l'application\" ou \"Ajouter à l'écran d'accueil\" et appuyez dessus.",
          icon: Download
        },
        {
          step: 5,
          title: "Confirmez l'installation",
          description: "Appuyez sur \"Installer\" dans la popup. L'application sera ajoutée à votre écran d'accueil et au tiroir d'applications !"
        }
      ]
    }
  ];

  const desktopGuides = [
    {
      id: 'chrome',
      name: 'Google Chrome',
      icon: Chrome,
      color: 'text-[#4285F4]',
      steps: [
        {
          step: 1,
          title: "Ouvrez Chrome et allez sur iktracker.fr"
        },
        {
          step: 2,
          title: "Cliquez sur l'icône d'installation",
          description: "Dans la barre d'adresse, à droite, cliquez sur l'icône avec un écran et une flèche (ou un + dans un carré)."
        },
        {
          step: 3,
          title: "Cliquez sur \"Installer\"",
          description: "Dans la popup qui apparaît, cliquez sur \"Installer\". IKtracker s'ouvrira dans sa propre fenêtre."
        }
      ],
      alternative: "Vous pouvez aussi cliquer sur le menu ⋮ → \"Installer IKtracker...\""
    },
    {
      id: 'edge',
      name: 'Microsoft Edge',
      icon: Globe,
      color: 'text-[#0078D4]',
      steps: [
        {
          step: 1,
          title: "Ouvrez Edge et allez sur iktracker.fr"
        },
        {
          step: 2,
          title: "Cliquez sur l'icône d'installation",
          description: "Dans la barre d'adresse, cliquez sur l'icône avec un + dans un carré."
        },
        {
          step: 3,
          title: "Cliquez sur \"Installer\"",
          description: "Confirmez l'installation. L'app sera ajoutée à votre menu Démarrer Windows."
        }
      ],
      alternative: "Menu ⋯ → \"Applications\" → \"Installer ce site en tant qu'application\""
    },
    {
      id: 'firefox',
      name: 'Mozilla Firefox',
      icon: Globe,
      color: 'text-[#FF7139]',
      steps: [
        {
          step: 1,
          title: "Firefox ne supporte pas nativement les PWA",
          description: "Firefox n'offre pas d'option d'installation native pour les applications web progressives sur ordinateur."
        },
        {
          step: 2,
          title: "Alternative : utilisez Chrome ou Edge",
          description: "Pour installer IKtracker comme application, nous vous recommandons d'utiliser Chrome ou Edge."
        }
      ],
      alternative: "Vous pouvez toujours ajouter IKtracker à vos favoris pour un accès rapide."
    },
    {
      id: 'safari-mac',
      name: 'Safari (Mac)',
      icon: Globe,
      color: 'text-[#006CFF]',
      steps: [
        {
          step: 1,
          title: "Ouvrez Safari et allez sur iktracker.fr"
        },
        {
          step: 2,
          title: "Menu Fichier → \"Ajouter au Dock\"",
          description: "Dans la barre de menu, cliquez sur Fichier puis \"Ajouter au Dock\"."
        },
        {
          step: 3,
          title: "L'icône apparaît dans votre Dock",
          description: "IKtracker sera accessible directement depuis votre Dock Mac."
        }
      ],
      alternative: "Disponible sur macOS Sonoma (14) et versions ultérieures."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.png" alt="IKtracker" className="h-9 w-9 rounded-full" />
            <span className="text-xl font-bold text-foreground">IKtracker</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Download className="h-4 w-4" />
            Installation gratuite
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Installez <span className="text-gradient">IKtracker</span> sur votre appareil
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            IKtracker est une application web progressive (PWA). Installez-la comme une vraie app, sans passer par les stores !
          </p>
        </div>

        {/* Quick install button (if available) */}
        {deferredPrompt && !isInstalled && (
          <div className="mb-12">
            <Card className="bg-gradient-primary border-0 text-primary-foreground max-w-xl mx-auto">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2">Installation rapide disponible !</h3>
                <p className="mb-4 opacity-90">Cliquez sur le bouton ci-dessous pour installer IKtracker immédiatement.</p>
                <Button 
                  variant="secondary" 
                  size="lg" 
                  onClick={handleInstallClick}
                  className="group"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Installer maintenant
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Already installed */}
        {isInstalled && (
          <div className="mb-12">
            <Card className="bg-success/10 border-success/20 max-w-xl mx-auto">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                <h3 className="text-xl font-bold text-foreground mb-2">IKtracker est déjà installé !</h3>
                <p className="text-muted-foreground">Vous pouvez lancer l'application depuis votre écran d'accueil ou menu Démarrer.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Benefits */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-border">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">{benefit.title}</h4>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Installation guides */}
        <Tabs defaultValue="mobile" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="mobile" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="desktop" className="gap-2">
              <Monitor className="h-4 w-4" />
              Ordinateur
            </TabsTrigger>
          </TabsList>

          {/* Mobile guides */}
          <TabsContent value="mobile">
            <div className="grid md:grid-cols-2 gap-6">
              {mobileGuides.map((guide) => (
                <Card key={guide.id} className="border-border overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <CardTitle className="flex items-center gap-3">
                      <span className="text-3xl">{guide.icon}</span>
                      <div>
                        <div className="text-xl">{guide.name}</div>
                        <div className="text-sm font-normal text-muted-foreground">via {guide.browser}</div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ol className="space-y-4">
                      {guide.steps.map((step) => (
                        <li key={step.step} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                            {step.step}
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              {step.title}
                              {step.icon && <step.icon className="h-4 w-4 text-primary" />}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                            {step.tip && (
                              <span className="inline-block mt-2 text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                💡 {step.tip}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Desktop guides */}
          <TabsContent value="desktop">
            <div className="grid md:grid-cols-2 gap-6">
              {desktopGuides.map((guide) => (
                <Card key={guide.id} className="border-border overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <CardTitle className="flex items-center gap-3">
                      <guide.icon className={`h-8 w-8 ${guide.color}`} />
                      <div className="text-xl">{guide.name}</div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ol className="space-y-4">
                      {guide.steps.map((step) => (
                        <li key={step.step} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                            {step.step}
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="font-semibold text-foreground">{step.title}</div>
                            {step.description && (
                              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                    {guide.alternative && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Alternative : </span>
                          {guide.alternative}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Card className="bg-muted/50 border-border max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-foreground mb-2">Besoin d'aide ?</h3>
              <p className="text-muted-foreground mb-4">
                Si vous rencontrez des difficultés lors de l'installation, n'hésitez pas à nous contacter.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/signup">
                  <Button variant="gradient">
                    Créer mon compte gratuit
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline">
                    Retour à l'accueil
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border mt-12">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} IKtracker. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Install;
