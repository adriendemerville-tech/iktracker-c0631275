import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

// Ne jamais initialiser le pont natif sans DSN. Cette étape s'exécute avant
// le premier écran React : une erreur ici provoquerait un flash blanc puis
// la fermeture de l'app, hors de portée de StartupBoundary.
if (dsn) {
  try {
    Sentry.init({
      dsn,
      enabled: true,
      environment: __DEV__ ? 'development' : 'production',
      release: `iktracker-mobile@${Constants.expoConfig?.version ?? 'unknown'}`,
      enableNative: true,
      enableNativeCrashHandling: true,
      attachStacktrace: true,
      sendDefaultPii: false,
    });
  } catch (error) {
    console.warn('[startup] monitoring initialization failed', error);
  }
}

export function captureStartupError(
  error: unknown,
  stage: string,
  extra?: Record<string, string>,
) {
  if (!dsn) return;

  Sentry.withScope((scope) => {
    scope.setTag('startup.stage', stage);
    if (extra) scope.setExtras(extra);
    Sentry.captureException(error);
  });
}