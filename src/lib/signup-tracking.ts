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
) {
  if (!isBrowser() || isBot()) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('marketing_analytics').insert({
      event_type: eventType,
      page: 'signup',
      device_type: getDeviceType(),
      session_id: getSessionId(),
      referrer: context ?? document?.referrer ?? null,
      user_agent: navigator?.userAgent || 'unknown',
      user_id: session?.user?.id ?? null,
    });
  } catch (err) {
    // Never break signup because tracking failed
    console.debug('signup tracking failed', err);
  }
}
