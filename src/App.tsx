import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense, createContext, useContext, useState, type ComponentType } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { preloadGoogleMaps } from "@/hooks/useGoogleMaps";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";
import { LogoutOverlay } from "@/components/LogoutOverlay";
import { AuthLoadingScreen } from "@/components/AuthLoadingScreen";

// Critical route - Landing loaded immediately for fast initial load
import Landing from "./pages/Landing";

// Retry helper for lazy routes: prevents infinite loaders when a stale HTML references old chunks
const LAZY_CHUNK_RETRY_KEY = "lazy-chunk-retry";
const lazyWithRetry = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) =>
  lazy(() =>
    factory().catch((error) => {
      const message = String((error as any)?.message ?? "");
      const isChunkError =
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Importing a module script failed") ||
        message.includes("ChunkLoadError") ||
        message.includes("Loading chunk") ||
        message.includes("Unexpected token") ||
        message.includes("ERR_ABORTED");

      if (isChunkError && typeof window !== "undefined") {
        const alreadyRetried = sessionStorage.getItem(LAZY_CHUNK_RETRY_KEY);
        if (!alreadyRetried) {
          sessionStorage.setItem(LAZY_CHUNK_RETRY_KEY, "1");
          window.location.reload();
          // Keep the suspense fallback while reload happens
          return new Promise<{ default: T }>(() => {
            /* intentionally unresolved */
          });
        }
      }

      throw error;
    })
  );

// Auth lazy loaded - not needed on initial page load
const Auth = lazyWithRetry(() => import("./pages/Auth"));

// Lazy loaded app routes - reduces initial bundle size
const Index = lazyWithRetry(() => import("./pages/Index"));
const Report = lazyWithRetry(() => import("./pages/Report"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
// Lazy loaded routes - loaded on demand
const Signup = lazyWithRetry(() => import("./pages/Signup"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Install = lazyWithRetry(() => import("./pages/Install"));
const ExpertComptable = lazyWithRetry(() => import("./pages/ExpertComptable"));
const ModeTournee = lazyWithRetry(() => import("./pages/ModeTournee"));
const Calendrier = lazyWithRetry(() => import("./pages/Calendrier"));
const BaremeIK2026 = lazyWithRetry(() => import("./pages/BaremeIK2026"));
const Offline = lazyWithRetry(() => import("./pages/Offline"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const RecoveryWizard = lazyWithRetry(() => import("./pages/RecoveryWizard"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Auth context for logout with navigation
interface AuthContextType {
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAppAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAppAuth must be used within AuthProvider');
  return context;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, requiresAuth, loading, isLoggingOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't redirect to /auth if logout is in progress - let LogoutOverlay handle navigation
  if (isLoggingOut) {
    return null;
  }

  // Redirect to auth if user is logged out OR if auth is required
  if (!user && requiresAuth) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Smart landing: redirect authenticated users to /app
const SmartLanding = () => {
  const { user, loading } = useAuth();

  // Still loading auth state - show AuthLoadingScreen for consistency
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Authenticated users redirect to app
  if (user) {
    return <Navigate to="/app" replace />;
  }

  // Non-authenticated users see the landing page immediately
  return <Landing />;
};

// Smart auth: redirect authenticated users to /app
const SmartAuth = () => {
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
const SmartSignup = () => {
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


function GoogleMapsPreloader() {
  const location = useLocation();
  
  useEffect(() => {
    // Preload Google Maps when entering authenticated app routes
    if (location.pathname.startsWith('/app') || 
        location.pathname.startsWith('/profile') ||
        location.pathname.startsWith('/report')) {
      preloadGoogleMaps();
    }
  }, [location.pathname]);
  
  return null;
}

const AppRoutes = () => {
  const { user, isLoggingOut, clearLogoutOverlay, signOut } = useAuth();

  // Extract first name from user metadata
  const getUserFirstName = (): string | null => {
    if (!user?.user_metadata) return null;
    const meta = user.user_metadata;
    // Try different possible fields
    if (meta.first_name) return meta.first_name;
    if (meta.full_name) return meta.full_name.split(' ')[0];
    if (meta.name) return meta.name.split(' ')[0];
    return null;
  };

  const handleLogout = async () => {
    // Start signOut which sets isLoggingOut=true to show the overlay
    await signOut();
    // The LogoutOverlay will handle navigation via onComplete after animation
  };

  const handleLogoutComplete = () => {
    clearLogoutOverlay();
  };

  return (
    <AuthContext.Provider value={{ handleLogout }}>
      <LogoutOverlay isVisible={isLoggingOut} userName={getUserFirstName()} onComplete={handleLogoutComplete} />
      <GoogleMapsPreloader />
      <Routes>
        <Route path="/" element={<SmartLanding />} />
        <Route path="/auth" element={<SmartAuth />} />
        <Route path="/signup" element={<SmartSignup />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><Index /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><Report /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><Profile /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><Admin /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><Privacy /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<PageLoader />}><Terms /></Suspense>} />
        <Route path="/install" element={<Suspense fallback={<PageLoader />}><Install /></Suspense>} />
        <Route path="/expert-comptable" element={<Suspense fallback={<PageLoader />}><ExpertComptable /></Suspense>} />
        <Route path="/mode-tournee" element={<Suspense fallback={<PageLoader />}><ModeTournee /></Suspense>} />
        <Route path="/calendrier" element={<Suspense fallback={<PageLoader />}><Calendrier /></Suspense>} />
        <Route path="/bareme-ik-2026" element={<Suspense fallback={<PageLoader />}><BaremeIK2026 /></Suspense>} />
        <Route path="/offline" element={<Suspense fallback={<PageLoader />}><Offline /></Suspense>} />
        <Route
          path="/recovery"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><RecoveryWizard /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
      </Routes>
    </AuthContext.Provider>
  );
};

const AppContent = () => {
  // Initialize theme and online status detection
  useTheme();
  useOnlineStatus();
  
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <AppContent />
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
