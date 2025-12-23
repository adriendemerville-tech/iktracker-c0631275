import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// If a preload (chunk) fails (often due to stale cache / old service worker), reload once.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  window.location.reload();
});

// Keep the service worker updated so users don't get stuck with stale cached HTML/chunks.
registerSW({
  immediate: true,
  onNeedRefresh() {
    // Force a reload to pick up the new precache manifest/assets.
    window.location.reload();
  },
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
