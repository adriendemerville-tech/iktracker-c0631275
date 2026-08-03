import { createFileRoute } from "@tanstack/react-router";
import ArchivePage from "@/pages/Archive";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/archive")({
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <ArchivePage />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
