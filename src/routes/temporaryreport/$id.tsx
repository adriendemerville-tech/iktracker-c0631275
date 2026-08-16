import { createFileRoute } from "@tanstack/react-router";
import TemporaryReport from "@/pages/TemporaryReport";

export const Route = createFileRoute("/temporaryreport/$id")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
    links: [
      { rel: "icon", href: "/favicon-48x48.png" },
      { rel: "icon", href: "/pwa-icon-192.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  component: TemporaryReport,
});
