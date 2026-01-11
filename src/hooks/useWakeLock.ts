import { useState, useEffect, useCallback, useRef } from 'react';
import { isBrowser, isBot } from '@/lib/ssr-utils';

interface UseWakeLockReturn {
  isActive: boolean;
  isSupported: boolean;
  error: string | null;
  lowBattery: boolean;
  request: () => Promise<boolean>;
  release: () => Promise<void>;
}

export function useWakeLock(): UseWakeLockReturn {
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lowBattery, setLowBattery] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Check support on mount
  useEffect(() => {
    // Skip for SSR and bots
    if (!isBrowser() || isBot()) {
      setIsSupported(false);
      return;
    }
    setIsSupported('wakeLock' in navigator);
  }, []);

  // Monitor battery level
  useEffect(() => {
    // Skip for SSR and bots
    if (!isBrowser() || isBot()) return;

    const checkBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          // @ts-ignore - getBattery is not in TypeScript types
          const battery = await navigator.getBattery();
          
          const updateBatteryStatus = () => {
            // Consider low battery if < 20% and not charging
            setLowBattery(battery.level < 0.2 && !battery.charging);
          };

          updateBatteryStatus();
          battery.addEventListener('levelchange', updateBatteryStatus);
          battery.addEventListener('chargingchange', updateBatteryStatus);

          return () => {
            battery.removeEventListener('levelchange', updateBatteryStatus);
            battery.removeEventListener('chargingchange', updateBatteryStatus);
          };
        } catch (e) {
          console.log('Battery API not available');
        }
      }
    };

    checkBattery();
  }, []);

  // Re-acquire wake lock when visibility changes
  useEffect(() => {
    // Skip for SSR and bots
    if (!isBrowser() || isBot()) return;

    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        // Try to re-acquire the wake lock when tab becomes visible again
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setIsActive(true);
          setError(null);
          
          wakeLockRef.current.addEventListener('release', () => {
            setIsActive(false);
          });
        } catch (e) {
          console.warn('Failed to re-acquire wake lock:', e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    // Skip for SSR and bots
    if (!isBrowser() || isBot()) {
      return false;
    }

    if (!isSupported) {
      setError('Wake Lock non supporté sur ce navigateur');
      return false;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsActive(true);
      setError(null);

      wakeLockRef.current.addEventListener('release', () => {
        setIsActive(false);
      });

      console.log('Wake Lock acquired');
      return true;
    } catch (err: any) {
      console.error('Wake Lock error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Wake Lock refusé par le navigateur');
      } else {
        setError('Impossible d\'activer le mode écran actif');
      }
      
      return false;
    }
  }, [isSupported]);

  const release = useCallback(async (): Promise<void> => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        console.log('Wake Lock released');
      } catch (err) {
        console.error('Error releasing wake lock:', err);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error);
      }
    };
  }, []);

  return {
    isActive,
    isSupported,
    error,
    lowBattery,
    request,
    release,
  };
}
