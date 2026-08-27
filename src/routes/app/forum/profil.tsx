import { createFileRoute } from "@tanstack/react-router";
import ForumProfilePage from "@/pages/forum/ForumProfilePage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/app/forum/profil")({
  head: () => ({
    meta: [
      { title: "Ma fiche d'identité forum | IKtracker" },
      {
        name: "description",
        content:
          "Configurez votre pseudo, votre métier, votre photo et suivez votre niveau sur le forum IKtracker.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Ma fiche d'identité forum | IKtracker" },
      {
        property: "og:description",
        content: "Pseudo, métier, photo et niveau sur le forum IKtracker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <ForumProfilePage />
    </ProtectedRoute>
  ),
});
