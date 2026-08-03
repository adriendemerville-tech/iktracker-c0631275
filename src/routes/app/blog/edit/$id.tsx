import { createFileRoute } from "@tanstack/react-router";
import BlogEditor from "@/pages/BlogEditor";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/blog/edit/$id")({
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <BlogEditor />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
