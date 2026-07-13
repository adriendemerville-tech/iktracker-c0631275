import { supabase } from '@/integrations/supabase/client';
import { isBrowser, isBot, safeSessionStorage, safeRandomUUID } from '@/lib/ssr-utils';

type SignupEventType =
  | 'signup_view'
  | 'signup_oauth_start'
  | 'signup_form_submit'
  | 'signup_error'
  | 'signup_success';

const getSessionId = (): string => {
  if (!isBrowser()) return 'ssr-session';
  let sid = safeSessionStorage.getItem('marketing_session_id');
  if (!sid) {
    sid = safeRandomUUID();
    safeSessionStorage.setItem('marketing_session_id', sid);
  }
  return sid;
};

const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (!isBrowser()) return 'desktop';
  const w = window.innerWidth;
  const ua = (navigator?.userAgent || '').toLowerCase();
  const isMobileUA = /android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTabletUA = /ipad|tablet|playbook|silk/i.test(ua);
  if (isTabletUA || (isMobileUA && w >= 768)) return 'tablet';
  if (isMobileUA || w < 768) return 'mobile';
  return 'desktop';
};

/**
 * Track a signup funnel event. Stores the "context" (provider name for
 * oauth/success, error message for signup_error) in the `referrer` column.
 * Silent-fail: never blocks the signup flow.
 */
export async function trackSignupEvent(
  eventType: SignupEventType,
  context?: string,
  page: string = 'signup',
) {
  if (!isBrowser() || isBot()) return;

  // Deduplicate signup_view per session — one rechargement de /signup ne doit
  // pas gonfler les visites du funnel (auparavant chaque mount comptait).
  if (eventType === 'signup_view') {
    const key = `signup_view_tracked_${page}`;
    if (safeSessionStorage.getItem(key)) return;
    safeSessionStorage.setItem(key, '1');
  }

  try {
    // Delegate to the track-event edge function so IP is captured server-side
    // (from CF headers) and the admin filter is enforced consistently.
    await supabase.functions.invoke('track-event', {
      body: {
        event_type: eventType,
        page,
        device_type: getDeviceType(),
        session_id: getSessionId(),
        referrer: context ?? document?.referrer ?? null,
        user_agent: navigator?.userAgent || 'unknown',
      },
    });
  } catch (err) {
    // Never break signup because tracking failed
    console.debug('signup tracking failed', err);
  }
}
