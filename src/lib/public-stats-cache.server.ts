/**
 * Server-side in-isolate cache for public homepage stats.
 *
 * Every homepage visit used to trigger 2 synchronous RPC calls. These numbers
 * move slowly, so a 10 min TTL per worker isolate removes almost all DB load
 * while keeping the counters "live enough". On error we keep serving the last
 * known value (stale-while-error) instead of falling back to zeros.
 */

const TTL_MS = 10 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  inflight?: Promise<T>;
}

const store = new Map<string, CacheEntry<unknown>>();

export async function cachedStat<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) return entry.value;

  const refresh =
    entry?.inflight ??
    (async () => {
      try {
        const value = await loader();
        store.set(key, { value, expiresAt: Date.now() + TTL_MS });
        return value;
      } catch (err) {
        if (entry) {
          // stale-while-error: extend the old value for a short window
          store.set(key, { value: entry.value, expiresAt: Date.now() + 60_000 });
          return entry.value;
        }
        throw err;
      }
    })();

  store.set(key, {
    value: entry?.value as T,
    expiresAt: entry?.expiresAt ?? 0,
    inflight: refresh,
  });

  // stale-while-revalidate : dès qu'on a une valeur, on la renvoie immédiatement
  // et le refresh continue en tâche de fond → le TTFB ne dépend plus de la DB.
  if (entry) {
    void refresh.catch(() => {});
    return entry.value;
  }

  return refresh;
}

/**
 * Cold-start guard: si le premier remplissage du cache traîne, on rend la page
 * avec une valeur de repli plutôt que de retarder le TTFB. Le refresh continue.
 */
export function withDeadline<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

/**
 * Budget max accordé à la DB sur le chemin critique du rendu serveur.
 * Au-delà, on rend immédiatement avec la dernière valeur connue (ou le repli)
 * et le refresh se termine en tâche de fond pour la requête suivante.
 */
export const STAT_DEADLINE_MS = 120;

/**
 * Dernière valeur connue, conservée même après expiration du TTL, pour que le
 * repli d'un rendu "deadline dépassée" ne soit jamais un zéro visible.
 */
export function lastKnown<T>(key: string, fallback: T): T {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  return entry && entry.value !== undefined ? entry.value : fallback;
}

/**
 * Démarre le remplissage du cache sans bloquer la réponse courante.
 * À appeler depuis un handler (jamais au scope module : I/O interdite dans le
 * global scope du worker).
 */
export function warmStat<T>(key: string, loader: () => Promise<T>): void {
  const entry = store.get(key);
  if (entry && entry.expiresAt > Date.now()) return;
  void cachedStat(key, loader).catch(() => {});
}


