import { useCallback, useEffect, useRef } from "react";
import { getSupabase } from "@/integrations/supabase/lazy";
import { isBrowser, isBot } from "@/lib/ssr-utils";
import { getSessionId, getDeviceType, checkIsAdmin } from "@/lib/tracking-shared";
import { getVariantTag } from "@/lib/ab-test";

// IP is captured server-side by the track-event edge function (CF headers),
// so we no longer call api.ipify.org (blocked by uBlock/Brave/Pi-hole).
// Session/device/admin helpers factored into src/lib/tracking-shared.ts.

interface TrackEventOptions {
  page: string;
  eventType: "page_view" | "cta_click" | "ik_simulation" | "signup_click" | "crawlers_click";
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
      trackEvent({ page, eventType: "page_view" });
    };

    if ("requestIdleCallback" in window) {
      (
        window as Window & {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(scheduleTracking, { timeout: 5000 });
    } else {
      setTimeout(scheduleTracking, 2000);
    }
  }, [page]);

  const trackEvent = useCallback(async (options: TrackEventOptions) => {
    // Skip tracking for bots and SSR
    if (!isBrowser() || isBot()) return;

    try {
      // Admin filter is also enforced server-side, but check client-side to
      // avoid an unnecessary network round-trip when we already know.
      const isAdmin = await checkIsAdmin();
      if (isAdmin) {
        console.debug("Skipping marketing tracking for admin user");
        return;
      }

      // Delegate to edge function so IP is captured from CF headers server-side
      // (ipify was blocked by uBlock/Brave/Pi-hole for a large share of users).
      const supabase = await getSupabase();
      await supabase.functions.invoke("track-event", {
        body: {
          event_type: options.eventType,
          page: options.page,
          device_type: getDeviceType(),
          session_id: getSessionId(),
          referrer: document?.referrer || null,
          user_agent: navigator?.userAgent || "unknown",
          variant: getVariantTag(),
        },
      });
    } catch (error) {
      // Silently fail - don't impact user experience
      console.debug("Marketing tracking error:", error);
    }
  }, []);

  const trackCTAClick = useCallback(() => {
    trackEvent({ page, eventType: "cta_click" });
  }, [page, trackEvent]);

  const trackIKSimulation = useCallback(() => {
    trackEvent({ page, eventType: "ik_simulation" });
  }, [page, trackEvent]);

  const trackSignupClick = useCallback(() => {
    trackEvent({ page, eventType: "signup_click" });
  }, [page, trackEvent]);

  return { trackCTAClick, trackIKSimulation, trackSignupClick };
}
