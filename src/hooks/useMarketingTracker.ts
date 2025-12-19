import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Generate or retrieve session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('marketing_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('marketing_session_id', sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for mobile/tablet user agents
  const isMobileUA = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTabletUA = /ipad|tablet|playbook|silk/i.test(userAgent);
  
  if (isTabletUA || (isMobileUA && width >= 768)) return 'tablet';
  if (isMobileUA || width < 768) return 'mobile';
  return 'desktop';
};

// Check if current user is admin (cached per session)
const checkIsAdmin = async (): Promise<boolean> => {
  // Check session cache first
  const cached = sessionStorage.getItem('is_admin_user');
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
    sessionStorage.setItem('is_admin_user', String(isAdmin));
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

  // Track page view on mount
  useEffect(() => {
    if (hasTrackedPageView.current) return;
    hasTrackedPageView.current = true;
    
    trackEvent({ page, eventType: 'page_view' });
  }, [page]);

  const trackEvent = useCallback(async (options: TrackEventOptions) => {
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

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
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        user_id: userId,
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
