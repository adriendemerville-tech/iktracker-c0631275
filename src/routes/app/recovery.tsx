import { createFileRoute } from "@tanstack/react-router";
import RecoveryWizard from "@/pages/RecoveryWizard";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/recovery")({
  head: () => ({
    meta: [
      { title: "Récupérer mes trajets | IKtracker" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/recovery" }],
  }),
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <RecoveryWizard />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
