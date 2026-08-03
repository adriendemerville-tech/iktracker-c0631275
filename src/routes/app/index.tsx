import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/")({
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <Index />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
