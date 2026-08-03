import { createFileRoute } from "@tanstack/react-router";
import MesTrajetsLanding from "@/pages/MesTrajetsLanding";

export const Route = createFileRoute("/mes-trajets")({
  component: MesTrajetsLanding,
});
