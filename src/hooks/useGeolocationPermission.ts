import { useState, useEffect, useCallback } from 'react';

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

  // Check if banner was permanently dismissed or max sessions reached
  const wasDismissed = useCallback(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (dismissed) return true;
    
    const sessionCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
    return sessionCount >= MAX_SESSIONS;
  }, []);

  // Should show banner this session (every other session, up to 6 total)
  const shouldShowThisSession = useCallback(() => {
    if (wasDismissed()) return false;
    
    const sessionCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
    
    // Show only on even sessions (0, 2, 4) = every other session
    // Session 0 -> show, Session 1 -> hide, Session 2 -> show, etc.
    return sessionCount % 2 === 0;
  }, [wasDismissed]);

  // Increment session count on mount (once per session)
  useEffect(() => {
    const sessionKey = 'iktracker_geolocation_session_tracked';
    const alreadyTracked = sessionStorage.getItem(sessionKey);
    
    if (!alreadyTracked) {
      const currentCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
      localStorage.setItem(SESSION_COUNT_KEY, String(currentCount + 1));
      sessionStorage.setItem(sessionKey, 'true');
    }
  }, []);

  // Check permission status using Permissions API
  const checkPermission = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true }));

    // Check if geolocation is supported
    if (!navigator.geolocation) {
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
    setState(s => ({ ...s, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success - permission granted, permanently dismiss banner
        localStorage.setItem(STORAGE_KEY, 'true');
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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_COUNT_KEY);
    checkPermission();
  }, [checkPermission]);

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
  };
}
