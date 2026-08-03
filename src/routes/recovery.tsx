import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/recovery")({
  beforeLoad: () => {
    throw redirect({ to: "/app/recovery", replace: true });
  },
});
