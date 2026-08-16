import { createFileRoute } from "@tanstack/react-router";
import MesTrajets from "@/pages/MesTrajets";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/mestrajets")({
  head: () => ({
    meta: [
      { title: "Relevé des trajets | IKtracker - Suivi kilométrique" },
      {
        name: "description",
        content:
          "Consultez et exportez vos trajets professionnels. Calcul automatique des indemnités kilométriques selon le barème fiscal 2026.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/app/mestrajets" }],
  }),
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <MesTrajets />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
