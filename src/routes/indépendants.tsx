import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/indépendants")({
  beforeLoad: () => {
    throw redirect({ to: "/independants", replace: true, statusCode: 301 });
  },
});
