import { createFileRoute } from "@tanstack/react-router";
import MarinaAnalyze from "@/pages/MarinaAnalyze";

export const Route = createFileRoute("/marina")({
  component: MarinaAnalyze,
});
