import { createFileRoute } from "@tanstack/react-router";
import Offline from "@/pages/Offline";

export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [{ title: "Hors ligne | IKtracker" }, { name: "robots", content: "noindex, nofollow" }],
    links: [{ rel: "canonical", href: "https://iktracker.fr/offline" }],
  }),
  component: Offline,
});
