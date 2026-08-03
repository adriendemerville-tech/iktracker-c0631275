import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/acquisition-de-clients")({
  beforeLoad: () => {
    throw redirect({ to: "/independants", replace: true });
  },
});
