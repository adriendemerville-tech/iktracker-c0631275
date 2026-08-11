// Suivi du retour depuis un fournisseur OAuth (Google, Apple, Azure).
//
// Problème : un abandon ou un refus sur l'écran de consentement Google ne
// génère aucune erreur côté application — l'utilisateur ne revient tout
// simplement jamais, ou revient avec `error=access_denied` dans l'URL.
// On pose donc un marqueur au départ, et on le résout au retour.

import ReactGAModule from 'react-ga4';
import { isBrowser, isBot, safeSessionStorage } from '@/lib/ssr-utils';
import { trackSignupEvent } from '@/lib/signup-tracking';

const ReactGA = ((ReactGAModule as unknown as { default?: typeof ReactGAModule }).default ??
  ReactGAModule) as typeof ReactGAModule;

const PENDING_KEY = 'ik_oauth_pending';
/** Au-delà, on considère la tentative comme abandonnée. */
const STALE_MS = 15 * 60 * 1000;

type Pending = { provider: string; page: string; ts: number };

function gaEvent(name: string, params: Record<string, unknown>) {
  try {
    if (isBrowser() && window.GA_INITIALIZED) ReactGA.event(name, params);
  } catch {
    /* analytics ne doit jamais casser le parcours */
  }
}

function readPending(): Pending | null {
  const raw = safeSessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Pending;
    if (!parsed?.provider) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearPending() {
  safeSessionStorage.removeItem(PENDING_KEY);
}

/** À appeler juste avant `signInWithOAuth`. */
export function markOAuthStart(provider: string, page = 'auth') {
  if (!isBrowser() || isBot()) return;
  safeSessionStorage.setItem(
    PENDING_KEY,
    JSON.stringify({ provider, page, ts: Date.now() } satisfies Pending),
  );
}

/**
 * À appeler au montage des pages d'auth/inscription.
 * `hasSession` indique si une session Supabase est déjà présente au retour.
 *
 * Émet un des évènements suivants :
 * - `signup_oauth_return`   : retour effectif depuis le fournisseur
 * - `signup_oauth_denied`   : refus explicite sur l'écran de consentement
 * - `signup_oauth_abandon`  : retour sans session ni erreur (fermeture/back)
 */
export function resolveOAuthReturn(hasSession: boolean, page = 'auth') {
  if (!isBrowser() || isBot()) return;
  const pending = readPending();
  if (!pending) return;

  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const errorCode = params.get('error') ?? hash.get('error');
  const errorDesc =
    params.get('error_description') ?? hash.get('error_description') ?? '';
  const elapsed = Date.now() - pending.ts;
  const stale = elapsed > STALE_MS;

  const base = {
    provider: pending.provider,
    start_page: pending.page,
    elapsed_ms: elapsed,
  };

  // Retour effectif depuis le fournisseur (succès ou échec) : on le trace
  // toujours, c'est ce qui permet de calculer le taux de retour.
  if (!stale) {
    void trackSignupEvent(
      'signup_oauth_return',
      `${pending.provider}:${errorCode ? 'error' : hasSession ? 'session' : 'no_session'}`,
      page,
    );
    gaEvent('signup_oauth_return', {
      ...base,
      outcome: errorCode ? 'error' : hasSession ? 'session' : 'no_session',
    });
  }

  if (errorCode) {
    const denied = /access_denied|consent_required|user_cancelled|interaction_required/i.test(
      `${errorCode} ${errorDesc}`,
    );
    void trackSignupEvent(
      denied ? 'signup_oauth_denied' : 'signup_error',
      `${pending.provider}: ${errorCode} ${errorDesc}`.slice(0, 200),
      page,
    );
    gaEvent(denied ? 'signup_oauth_denied' : 'signup_oauth_error', {
      ...base,
      error_code: errorCode,
      error_description: errorDesc.slice(0, 120),
    });
  } else if (!hasSession) {
    // Revenu sur l'écran d'auth sans session : abandon sur le consentement
    // (fermeture de l'onglet Google, bouton retour, timeout).
    void trackSignupEvent(
      'signup_oauth_abandon',
      `${pending.provider}:${stale ? 'stale' : 'returned'}`,
      page,
    );
    gaEvent('signup_oauth_abandon', { ...base, reason: stale ? 'stale' : 'returned' });
  }

  clearPending();
}

/** À appeler après un `SIGNED_IN` confirmé pour ne pas compter d'abandon. */
export function clearOAuthPending() {
  if (!isBrowser()) return;
  clearPending();
}
