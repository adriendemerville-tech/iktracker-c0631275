// Chargement dynamique résilient.
//
// En production, un déploiement invalide les hachages des chunks : un onglet
// resté ouvert demande un fichier qui n'existe plus et `import()` échoue
// ("Failed to fetch dynamically imported module"). Sans garde-fou, l'erreur
// remonte jusqu'à la frontière SSR/React et se transforme en page 500.
//
// Stratégie : quelques tentatives espacées (réseau instable), puis un unique
// rechargement dur de la page (nouveau manifeste d'assets), verrouillé par
// sessionStorage pour éviter toute boucle de reload.

import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const RELOAD_FLAG_PREFIX = "chunk-reload:";

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk|error loading dynamically imported/i.test(
    message,
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function alreadyReloadedFor(key: string): boolean {
  if (typeof sessionStorage === "undefined") return true;
  try {
    const flagKey = RELOAD_FLAG_PREFIX + key;
    if (sessionStorage.getItem(flagKey)) return true;
    sessionStorage.setItem(flagKey, String(Date.now()));
    return false;
  } catch {
    return true;
  }
}

/**
 * Exécute un `import()` avec retries puis, en dernier recours, un reload unique.
 * Utilisable directement pour les dépendances lourdes (html2pdf, jszip, recharts…).
 */
export async function importWithRetry<T>(
  factory: () => Promise<T>,
  key: string,
  retries = 2,
  delayMs = 400,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
      if (!isChunkLoadError(error)) throw error;
      if (attempt < retries) await sleep(delayMs * (attempt + 1));
    }
  }

  if (typeof window !== "undefined" && !alreadyReloadedFor(key)) {
    window.location.reload();
    // La promesse ne se résout jamais : la page est en train de recharger.
    return new Promise<T>(() => {});
  }

  throw lastError;
}

/**
 * Remplaçant direct de `React.lazy` avec retry + reload contrôlé.
 * Le composant reste rendu sous un `LazyBoundary` qui affiche un fallback
 * lisible si toutes les tentatives échouent.
 */
export function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  key: string,
): LazyExoticComponent<T> {
  return lazy(() => importWithRetry(factory, key));
}
