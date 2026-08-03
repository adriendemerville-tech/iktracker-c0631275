import { createFileRoute } from "@tanstack/react-router";
import Profile from "@/pages/Profile";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/profile")({
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <Profile />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
