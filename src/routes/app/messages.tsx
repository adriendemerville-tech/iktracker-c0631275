import { createFileRoute } from "@tanstack/react-router";
import Messages from "@/pages/Messages";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";

export const Route = createFileRoute("/app/messages")({
  head: () => ({
    meta: [
      { title: "Ma discussion | IKtracker" },
      {
        name: "description",
        content: "Consultez les réponses de l'équipe IKtracker à vos messages et répondez.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/app/messages" }],
  }),
  component: () => (
    <ProtectedRoute>
      <QueryErrorBoundary>
        <Messages />
      </QueryErrorBoundary>
    </ProtectedRoute>
  ),
});
