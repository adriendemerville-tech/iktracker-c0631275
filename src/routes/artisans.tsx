import { createFileRoute } from "@tanstack/react-router";
import Artisans from "@/pages/Artisans";

export const Route = createFileRoute("/artisans")({
  component: Artisans,
});
