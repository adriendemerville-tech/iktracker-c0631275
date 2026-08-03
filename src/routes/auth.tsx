import { createFileRoute } from "@tanstack/react-router";
import { SmartAuth } from "@/components/auth/SmartRoutes";

export const Route = createFileRoute("/auth")({
  component: () => <SmartAuth />,
});
