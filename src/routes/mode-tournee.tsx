import { createFileRoute } from "@tanstack/react-router";
import ModeTournee from "@/pages/ModeTournee";

export const Route = createFileRoute("/mode-tournee")({
  component: ModeTournee,
});
