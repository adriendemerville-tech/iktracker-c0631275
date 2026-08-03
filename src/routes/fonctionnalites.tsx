import { createFileRoute } from "@tanstack/react-router";
import Fonctionnalites from "@/pages/Fonctionnalites";

export const Route = createFileRoute("/fonctionnalites")({
  component: Fonctionnalites,
});
