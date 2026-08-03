import { createFileRoute } from "@tanstack/react-router";
import BlogAdmin from "@/pages/BlogAdmin";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/admin/blog/")({
  head: () => ({
    meta: [
      {"title":"Administration Blog - IKtracker"},
      {"name":"robots","content":"noindex, nofollow"},
    ],
    links: [
      {"rel":"canonical","href":"https://iktracker.fr/app/admin/blog"},
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <BlogAdmin />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
