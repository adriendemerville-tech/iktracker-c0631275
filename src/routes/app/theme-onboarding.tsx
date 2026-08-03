import { createFileRoute } from "@tanstack/react-router";
import ThemeOnboarding from "@/pages/ThemeOnboarding";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/app/theme-onboarding")({
  component: () => (
    <ProtectedRoute>
      <ThemeOnboarding />
    </ProtectedRoute>
  ),
});
