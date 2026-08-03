import { createFileRoute } from "@tanstack/react-router";
import Independants from "@/pages/Independants";

export const Route = createFileRoute("/independants")({
  component: Independants,
});
