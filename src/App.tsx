import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Report from "./pages/Report";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Install from "./pages/Install";
import ExpertComptable from "./pages/ExpertComptable";
import ModeTournee from "./pages/ModeTournee";
import Calendrier from "./pages/Calendrier";
import BaremeIK2026 from "./pages/BaremeIK2026";
import Offline from "./pages/Offline";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

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

const AppContent = () => {
  // Initialize theme and online status detection
  useTheme();
  useOnlineStatus();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Index />
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Report />
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Profile />
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <QueryErrorBoundary>
                <Admin />
              </QueryErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/install" element={<Install />} />
        <Route path="/expert-comptable" element={<ExpertComptable />} />
        <Route path="/mode-tournee" element={<ModeTournee />} />
        <Route path="/calendrier" element={<Calendrier />} />
        <Route path="/bareme-ik-2026" element={<BaremeIK2026 />} />
        <Route path="/offline" element={<Offline />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
