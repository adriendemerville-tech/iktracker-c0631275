import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense, createContext, useContext } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { preloadGoogleMaps } from "@/hooks/useGoogleMaps";
import { deferTask } from "@/lib/idle-callback";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";
import { LogoutOverlay } from "@/components/LogoutOverlay";
import { AuthLoadingScreen } from "@/components/AuthLoadingScreen";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { GlobalTourRecovery } from "@/components/GlobalTourRecovery";

// Lazy load UI components that aren't needed for initial render
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const TooltipProvider = lazy(() => import("@/components/ui/tooltip").then(m => ({ default: m.TooltipProvider })));

// ALL pages lazy loaded - including Landing for better initial bundle
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Index = lazy(() => import("./pages/Index"));
const MesTrajets = lazy(() => import("./pages/MesTrajets"));
const TemporaryReport = lazy(() => import("./pages/TemporaryReport"));
const Profile = lazy(() => import("./pages/Profile"));
const Signup = lazy(() => import("./pages/Signup"));
const ThemeOnboarding = lazy(() => import("./pages/ThemeOnboarding"));
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
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const BlogAdmin = lazy(() => import("./pages/BlogAdmin"));
const BlogEditor = lazy(() => import("./pages/BlogEditor"));
const AuthorPage = lazy(() => import("./pages/AuthorPage"));
const FraisReels = lazy(() => import("./pages/FraisReels"));
const Lexique = lazy(() => import("./pages/Lexique"));
const ComparatifIzika = lazy(() => import("./pages/ComparatifIzika"));
const ComparatifDriversNote = lazy(() => import("./pages/ComparatifDriversNote"));

// Minimal loading fallback - uses static HTML shell from index.html
const PageLoader = () => null;

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
    // Defer Google Maps preload to idle time to improve TTI
    if (location.pathname.startsWith('/app')) {
      // Use requestIdleCallback to avoid blocking main thread
      deferTask(() => {
        preloadGoogleMaps();
      }, 'medium', 3000);
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
      {user && <GlobalTourRecovery />}
      <Routes>
        <Route path="/" element={<SmartLanding />} />
        <Route path="/auth" element={<SmartAuth />} />
        <Route path="/signup" element={<SmartSignup />} />
        <Route
          path="/temporaryreport/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <TemporaryReport />
            </Suspense>
          }
        />
        <Route 
          path="/app/theme-onboarding" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<AuthLoadingScreen />}>
                <ThemeOnboarding />
              </Suspense>
            </ProtectedRoute>
          }
        />
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
          path="/app/mestrajets"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><MesTrajets /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/profile"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><Profile /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/admin"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><Admin /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/admin/blog"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><BlogAdmin /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/admin/blog/edit/:id?"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><BlogEditor /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/blog/edit/:id?"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><BlogEditor /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/recovery"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Suspense fallback={<PageLoader />}><RecoveryWizard /></Suspense>
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        {/* Redirections anciennes URLs */}
        <Route path="/mestrajets" element={<Navigate to="/app/mestrajets" replace />} />
        <Route path="/report" element={<Navigate to="/app/mestrajets" replace />} />
        <Route path="/profile" element={<Navigate to="/app/profile" replace />} />
        <Route path="/admin" element={<Navigate to="/app/admin" replace />} />
        <Route path="/admin/blog" element={<Navigate to="/app/admin/blog" replace />} />
        <Route path="/admin/blog/edit/:id?" element={<Navigate to="/app/admin/blog/edit" replace />} />
        <Route path="/recovery" element={<Navigate to="/app/recovery" replace />} />
        <Route path="/theme-onboarding" element={<Navigate to="/app/theme-onboarding" replace />} />
        <Route path="/blog/edit/:id?" element={<Navigate to="/app/blog/edit" replace />} />
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
      <AnalyticsTracker />
      <AppRoutes />
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <Suspense fallback={null}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </Suspense>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
