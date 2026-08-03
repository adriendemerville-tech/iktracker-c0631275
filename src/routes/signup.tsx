import { createFileRoute } from "@tanstack/react-router";
import { SmartSignup } from "@/components/auth/SmartRoutes";

export const Route = createFileRoute("/signup")({
  component: () => <SmartSignup />,
});
