import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { deferAnalytics, whenInteractive, preloadModule } from "./lib/idle-callback";

// Render app immediately - critical path
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Defer non-critical initializations to improve TTI
whenInteractive(() => {
  // Preload common routes during idle time
  preloadModule(() => import("./pages/MesTrajets"));
  preloadModule(() => import("./pages/Profile"));
  
  // Preload heavy vendor chunks during idle
  preloadModule(() => import("recharts"));
  preloadModule(() => import("framer-motion"));
});

// Defer analytics initialization
deferAnalytics(() => {
  // Mark fonts as loaded for CSS optimization
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add('fonts-loaded');
    });
  }
});
