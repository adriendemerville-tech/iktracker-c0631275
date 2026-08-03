import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/blog/edit/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/app/admin/blog/edit", replace: true });
  },
});
