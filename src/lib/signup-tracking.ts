import { supabase } from "@/integrations/supabase/client";
import { isBrowser, isBot, safeSessionStorage } from "@/lib/ssr-utils";
import { getSessionId, getDeviceType } from "@/lib/tracking-shared";

type SignupEventType =
  | "signup_view"
  | "signup_oauth_start"
  | "signup_oauth_return"
  | "signup_oauth_denied"
  | "signup_oauth_abandon"
  | "signup_form_submit"
  | "signup_error"
  | "signup_success";

/**
 * Track a signup funnel event. Stores the "context" (provider name for
 * oauth/success, error message for signup_error) in the `referrer` column.
 * Silent-fail: never blocks the signup flow.
 */
export async function trackSignupEvent(
  eventType: SignupEventType,
  context?: string,
  page: string = "signup",
) {
  if (!isBrowser() || isBot()) return;

  // Deduplicate signup_view per session — one rechargement de /signup ne doit
  // pas gonfler les visites du funnel (auparavant chaque mount comptait).
  if (eventType === "signup_view") {
    const key = `signup_view_tracked_${page}`;
    if (safeSessionStorage.getItem(key)) return;
    safeSessionStorage.setItem(key, "1");
  }

  try {
    // Delegate to the track-event edge function so IP is captured server-side
    // (from CF headers) and the admin filter is enforced consistently.
    await supabase.functions.invoke("track-event", {
      body: {
        event_type: eventType,
        page,
        device_type: getDeviceType(),
        session_id: getSessionId(),
        referrer: context ?? document?.referrer ?? null,
        user_agent: navigator?.userAgent || "unknown",
      },
    });
  } catch (err) {
    // Never break signup because tracking failed
    console.debug("signup tracking failed", err);
  }
}
