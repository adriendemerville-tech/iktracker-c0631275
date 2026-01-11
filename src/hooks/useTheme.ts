import { useState, useEffect } from 'react';
import { isBrowser, safeLocalStorage, safeMatchMedia } from '@/lib/ssr-utils';

type Theme = 'light' | 'dark';

const getInitialTheme = (): Theme => {
  if (!isBrowser()) return 'light'; // Default for SSR/bots
  
  const stored = safeLocalStorage.getItem('theme') as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  
  return safeMatchMedia('(prefers-color-scheme: dark)') ? 'dark' : 'light';
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    if (!isBrowser()) return;
    
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    safeLocalStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, setTheme, toggleTheme };
};
