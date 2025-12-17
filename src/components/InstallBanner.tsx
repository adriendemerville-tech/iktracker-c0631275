import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS Safari, show banner anyway (they use Add to Home Screen)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // iOS - show instructions
      alert("Pour installer l'app sur iOS :\n1. Appuyez sur le bouton Partager\n2. Sélectionnez 'Sur l'écran d'accueil'");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-lg">
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
          <Truck className="w-8 h-8 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="font-semibold text-foreground">Installez IkTracker</h3>
          <p className="text-sm text-muted-foreground">
            Suivez vos IK sans ouvrir votre navigateur.
          </p>
        </div>

        {/* Install button */}
        <Button
          onClick={handleInstall}
          size="sm"
          className="flex-shrink-0"
        >
          Installer
        </Button>
      </div>
    </div>
  );
};
