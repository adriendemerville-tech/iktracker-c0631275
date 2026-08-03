import { createFileRoute } from "@tanstack/react-router";
import Calendrier from "@/pages/Calendrier";

export const Route = createFileRoute("/calendrier")({
  component: Calendrier,
});
