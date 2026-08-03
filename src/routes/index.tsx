import { createFileRoute } from "@tanstack/react-router";
import { SmartLanding } from "@/components/auth/SmartRoutes";

export const Route = createFileRoute("/")({
  component: () => <SmartLanding />,
});
