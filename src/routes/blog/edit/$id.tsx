import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/edit/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/app/blog/edit", replace: true });
  },
});
