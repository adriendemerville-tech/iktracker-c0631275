import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord | IKtracker — Suivi des IK" },
      {
        name: "description",
        content:
          "Gérez vos trajets professionnels, suivez vos kilomètres et calculez vos indemnités kilométriques automatiquement avec IKtracker.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/app" }],
  }),
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <Index />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
