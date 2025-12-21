import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const MarketingPWANotification = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (navigator as any).standalone === true;
    
    if (isStandalone) return;

    // Check if dismissed within last 3 days (less aggressive for marketing)
    const dismissedTimestamp = localStorage.getItem('pwa-marketing-notification-dismissed');
    if (dismissedTimestamp) {
      const daysDiff = (Date.now() - parseInt(dismissedTimestamp, 10)) / (1000 * 60 * 60 * 24);
      if (daysDiff < 3) return;
    }

    // Check session: only show once per session with 30% probability
    const shownThisSession = sessionStorage.getItem('pwa-marketing-shown');
    if (shownThisSession) return;

    // 30% chance to show (not too aggressive)
    const shouldShow = Math.random() < 0.3;
    if (!shouldShow) {
      sessionStorage.setItem('pwa-marketing-shown', 'skipped');
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show after 10 seconds minimum
    const timer = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem('pwa-marketing-shown', 'true');
    }, 10000);

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
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-marketing-notification-dismissed', Date.now().toString());
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-card/95 border border-border/50 shadow-2xl shadow-primary/10 backdrop-blur-xl">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
            
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all z-10"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-5 pr-10">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                  <Smartphone className="w-6 h-6 text-primary-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <h3 className="font-bold text-foreground text-base leading-tight">
                      Installez l'app
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Accédez à IKtracker en un clic depuis votre écran d'accueil.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {deferredPrompt ? (
                      <button
                        onClick={handleInstall}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:bg-primary/90 hover:shadow-md active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        Installer
                      </button>
                    ) : (
                      <Link
                        to="/install"
                        onClick={() => setShow(false)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:bg-primary/90 hover:shadow-md active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        Voir le guide
                      </Link>
                    )}
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Plus tard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
