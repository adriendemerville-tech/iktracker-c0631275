import { useState, useEffect, useCallback } from 'react';
import { isBrowser, isBot, safeLocalStorage, safeSessionStorage } from '@/lib/ssr-utils';

type PermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable' | 'unknown';

interface GeolocationPermissionState {
  permission: PermissionState;
  isLoading: boolean;
  error: string | null;
  showBanner: boolean;
  showTutorialModal: boolean;
  isGpsDisabled: boolean;
}

const STORAGE_KEY = 'iktracker_geolocation_dismissed';
const SESSION_COUNT_KEY = 'iktracker_geolocation_session_count';
const TOUR_STARTED_SESSION_KEY = 'iktracker_tour_started_session';
const MAX_SESSIONS = 6;

export function useGeolocationPermission() {
  const [state, setState] = useState<GeolocationPermissionState>({
    permission: 'unknown',
    isLoading: true,
    error: null,
    showBanner: false,
    showTutorialModal: false,
    isGpsDisabled: false,
  });

  // Check if banner was permanently dismissed, max sessions reached, or tour started this session
  const wasDismissed = useCallback(() => {
    const dismissed = safeLocalStorage.getItem(STORAGE_KEY) === 'true';
    if (dismissed) return true;
    
    // Check if tour was started this session
    const tourStartedThisSession = safeSessionStorage.getItem(TOUR_STARTED_SESSION_KEY) === 'true';
    if (tourStartedThisSession) return true;
    
    const sessionCount = parseInt(safeLocalStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
    return sessionCount >= MAX_SESSIONS;
  }, []);

  // Should show banner this session (every other session, up to 6 total)
  const shouldShowThisSession = useCallback(() => {
    if (wasDismissed()) return false;
    
    const sessionCount = parseInt(safeLocalStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
    
    // Show only on even sessions (0, 2, 4) = every other session
    // Session 0 -> show, Session 1 -> hide, Session 2 -> show, etc.
    return sessionCount % 2 === 0;
  }, [wasDismissed]);

  // Increment session count on mount (once per session)
  useEffect(() => {
    // Skip for SSR and bots
    if (!isBrowser() || isBot()) return;

    const sessionKey = 'iktracker_geolocation_session_tracked';
    const alreadyTracked = safeSessionStorage.getItem(sessionKey);
    
    if (!alreadyTracked) {
      const currentCount = parseInt(safeLocalStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
      safeLocalStorage.setItem(SESSION_COUNT_KEY, String(currentCount + 1));
      safeSessionStorage.setItem(sessionKey, 'true');
    }
  }, []);

  // Check permission status using Permissions API
  const checkPermission = useCallback(async () => {
    // Skip for SSR and bots
    if (!isBrowser() || isBot()) {
      setState(s => ({
        ...s,
        permission: 'unavailable',
        isLoading: false,
        showBanner: false,
      }));
      return;
    }

    setState(s => ({ ...s, isLoading: true }));

    // Check if geolocation is supported
    if (!navigator?.geolocation) {
      setState(s => ({
        ...s,
        permission: 'unavailable',
        isLoading: false,
        showBanner: false,
      }));
      return;
    }

    try {
      // Use Permissions API if available
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        
        const updateFromPermission = (permState: PermissionState) => {
          const shouldShowBanner = permState === 'prompt' && shouldShowThisSession();
          setState(s => ({
            ...s,
            permission: permState,
            isLoading: false,
            showBanner: shouldShowBanner,
            showTutorialModal: false,
            isGpsDisabled: false,
          }));
        };

        updateFromPermission(result.state as PermissionState);

        // Listen for permission changes
        result.onchange = () => {
          updateFromPermission(result.state as PermissionState);
        };
      } else {
        // Fallback: assume prompt if no Permissions API
        setState(s => ({
          ...s,
          permission: 'prompt',
          isLoading: false,
          showBanner: shouldShowThisSession(),
        }));
      }
    } catch (error) {
      console.warn('Error checking geolocation permission:', error);
      setState(s => ({
        ...s,
        permission: 'unknown',
        isLoading: false,
        showBanner: shouldShowThisSession(),
      }));
    }
  }, [shouldShowThisSession]);

  // Request permission by triggering getCurrentPosition
  const requestPermission = useCallback(() => {
    // Skip for SSR and bots
    if (!isBrowser() || isBot() || !navigator?.geolocation) return;

    setState(s => ({ ...s, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success - permission granted, permanently dismiss banner
        safeLocalStorage.setItem(STORAGE_KEY, 'true');
        setState(s => ({
          ...s,
          permission: 'granted',
          isLoading: false,
          showBanner: false,
          showTutorialModal: false,
          isGpsDisabled: false,
          error: null,
        }));
      },
      (error) => {
        let newState: Partial<GeolocationPermissionState> = {
          isLoading: false,
        };

        switch (error.code) {
          case error.PERMISSION_DENIED:
            // User denied - show tutorial modal
            newState = {
              ...newState,
              permission: 'denied',
              showBanner: false,
              showTutorialModal: true,
              isGpsDisabled: false,
              error: 'Permission refusée',
            };
            break;
          case error.POSITION_UNAVAILABLE:
            // GPS probably disabled on device
            newState = {
              ...newState,
              permission: 'prompt',
              showBanner: false,
              showTutorialModal: true,
              isGpsDisabled: true,
              error: 'GPS désactivé',
            };
            break;
          case error.TIMEOUT:
            // Timeout - try again
            newState = {
              ...newState,
              permission: 'prompt',
              showBanner: shouldShowThisSession(),
              error: 'Délai dépassé',
            };
            break;
        }

        setState(s => ({ ...s, ...newState }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [shouldShowThisSession]);

  // Dismiss banner (just hide for this session, don't permanently dismiss)
  const dismissBanner = useCallback(() => {
    setState(s => ({ ...s, showBanner: false }));
  }, []);

  // Close tutorial modal
  const closeTutorialModal = useCallback(() => {
    setState(s => ({ ...s, showTutorialModal: false }));
  }, []);

  // Reset dismissed state (useful for testing)
  const resetDismissed = useCallback(() => {
    safeLocalStorage.removeItem(STORAGE_KEY);
    safeLocalStorage.removeItem(SESSION_COUNT_KEY);
    safeSessionStorage.removeItem(TOUR_STARTED_SESSION_KEY);
    checkPermission();
  }, [checkPermission]);

  // Mark tour as started this session (hides banner until next session)
  const markTourStarted = useCallback(() => {
    safeSessionStorage.setItem(TOUR_STARTED_SESSION_KEY, 'true');
    setState(s => ({ ...s, showBanner: false }));
  }, []);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    ...state,
    requestPermission,
    dismissBanner,
    closeTutorialModal,
    resetDismissed,
    checkPermission,
    markTourStarted,
  };
}
