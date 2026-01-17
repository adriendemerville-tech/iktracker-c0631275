import * as React from "react";
import { isBrowser, getWindowWidth } from "@/lib/ssr-utils";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Always try to get an initial value if in browser
  const getInitialValue = (): boolean => {
    if (!isBrowser()) return false;
    // Use multiple detection methods for reliability
    const width = getWindowWidth();
    if (width > 0) return width < MOBILE_BREAKPOINT;
    // Fallback: check touch support and user agent
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return hasTouch && mobileUA;
  };

  const [isMobile, setIsMobile] = React.useState<boolean>(getInitialValue);

  React.useEffect(() => {
    if (!isBrowser()) return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // Ensure we have the correct value on mount
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
