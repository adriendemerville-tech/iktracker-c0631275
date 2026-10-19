import { createFileRoute } from "@tanstack/react-router";
import { forwardGoogleCalendarCallback } from "@/lib/google-calendar-callback.server";

const title = "Retour de connexion Google Agenda | IKtracker";
const description = "Finalisation sécurisée de la connexion Google Agenda à IKtracker.";

export const Route = createFileRoute("/oauth/google-calendar/callback")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  server: {
    handlers: {
      GET: ({ request }) => forwardGoogleCalendarCallback(request, import.meta.env.VITE_SUPABASE_URL),
    },
  },
});