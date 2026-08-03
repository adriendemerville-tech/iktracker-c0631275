import { createFileRoute } from "@tanstack/react-router";
import Profile from "@/pages/Profile";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      {"title":"Mon profil | IKtracker"},
      {"name":"description","content":"Gérez votre profil IKtracker : véhicules, adresses favorites, préférences et paramètres de compte."},
      {"name":"robots","content":"noindex, nofollow"},
    ],
    links: [
      {"rel":"canonical","href":"https://iktracker.fr/app/profile"},
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <Profile />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
