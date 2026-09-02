import { useEffect } from "react";
import { useLocation } from "@/lib/router-compat";
import ReactGAModule from "react-ga4";
import { getGaAttributionParams, getSessionAttribution } from "@/lib/traffic-attribution";

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

const MEASUREMENT_ID = "G-W33RV35QPJ";

const TAAP_SRC = "https://taap.it/scripts/tracker.js";

// Charge le tracker Taap.it à la demande (jamais pendant le chargement initial).
const loadTaapIt = () => {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${TAAP_SRC}"]`)) return;
  const s = document.createElement("script");
  s.src = TAAP_SRC;
  s.async = true;
  s.dataset["project"] = "pk_42374e58f4a64fdeadbb3bdffd7191cd";
  s.dataset["trackOutbound"] = "true";
  s.dataset["trackForms"] = "true";
  document.body.appendChild(s);
};

// Déclenche `cb` à la première interaction utilisateur, après `fallbackMs`
// si l'utilisateur reste passif, ou forcé à la sortie de page (pagehide /
// onglet masqué) pour ne jamais perdre les visiteurs qui repartent tôt.
// Objectif : sortir GA/Taap du chemin critique mobile (≈162 Kio de JS GTM
// hors du chargement initial) sans sous-compter l'audience.
const onFirstInteraction = (cb: () => void, fallbackMs = 2500) => {
  let done = false;
  const events: (keyof WindowEventMap)[] = [
    "pointerdown",
    "keydown",
    "scroll",
    "touchstart",
    "mousemove",
  ];
  const run = () => {
    if (done) return;
    done = true;
    cleanup();
    cb();
  };
  const onPageHide = () => run();
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") run();
  };
  const cleanup = () => {
    events.forEach((e) => window.removeEventListener(e, run));
    window.removeEventListener("pagehide", onPageHide);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    clearTimeout(timer);
  };
  const timer = setTimeout(run, fallbackMs);
  events.forEach((e) => window.addEventListener(e, run, { once: true, passive: true }));
  window.addEventListener("pagehide", onPageHide);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return cleanup;
};

export const AnalyticsTracker = () => {
  const location = useLocation();

  // Initialisation différée : première interaction ou 6 s d'inactivité.
  useEffect(() => {
    return onFirstInteraction(() => {
      loadTaapIt();
      if (!window.GA_INITIALIZED) {
        const attribution = getGaAttributionParams();
        ReactGA.initialize(MEASUREMENT_ID, {
          // Les paramètres d'attribution sont attachés dès l'init pour que le
          // tout premier hit porte déjà la source réelle (IA, PWA, referral).
          gtagOptions: attribution,
        });
        // Dimensions persistantes pour tous les évènements suivants.
        ReactGA.gtag("set", attribution);
        window.GA_INITIALIZED = true;

        const session = getSessionAttribution();
        if (session?.channel === "ai") {
          // Évènement dédié : permet de bâtir une audience et une exploration
          // "acquisition IA" sans dépendre du canal natif GA4.
          ReactGA.event("ai_referral_session", {
            ai_vendor: session.aiVendor,
            landing_page: session.landingPage,
            entry_referrer: session.rawReferrer || "(none)",
          });
        }
      }
    });
  }, []);

  // Track page views
  useEffect(() => {
    // Only send pageview if GA is initialized
    if (window.GA_INITIALIZED) {
      ReactGA.send({
        hitType: "pageview",
        page: location.pathname + location.search,
        ...getGaAttributionParams(),
      });
    }
  }, [location]);

  return null;
};
