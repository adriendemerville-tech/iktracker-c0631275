// Monitoring volontairement sans dépendance native.
// Le pont Sentry natif a été retiré du démarrage : il s'initialisait avant le
// premier écran React et provoquait une fermeture immédiate de l'app (crash au
// lancement, hors de portée de StartupBoundary). On garde ici une API stable,
// purement JS, que l'on pourra rebrancher plus tard sur un service distant.

type Extra = Record<string, string>;

const buffer: Array<{ stage: string; message: string; extra?: Extra; at: string }> = [];

export function captureStartupError(error: unknown, stage: string, extra?: Extra) {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
  buffer.push({ stage, message, extra, at: new Date().toISOString() });
  if (buffer.length > 50) buffer.shift();
  console.warn(`[startup:${stage}]`, message, extra ?? "");
}

export function getStartupErrors() {
  return [...buffer];
}
