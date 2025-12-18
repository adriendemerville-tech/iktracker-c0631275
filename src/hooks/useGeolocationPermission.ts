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

export function useGeolocationPermission() {
  const [state, setState] = useState<GeolocationPermissionState>({
    permission: 'unknown',
    isLoading: true,
    error: null,
    showBanner: false,
    showTutorialModal: false,
    isGpsDisabled: false,
  });

  // Check if banner was dismissed
  const wasDismissed = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
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
          const shouldShowBanner = permState === 'prompt' && !wasDismissed();
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
          showBanner: !wasDismissed(),
        }));
      }
    } catch (error) {
      console.warn('Error checking geolocation permission:', error);
      setState(s => ({
        ...s,
        permission: 'unknown',
        isLoading: false,
        showBanner: !wasDismissed(),
      }));
    }
  }, [wasDismissed]);

  // Request permission by triggering getCurrentPosition
  const requestPermission = useCallback(() => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success - permission granted
        setState(s => ({
          ...s,
          permission: 'granted',
          isLoading: false,
          showBanner: false,
          showTutorialModal: false,
          isGpsDisabled: false,
          error: null,
        }));
        // Clear dismissed state since user granted
        localStorage.removeItem(STORAGE_KEY);
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
              showBanner: true,
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
  }, []);

  // Dismiss banner
  const dismissBanner = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setState(s => ({ ...s, showBanner: false }));
  }, []);

  // Close tutorial modal
  const closeTutorialModal = useCallback(() => {
    setState(s => ({ ...s, showTutorialModal: false }));
  }, []);

  // Reset dismissed state (useful for testing)
  const resetDismissed = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
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
