import { useState, useEffect } from 'react';

export interface Preferences {
  showTripTime: boolean;
  stopDetectionMinutes: number;
}

const PREFERENCES_KEY = 'ik-tracker-preferences';

const defaultPreferences: Preferences = {
  showTripTime: true,
  stopDetectionMinutes: 7,
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }
    return defaultPreferences;
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn('Failed to save preferences:', e);
    }
  }, [preferences]);

  const updatePreference = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return {
    preferences,
    updatePreference,
  };
}
