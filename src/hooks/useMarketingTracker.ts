import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  isBrowser, 
  isBot, 
  safeSessionStorage, 
  safeRandomUUID, 
  getWindowWidth 
} from '@/lib/ssr-utils';

// Get IP address (cached per session)
const getIPAddress = async (): Promise<string | null> => {
  if (!isBrowser()) return null;
  
  // Check session cache first
  const cached = safeSessionStorage.getItem('user_ip_address');
  if (cached) {
    return cached;
  }

  try {
    // Use ipify API to get public IP
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) return null;
    
    const data = await response.json();
    const ip = data.ip || null;
    
    if (ip) {
      // Cache for this session
      safeSessionStorage.setItem('user_ip_address', ip);
    }
    
    return ip;
  } catch {
    return null;
  }
};

// Generate or retrieve session ID
const getSessionId = (): string => {
  if (!isBrowser()) return 'ssr-session';
  
  let sessionId = safeSessionStorage.getItem('marketing_session_id');
  if (!sessionId) {
    sessionId = safeRandomUUID();
    safeSessionStorage.setItem('marketing_session_id', sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (!isBrowser()) return 'desktop';
  
  const width = getWindowWidth();
  const userAgent = (navigator?.userAgent || '').toLowerCase();
  
  // Check for mobile/tablet user agents
  const isMobileUA = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTabletUA = /ipad|tablet|playbook|silk/i.test(userAgent);
  
  if (isTabletUA || (isMobileUA && width >= 768)) return 'tablet';
  if (isMobileUA || width < 768) return 'mobile';
  return 'desktop';
};

// Check if current user is admin (cached per session)
const checkIsAdmin = async (): Promise<boolean> => {
  if (!isBrowser()) return false;
  
  // Check session cache first
  const cached = safeSessionStorage.getItem('is_admin_user');
  if (cached !== null) {
    return cached === 'true';
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return false;
    }

    const { data, error } = await supabase.rpc('has_role', { 
      _user_id: session.user.id, 
      _role: 'admin' 
    });

    if (error) {
      console.debug('Error checking admin role:', error);
      return false;
    }

    const isAdmin = data === true;
    // Cache for this session
    safeSessionStorage.setItem('is_admin_user', String(isAdmin));
    return isAdmin;
  } catch {
    return false;
  }
};

interface TrackEventOptions {
  page: string;
  eventType: 'page_view' | 'cta_click' | 'ik_simulation' | 'signup_click';
}

export function useMarketingTracker(page: string) {
  const hasTrackedPageView = useRef(false);

  // Track page view on mount - deferred to avoid blocking critical path
  useEffect(() => {
    // Skip tracking for bots and SSR
    if (!isBrowser() || isBot()) return;
    
    if (hasTrackedPageView.current) return;
    hasTrackedPageView.current = true;
    
    // Use requestIdleCallback to defer tracking until browser is idle
    // Falls back to setTimeout for browsers without support
    const scheduleTracking = () => {
      trackEvent({ page, eventType: 'page_view' });
    };
    
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
        .requestIdleCallback(scheduleTracking, { timeout: 5000 });
    } else {
      setTimeout(scheduleTracking, 2000);
    }
  }, [page]);

  const trackEvent = useCallback(async (options: TrackEventOptions) => {
    // Skip tracking for bots and SSR
    if (!isBrowser() || isBot()) return;
    
    try {
      // Get current user session and IP in parallel
      const [sessionResult, ipAddress] = await Promise.all([
        supabase.auth.getSession(),
        getIPAddress()
      ]);
      
      const userId = sessionResult.data.session?.user?.id || null;

      // Skip tracking for admin users
      const isAdmin = await checkIsAdmin();
      if (isAdmin) {
        console.debug('Skipping marketing tracking for admin user');
        return;
      }

      await supabase.from('marketing_analytics').insert({
        event_type: options.eventType,
        page: options.page,
        device_type: getDeviceType(),
        session_id: getSessionId(),
        referrer: document?.referrer || null,
        user_agent: navigator?.userAgent || 'unknown',
        user_id: userId,
        ip_address: ipAddress,
      });
    } catch (error) {
      // Silently fail - don't impact user experience
      console.debug('Marketing tracking error:', error);
    }
  }, []);

  const trackCTAClick = useCallback(() => {
    trackEvent({ page, eventType: 'cta_click' });
  }, [page, trackEvent]);

  const trackIKSimulation = useCallback(() => {
    trackEvent({ page, eventType: 'ik_simulation' });
  }, [page, trackEvent]);

  const trackSignupClick = useCallback(() => {
    trackEvent({ page, eventType: 'signup_click' });
  }, [page, trackEvent]);

  return { trackCTAClick, trackIKSimulation, trackSignupClick };
}
