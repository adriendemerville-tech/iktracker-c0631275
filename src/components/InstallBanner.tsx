import { useState, useEffect } from 'react';
import { Truck, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

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

    const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iosDevice);

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
    } else if (isIOS) {
      setShowIOSHelp(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSHelp(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed-date', new Date().toDateString());
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

        {showIOSHelp ? (
          <div className="flex flex-col items-center text-center py-2 px-4">
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
            <button
              onClick={() => setShowIOSHelp(false)}
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
