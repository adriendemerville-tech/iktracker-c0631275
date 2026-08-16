import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/pages/Admin";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/admin/")({
  head: () => ({
    meta: [
      { title: "Administration | IKtracker" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/admin" }],
  }),
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <Admin />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
