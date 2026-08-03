import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingScreen } from "@/components/AuthLoadingScreen";
import { Navigate, useLocation } from "@/lib/router-compat";

// Moved verbatim from the pre-migration src/App.tsx during the TanStack Start migration.
const Landing = lazy(() => import("@/pages/Landing"));
const Auth = lazy(() => import("@/pages/Auth"));
const Signup = lazy(() => import("@/pages/Signup"));

// Minimal loading fallback - the SSR shell already paints the page frame
const PageLoader = () => null;

// Smart landing: redirect authenticated users to /app
export const SmartLanding = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const fromApp = new URLSearchParams(location.search).get('from') === 'app';

  // Still loading auth state - show AuthLoadingScreen for consistency
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Authenticated users redirect to app (unless they came from app via logo)
  if (user && !fromApp) {
    return <Navigate to="/app" replace />;
  }

  // Show the landing page
  return (
    <Suspense fallback={<PageLoader />}>
      <Landing />
    </Suspense>
  );
};

// Smart auth: redirect authenticated users to /app
export const SmartAuth = () => {
  const { user, loading } = useAuth();

  // Show loader only while actually loading auth state
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Authenticated users go directly to the app
  if (user) {
    return <Navigate to="/app" replace />;
  }

  // Non-authenticated users see the auth page immediately
  return (
    <Suspense fallback={<AuthLoadingScreen />}>
      <Auth />
    </Suspense>
  );
};

// Smart signup: redirect authenticated users to /app
export const SmartSignup = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <Suspense fallback={<AuthLoadingScreen />}>
      <Signup />
    </Suspense>
  );
};
