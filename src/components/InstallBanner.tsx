import { useState, useEffect } from 'react';
import { Truck, X } from 'lucide-react';
import { isBrowser, isBot, safeLocalStorage, safeMatchMedia } from '@/lib/ssr-utils';

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
  const [isSupported, setIsSupported] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Check if running in standalone mode (installed PWA)
  const checkStandaloneMode = (): boolean => {
    if (!isBrowser()) return false;
    
    // Check display-mode media query
    if (safeMatchMedia('(display-mode: standalone)')) {
      return true;
    }
    // Check iOS standalone mode
    if ((navigator as any)?.standalone === true) {
      return true;
    }
    // Check if launched from home screen on Android
    if (safeMatchMedia('(display-mode: fullscreen)')) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    // Skip for SSR and bots - critical for crawler compatibility
    if (!isBrowser() || isBot()) return;

    // Check if running in standalone mode - don't show banner if already installed
    if (checkStandaloneMode()) {
      setIsStandalone(true);
      return;
    }

    // Check if dismissed within the last 7 days
    const dismissedTimestamp = safeLocalStorage.getItem('pwa-install-dismissed-timestamp');
    if (dismissedTimestamp) {
      const dismissedDate = new Date(parseInt(dismissedTimestamp, 10));
      const now = new Date();
      const daysDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff < 7) {
        setDismissed(true);
        return;
      } else {
        // Clear old dismissal
        safeLocalStorage.removeItem('pwa-install-dismissed-timestamp');
      }
    }

    // Detect platform
    const ua = navigator?.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isMac = /Macintosh/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isChrome = /Chrome/.test(ua);
    const isAndroid = /Android/.test(ua);
    
    let detectedPlatform: Platform = 'other';
    let supported = false;

    if (isIOS) {
      detectedPlatform = 'ios';
      supported = true;
    } else if (isMac && isSafari) {
      detectedPlatform = 'macos-safari';
      supported = true;
    } else if (isMac && isChrome) {
      detectedPlatform = 'macos-chrome';
      supported = true;
    } else if (isAndroid) {
      detectedPlatform = 'android';
      supported = true;
    } else if (isChrome) {
      detectedPlatform = 'other';
      supported = true;
    }

    setPlatform(detectedPlatform);
    setIsSupported(supported);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsSupported(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for display mode changes (user installs the app)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setShowBanner(false);
      }
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Show banner after 3 seconds only if supported
    const timer = setTimeout(() => {
      if (supported) {
        setShowBanner(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
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
    // Store timestamp for 7-day dismissal
    safeLocalStorage.setItem('pwa-install-dismissed-timestamp', Date.now().toString());
  };

  const renderHelpContent = () => {
    switch (platform) {
      case 'ios':
        return (
          <>
            <p className="text-sm text-foreground mb-2">
              <span className="font-semibold">Pour installer IKtracker :</span>
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
              <span className="font-semibold">Pour ajouter IKtracker :</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Cliquez sur le bouton <strong>Partager</strong>{' '}
              <span className="inline-block w-4 h-4 align-middle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>{' '}
              dans la barre d'outils, puis <strong>"Ajouter au Dock"</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              (macOS Sonoma 14+ requis. Sinon, glissez l'URL vers le bureau)
            </p>
          </>
        );
      case 'macos-chrome':
        return (
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground mb-3">
              Pour installer IKtracker :
            </p>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Cliquez sur <strong>⋮</strong> en haut à droite</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span><strong>"Caster, enregistrer et partager"</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span><strong>"Créer un raccourci..."</strong></span>
              </li>
            </ol>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Cochez "Ouvrir dans une fenêtre" pour une expérience app
            </p>
          </div>
        );
      default:
        return (
          <>
            <p className="text-sm text-foreground mb-2">
              <span className="font-semibold">Pour installer IKtracker :</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Cherchez l'icône d'installation dans la barre d'adresse de votre navigateur, ou dans le menu du navigateur.
            </p>
          </>
        );
    }
  };

  // Don't render anything for SSR/bots or if banner shouldn't show
  if (!isBrowser() || isBot() || isStandalone || !showBanner || dismissed || !isSupported) {
    return null;
  }

  return (
    <aside 
      className="fixed bottom-0 left-0 right-0 z-50 p-3 safe-area-bottom flex justify-center"
      role="complementary"
      aria-label="Installer l'application IKtracker"
    >
      <div className="bg-white dark:bg-card rounded-md shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-3 relative w-full max-w-md">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Fermer la bannière d'installation"
          type="button"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        {showHelp ? (
          <div className="flex flex-col items-center text-center py-2 px-4">
            {renderHelpContent()}
            <button
              onClick={() => setShowHelp(false)}
              className="mt-3 text-sm text-[#2661D9] font-medium"
              type="button"
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
              aria-hidden="true"
            >
              <Truck className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-sm">Installez IKtracker</h3>
              <p className="text-xs text-muted-foreground">
                Accès direct et suivi simplifié
              </p>
            </div>

            {/* Install button */}
            <button
              onClick={handleInstall}
              className="flex-shrink-0 px-4 py-2 rounded-full text-white text-sm font-medium transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: '#2661D9' }}
              type="button"
              aria-label="Installer l'application IKtracker"
            >
              Installer
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
