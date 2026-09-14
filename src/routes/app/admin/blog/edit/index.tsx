import { createFileRoute } from "@tanstack/react-router";
import BlogEditor from "@/pages/BlogEditor";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/admin/blog/edit/")({
  head: () => ({
    meta: [
      { title: "Nouvel article — Blog IKtracker" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <BlogEditor />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
