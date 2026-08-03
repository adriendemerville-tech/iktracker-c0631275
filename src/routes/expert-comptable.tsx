import { createFileRoute } from "@tanstack/react-router";
import ExpertComptable from "@/pages/ExpertComptable";

export const Route = createFileRoute("/expert-comptable")({
  component: ExpertComptable,
});
