import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

function markAppBooted() {
  // Used by index.html boot screen to avoid "white screen" situations.
  (window as any).__APP_BOOTED__ = true;
  const boot = document.getElementById("boot-screen");
  if (boot) boot.remove();
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  // If this happens, show a useful message instead of a blank page.
  (window as any).__APP_BOOT_ERROR__ = "#root introuvable";
  throw new Error("#root introuvable");
}

createRoot(rootEl).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Remove the boot screen after React mounts.
setTimeout(markAppBooted, 0);

