import { createFileRoute } from "@tanstack/react-router";
import AdminPartners from "@/pages/AdminPartners";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/admin/partners")({
  head: () => ({
    meta: [
      {"title":"Partenaires API — Admin IKtracker"},
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <AdminPartners />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
