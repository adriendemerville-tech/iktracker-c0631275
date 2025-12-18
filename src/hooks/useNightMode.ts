import { useState, useEffect } from 'react';

interface UseNightModeOptions {
  startHour?: number; // Hour to start night mode (default: 17)
  endHour?: number;   // Hour to end night mode (default: 7)
}

export function useNightMode(options: UseNightModeOptions = {}) {
  const { startHour = 17, endHour = 7 } = options;
  const [isNightMode, setIsNightMode] = useState(false);

  useEffect(() => {
    const checkNightMode = () => {
      const currentHour = new Date().getHours();
      // Night mode is active if hour >= startHour OR hour < endHour
      const isNight = currentHour >= startHour || currentHour < endHour;
      setIsNightMode(isNight);
    };

    // Check immediately
    checkNightMode();

    // Check every minute
    const interval = setInterval(checkNightMode, 60000);

    return () => clearInterval(interval);
  }, [startHour, endHour]);

  return { isNightMode };
}
