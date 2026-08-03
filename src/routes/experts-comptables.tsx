import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/experts-comptables")({
  beforeLoad: () => {
    throw redirect({ to: "/expert-comptable", replace: true, statusCode: 301 });
  },
});
