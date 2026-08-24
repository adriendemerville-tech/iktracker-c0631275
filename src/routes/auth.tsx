import { createFileRoute } from "@tanstack/react-router";
import { SmartAuth } from "@/components/auth/SmartAuth";

export const Route = createFileRoute("/auth")({
  component: () => <SmartAuth />,
});
