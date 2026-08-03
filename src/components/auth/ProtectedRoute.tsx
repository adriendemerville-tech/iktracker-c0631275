import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthRequiredModal } from "@/components/AuthRequiredModal";
import { EmailVerificationGate } from "@/components/EmailVerificationGate";

// Moved verbatim from the pre-migration src/App.tsx during the TanStack Start migration.
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
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

  // Show auth modal overlay if user is not logged in (instead of redirecting)
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AuthRequiredModal open={true} />
      </div>
    );
  }

  return (
    <>
      {children}
      <EmailVerificationGate />
    </>
  );
};
