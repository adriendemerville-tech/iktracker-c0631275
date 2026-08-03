import { createFileRoute } from "@tanstack/react-router";
import FraisReels from "@/pages/FraisReels";

export const Route = createFileRoute("/frais-reels")({
  component: FraisReels,
});
