import { createFileRoute } from "@tanstack/react-router";
import BlogAdmin from "@/pages/BlogAdmin";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/admin/blog/")({
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <BlogAdmin />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
