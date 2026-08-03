import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mestrajets")({
  beforeLoad: () => {
    throw redirect({ to: "/app/mestrajets", replace: true, statusCode: 301 });
  },
});
