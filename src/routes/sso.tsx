import { createFileRoute } from "@tanstack/react-router";
import Sso from "@/pages/Sso";

export const Route = createFileRoute("/sso")({
  component: Sso,
});
