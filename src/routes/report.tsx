import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/report")({
  beforeLoad: () => {
    throw redirect({ to: "/app/mestrajets", replace: true, statusCode: 301 });
  },
});
