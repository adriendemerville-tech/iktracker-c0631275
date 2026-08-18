import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "@/lib/router-compat";
import { useHydrated } from "@tanstack/react-router";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Signup from "@/pages/Signup";

// Public entry points ("/", "/auth", "/signup") must render real HTML during SSR:
// crawlers (and AI crawlers especially) do not execute JS. So we always render the
// public page on the server, and only redirect authenticated users after hydration.

// Smart landing: redirect authenticated users to /app (client-side only)
export const SmartLanding = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const hydrated = useHydrated();
  const fromApp = new URLSearchParams(location.search).get("from") === "app";

  if (hydrated && !loading && user && !fromApp) {
    return <Navigate to="/app" replace />;
  }

  return <Landing />;
};

// Smart auth: redirect authenticated users to /app
export const SmartAuth = () => {
  const { user, loading } = useAuth();
  const hydrated = useHydrated();

  if (hydrated && !loading && user) {
    return <Navigate to="/app" replace />;
  }

  return <Auth />;
};

// Smart signup: redirect authenticated users to /app
export const SmartSignup = () => {
  const { user, loading } = useAuth();
  const hydrated = useHydrated();

  if (hydrated && !loading && user) {
    return <Navigate to="/app" replace />;
  }

  return <Signup />;
};
