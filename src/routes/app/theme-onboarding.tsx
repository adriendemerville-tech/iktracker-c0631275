import { createFileRoute } from "@tanstack/react-router";
import ThemeOnboarding from "@/pages/ThemeOnboarding";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/app/theme-onboarding")({
  head: () => ({
    meta: [
      { title: "Choisissez votre thème | IKtracker" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/app/theme-onboarding" }],
  }),
  component: () => (
    <ProtectedRoute>
      <ThemeOnboarding />
    </ProtectedRoute>
  ),
});
