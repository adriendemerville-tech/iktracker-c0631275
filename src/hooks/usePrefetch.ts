import { useCallback } from 'react';

/**
 * Hook to prefetch a route on hover
 * Uses the browser's prefetch API via link injection
 */
export function usePrefetch(href: string) {
  const prefetch = useCallback(() => {
    // Check if already prefetched
    const existingLink = document.querySelector(`link[rel="prefetch"][href^="${href}"]`);
    if (existingLink) return;

    // Create prefetch link for the HTML page
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = 'document';
    document.head.appendChild(link);
  }, [href]);

  return { onMouseEnter: prefetch, onFocus: prefetch };
}
