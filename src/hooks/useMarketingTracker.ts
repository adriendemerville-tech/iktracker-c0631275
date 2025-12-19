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

interface TrackEventOptions {
  page: string;
  eventType: 'page_view' | 'cta_click' | 'ik_simulation';
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
      await supabase.from('marketing_analytics').insert({
        event_type: options.eventType,
        page: options.page,
        device_type: getDeviceType(),
        session_id: getSessionId(),
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
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

  return { trackCTAClick, trackIKSimulation };
}
