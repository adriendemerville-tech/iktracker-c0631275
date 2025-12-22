import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, lazy, Suspense, createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { preloadGoogleMaps } from "@/hooks/useGoogleMaps";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";
import { LogoutOverlay } from "@/components/LogoutOverlay";

// Critical routes - Landing and Auth loaded immediately for fast initial load
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";

// Lazy loaded app routes - reduces initial bundle size
const Index = lazy(() => import("./pages/Index"));
const Report = lazy(() => import("./pages/Report"));
const Profile = lazy(() => import("./pages/Profile"));
// Lazy loaded routes - loaded on demand
const Signup = lazy(() => import("./pages/Signup"));
const Admin = lazy(() => import("./pages/Admin"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Install = lazy(() => import("./pages/Install"));
const ExpertComptable = lazy(() => import("./pages/ExpertComptable"));
const ModeTournee = lazy(() => import("./pages/ModeTournee"));
const Calendrier = lazy(() => import("./pages/Calendrier"));
const BaremeIK2026 = lazy(() => import("./pages/BaremeIK2026"));
const Offline = lazy(() => import("./pages/Offline"));
const NotFound = lazy(() => import("./pages/NotFound"));
const RecoveryWizard = lazy(() => import("./pages/RecoveryWizard"));

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
  const { user, requiresAuth, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth if user is logged out OR if auth is required
  if (!user && requiresAuth) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Preload Google Maps when entering app routes
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
  const navigate = useNavigate();
  const { user, isLoggingOut, signOut, clearLogoutOverlay } = useAuth();

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
    await signOut();
    // On mobile, navigate immediately. On desktop, the overlay handles navigation.
    if (window.innerWidth < 768) {
      clearLogoutOverlay();
      navigate('/');
    }
  };

  const handleLogoutComplete = () => {
    clearLogoutOverlay();
  };

  return (
    <AuthContext.Provider value={{ handleLogout }}>
      <LogoutOverlay isVisible={isLoggingOut} userName={getUserFirstName()} onComplete={handleLogoutComplete} />
      <GoogleMapsPreloader />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/signup" element={<Suspense fallback={<PageLoader />}><Signup /></Suspense>} />
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
