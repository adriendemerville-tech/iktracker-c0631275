import { createFileRoute } from "@tanstack/react-router";
import MarinaAnalyze from "@/pages/MarinaAnalyze";

export const Route = createFileRoute("/marina")({
  head: () => ({
    meta: [{ title: "Marina — Analyse SEO" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: MarinaAnalyze,
});
