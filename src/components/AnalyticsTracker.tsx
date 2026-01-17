import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

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
        ReactGA.initialize(MEASUREMENT_ID);
        window.GA_INITIALIZED = true;
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
        page: location.pathname + location.search 
      });
    }
  }, [location]);

  return null;
};
