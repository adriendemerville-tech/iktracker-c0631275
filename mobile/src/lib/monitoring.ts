import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: __DEV__ ? 'development' : 'production',
  release: `iktracker-mobile@${Constants.expoConfig?.version ?? 'unknown'}`,
  enableNative: true,
  enableNativeCrashHandling: true,
  attachStacktrace: true,
  sendDefaultPii: false,
});

export function captureStartupError(
  error: unknown,
  stage: string,
  extra?: Record<string, string>,
) {
  Sentry.withScope((scope) => {
    scope.setTag('startup.stage', stage);
    if (extra) scope.setExtras(extra);
    Sentry.captureException(error);
  });
}