/**
 * SSR/Bot-safe utilities
 * These functions safely handle environments where browser APIs may not be available
 * (e.g., SSR, crawlers, bots)
 */

/**
 * Check if we're running in a browser environment with full DOM support
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined' &&
         typeof navigator !== 'undefined';
};

/**
 * Check if localStorage is available and functional
 */
export const hasLocalStorage = (): boolean => {
  if (!isBrowser()) return false;
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if sessionStorage is available and functional
 */
export const hasSessionStorage = (): boolean => {
  if (!isBrowser()) return false;
  try {
    const testKey = '__storage_test__';
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Safe localStorage getter
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!hasLocalStorage()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!hasLocalStorage()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Silently fail for bots/SSR
    }
  },
  removeItem: (key: string): void => {
    if (!hasLocalStorage()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  }
};

/**
 * Safe sessionStorage getter
 */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!hasSessionStorage()) return null;
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!hasSessionStorage()) return;
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // Silently fail for bots/SSR
    }
  },
  removeItem: (key: string): void => {
    if (!hasSessionStorage()) return;
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  }
};

/**
 * Detect if the current user agent is a known bot/crawler
 */
export const isBot = (): boolean => {
  if (!isBrowser()) return true; // Assume bot if no browser environment
  
  const botPatterns = [
    /bot/i,
    /spider/i,
    /crawl/i,
    /slurp/i,
    /googlebot/i,
    /bingbot/i,
    /yandex/i,
    /baiduspider/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /rogerbot/i,
    /linkedinbot/i,
    /embedly/i,
    /quora link preview/i,
    /showyoubot/i,
    /outbrain/i,
    /pinterest/i,
    /developers.google.com/i,
    /slackbot/i,
    /vkShare/i,
    /W3C_Validator/i,
    /whatsapp/i,
    /applebot/i,
    /duckduckbot/i,
    /ia_archiver/i,
    /semrushbot/i,
    /ahrefsbot/i,
    /mj12bot/i,
    /dotbot/i,
    /petalbot/i,
    /bytespider/i,
    /gptbot/i,
    /claudebot/i,
    /anthropic/i,
    /gemini/i,
    /perplexity/i,
  ];
  
  try {
    const userAgent = navigator.userAgent || '';
    return botPatterns.some(pattern => pattern.test(userAgent));
  } catch {
    return true; // Assume bot if we can't check
  }
};

/**
 * Safe window width getter with fallback
 */
export const getWindowWidth = (): number => {
  if (!isBrowser()) return 1024; // Default desktop width for SSR
  return window.innerWidth || 1024;
};

/**
 * Safe matchMedia with fallback
 */
export const safeMatchMedia = (query: string): boolean => {
  if (!isBrowser() || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
};

/**
 * Safe crypto.randomUUID with fallback
 */
export const safeRandomUUID = (): string => {
  if (!isBrowser()) {
    // Fallback for non-browser environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};
