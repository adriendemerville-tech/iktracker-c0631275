import { useState, useEffect } from 'react';
import { Truck, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'ios' | 'macos-safari' | 'macos-chrome' | 'android' | 'other';

export const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [platform, setPlatform] = useState<Platform>('other');

  useEffect(() => {
    // Check if already dismissed today
    const lastDismissed = localStorage.getItem('pwa-install-dismissed-date');
    if (lastDismissed) {
      const today = new Date().toDateString();
      if (lastDismissed === today) {
        setDismissed(true);
        return;
      }
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Detect platform
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isMac = /Macintosh/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isChrome = /Chrome/.test(ua);
    
    if (isIOS) {
      setPlatform('ios');
    } else if (isMac && isSafari) {
      setPlatform('macos-safari');
    } else if (isMac && isChrome) {
      setPlatform('macos-chrome');
    } else if (/Android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('other');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show banner after 3 seconds
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
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
      // Show platform-specific help
      setShowHelp(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowHelp(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed-date', new Date().toDateString());
  };

  const renderHelpContent = () => {
    switch (platform) {
      case 'ios':
        return (
          <>
            <p className="text-sm text-foreground mb-2">
              <span className="font-semibold">Pour installer IkTracker :</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Cliquez sur l'icône de partage{' '}
              <span className="inline-block w-5 h-5 align-middle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>{' '}
              puis sur <strong>"Sur l'écran d'accueil"</strong>
            </p>
          </>
        );
      case 'macos-safari':
        return (
          <>
            <p className="text-sm text-foreground mb-2">
              <span className="font-semibold">Pour ajouter IkTracker au Dock :</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Dans Safari, cliquez sur <strong>Fichier</strong> → <strong>"Ajouter au Dock"</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              (macOS Sonoma ou ultérieur requis)
            </p>
          </>
        );
      case 'macos-chrome':
        return (
          <>
            <p className="text-sm text-foreground mb-2">
              <span className="font-semibold">Pour installer IkTracker :</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Cliquez sur l'icône <strong>⊕</strong> dans la barre d'adresse, ou allez dans le menu <strong>⋮</strong> → <strong>"Installer IkTracker"</strong>
            </p>
          </>
        );
      default:
        return (
          <>
            <p className="text-sm text-foreground mb-2">
              <span className="font-semibold">Pour installer IkTracker :</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Cherchez l'icône d'installation dans la barre d'adresse de votre navigateur, ou dans le menu du navigateur.
            </p>
          </>
        );
    }
  };

  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 safe-area-bottom flex justify-center">
      <div className="bg-white dark:bg-card rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-3 relative w-full max-w-md">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {showHelp ? (
          <div className="flex flex-col items-center text-center py-2 px-4">
            {renderHelpContent()}
            <button
              onClick={() => setShowHelp(false)}
              className="mt-3 text-sm text-[#2661D9] font-medium"
            >
              Compris
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 pr-6">
            {/* Icon */}
            <div 
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#2661D9' }}
            >
              <Truck className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-sm">Installez IkTracker</h3>
              <p className="text-xs text-muted-foreground">
                Accès direct et suivi simplifié
              </p>
            </div>

            {/* Install button */}
            <button
              onClick={handleInstall}
              className="flex-shrink-0 px-4 py-2 rounded-full text-white text-sm font-medium transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: '#2661D9' }}
            >
              Installer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
