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

