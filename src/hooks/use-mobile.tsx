import * as React from "react";
import { isBrowser, getWindowWidth, safeMatchMedia } from "@/lib/ssr-utils";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(() => {
    // Initial state based on SSR-safe check
    if (!isBrowser()) return undefined;
    return getWindowWidth() < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    if (!isBrowser()) return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
