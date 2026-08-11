import { useEffect } from 'react';
import { useLocation } from '@/lib/router-compat';
import ReactGAModule from 'react-ga4';
import { getGaAttributionParams, getSessionAttribution } from '@/lib/traffic-attribution';

// react-ga4 is CJS; depending on the bundler interop the default export can be
// nested under `.default`. Resolve whichever shape is present.
const ReactGA = ((ReactGAModule as unknown as { default?: typeof ReactGAModule }).default ??
  ReactGAModule) as typeof ReactGAModule;

// Extend window to track initialization state
declare global {
  interface Window {
    GA_INITIALIZED?: boolean;
  }
}

const MEASUREMENT_ID = 'G-W33RV35QPJ';

export const AnalyticsTracker = () => {
  const location = useLocation();

  // Initialize GA4 with 3s delay to not impact initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!window.GA_INITIALIZED) {
        const attribution = getGaAttributionParams();
        ReactGA.initialize(MEASUREMENT_ID, {
          // Les paramètres d'attribution sont attachés dès l'init pour que le
          // tout premier hit porte déjà la source réelle (IA, PWA, referral).
          gtagOptions: attribution,
        });
        // Dimensions persistantes pour tous les évènements suivants.
        ReactGA.gtag('set', attribution);
        window.GA_INITIALIZED = true;

        const session = getSessionAttribution();
        if (session?.channel === 'ai') {
          // Évènement dédié : permet de bâtir une audience et une exploration
          // "acquisition IA" sans dépendre du canal natif GA4.
          ReactGA.event('ai_referral_session', {
            ai_vendor: session.aiVendor,
            landing_page: session.landingPage,
            entry_referrer: session.rawReferrer || '(none)',
          });
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Track page views
  useEffect(() => {
    // Only send pageview if GA is initialized
    if (window.GA_INITIALIZED) {
      ReactGA.send({
        hitType: 'pageview',
        page: location.pathname + location.search,
        ...getGaAttributionParams(),
      });
    }
  }, [location]);

  return null;
};
