// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Charge toutes les variables d'environnement dans process.env pour les
// routes serveur (ex. SUPABASE_SERVICE_ROLE_KEY, sans préfixe VITE_).
const serverEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

// Une seule copie d'entities : celle hissée à la racine. La copie imbriquée
// (parse5) casse le SSR. Les alias exacts « entities/decode » doivent précéder
// l'alias racine, car la v4.5.0 n'exporte pas « ./decode ».
const entitiesRoot = path.resolve(__dirname, "node_modules/entities");

function entitiesModule(name: "decode" | "encode" | "escape"): string {
  // bun.lock (Lovable) hisse la v4.5.0 : lib/*.js.
  // package-lock.json hisse la v6 : dist/esm/*.js, sans dossier lib/.
  const candidates = [
    path.join(entitiesRoot, "lib", `${name}.js`),
    path.join(entitiesRoot, "dist", "esm", `${name}.js`),
    path.join(entitiesRoot, "lib", "esm", `${name}.js`),
  ];
  const found = candidates.find((file) => fs.existsSync(file));
  if (!found) {
    throw new Error(
      `entities : « ${name}.js » introuvable dans ${entitiesRoot} (lib/ pour la v4.5, dist/esm/ pour la v6).`,
    );
  }
  return found;
}

const entitiesDecode = entitiesModule("decode");
const entitiesEncode = entitiesModule("encode");
const entitiesEscape = entitiesModule("escape");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        "entities/decode": entitiesDecode,
        "entities/encode": entitiesEncode,
        "entities/escape": entitiesEscape,
        "entities/lib/decode.js": entitiesDecode,
        "entities/lib/encode.js": entitiesEncode,
        entities: entitiesRoot,
      },
    },
    // Cache incrémental : Vite réutilise node_modules/.vite (deps pré-bundlées,
    // métadonnées de transform) entre les builds tant que ce dossier est persisté
    // par l'environnement de build (CI / plateforme). warmup pré-transforme les
    // modules les plus lourds en amont pour lisser le temps de build.
    cacheDir: "node_modules/.vite",
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
