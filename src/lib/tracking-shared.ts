// Shared helpers between useMarketingTracker and signup-tracking.
// Keep this module tiny and side-effect free — imported from hot paths.

import { supabase } from '@/integrations/supabase/client';
import {
  isBrowser,
  safeSessionStorage,
  safeRandomUUID,
  getWindowWidth,
} from '@/lib/ssr-utils';

/** Stable per-session UUID persisted in sessionStorage. */
export function getSessionId(): string {
  if (!isBrowser()) return 'ssr-session';
  let sid = safeSessionStorage.getItem('marketing_session_id');
  if (!sid) {
    sid = safeRandomUUID();
    safeSessionStorage.setItem('marketing_session_id', sid);
  }
  return sid;
}

/** Coarse device bucket used for funnel breakdowns. */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (!isBrowser()) return 'desktop';
  const width = getWindowWidth();
  const ua = (navigator?.userAgent || '').toLowerCase();
  const isMobileUA = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTabletUA = /ipad|tablet|playbook|silk/i.test(ua);
  if (isTabletUA || (isMobileUA && width >= 768)) return 'tablet';
  if (isMobileUA || width < 768) return 'mobile';
  return 'desktop';
}

/**
 * Check if the current user is admin, cached for the whole session.
 * The server enforces the same filter — this is only a client-side
 * optimization to skip an unnecessary edge call.
 */
export async function checkIsAdmin(): Promise<boolean> {
  if (!isBrowser()) return false;
  const cached = safeSessionStorage.getItem('is_admin_user');
  if (cached !== null) return cached === 'true';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;
    const { data, error } = await supabase.rpc('has_role', {
      _user_id: session.user.id,
      _role: 'admin',
    });
    if (error) return false;
    const isAdmin = data === true;
    safeSessionStorage.setItem('is_admin_user', String(isAdmin));
    return isAdmin;
  } catch {
    return false;
  }
}
