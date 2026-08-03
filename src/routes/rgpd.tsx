import { createFileRoute } from "@tanstack/react-router";
import Rgpd from "@/pages/Rgpd";

export const Route = createFileRoute("/rgpd")({
  component: Rgpd,
});
