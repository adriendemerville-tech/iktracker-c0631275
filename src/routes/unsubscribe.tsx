import { createFileRoute } from "@tanstack/react-router";
import Unsubscribe from "@/pages/Unsubscribe";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      {"title":"Désabonnement | IKtracker"},
      {"name":"robots","content":"noindex, nofollow"},
    ],
    links: [
      {"rel":"canonical","href":"https://iktracker.fr/unsubscribe"},
    ],
  }),
  component: Unsubscribe,
});
