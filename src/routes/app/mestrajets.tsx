import { createFileRoute } from "@tanstack/react-router";
import MesTrajets from "@/pages/MesTrajets";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/mestrajets")({
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <MesTrajets />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
