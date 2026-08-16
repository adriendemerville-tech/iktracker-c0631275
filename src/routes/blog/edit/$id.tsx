import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/edit/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/app/admin/blog/edit/$id",
      params: { id: params.id },
      replace: true,
    });
  },
});
