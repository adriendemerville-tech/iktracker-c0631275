// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Cache incrémental : Vite réutilise node_modules/.vite (deps pré-bundlées,
    // métadonnées de transform) entre les builds tant que ce dossier est persisté
    // par l'environnement de build (CI / plateforme). warmup pré-transforme les
    // modules les plus lourds en amont pour lisser le temps de build.
    cacheDir: "node_modules/.vite",
    build: {
      // Réutilise le cache de pré-bundling des deps entre dev et build.
      rollupOptions: { cache: true },
    },
    optimizeDeps: {
      // Garde les grosses deps pré-bundlées dans le cache persistant.
      include: ["react", "react-dom", "@tanstack/react-router"],
    },
    server: {
      warmup: {
        clientFiles: ["./src/routes/index.tsx", "./src/pages/Landing.tsx"],
      },
    },
  },
});
