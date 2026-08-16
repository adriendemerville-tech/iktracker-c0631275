import { createContext, useContext, lazy, Suspense, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogoutOverlay } from "@/components/LogoutOverlay";
import { GlobalTourRecovery } from "@/components/GlobalTourRecovery";

const SurveyWidget = lazy(() =>
  import("@/components/SurveyWidget").then((m) => ({ default: m.SurveyWidget })),
);

// Auth context for logout with navigation — moved from the pre-migration src/App.tsx.
interface AuthContextType {
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAppAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAppAuth must be used within AuthProvider");
  return context;
};

// App-level chrome that used to live around <Routes> in src/App.tsx:
// logout overlay, tour recovery, survey widget, and the logout auth context.
export const AppChrome = ({ children }: { children: ReactNode }) => {
  const { user, isLoggingOut, clearLogoutOverlay, signOut } = useAuth();

  // Extract first name from user metadata
  const getUserFirstName = (): string | null => {
    if (!user?.user_metadata) return null;
    const meta = user.user_metadata;
    // Try different possible fields
    if (meta.first_name) return meta.first_name;
    if (meta.full_name) return meta.full_name.split(" ")[0];
    if (meta.name) return meta.name.split(" ")[0];
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
      <LogoutOverlay
        isVisible={isLoggingOut}
        userName={getUserFirstName()}
        onComplete={handleLogoutComplete}
      />
      {user && <GlobalTourRecovery />}
      {user && (
        <Suspense fallback={null}>
          <SurveyWidget />
        </Suspense>
      )}
      {children}
    </AuthContext.Provider>
  );
};
