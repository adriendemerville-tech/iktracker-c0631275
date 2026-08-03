import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/edit/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/blog/edit", replace: true });
  },
});
