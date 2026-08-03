import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/theme-onboarding")({
  beforeLoad: () => {
    throw redirect({ to: "/app/theme-onboarding", replace: true, statusCode: 301 });
  },
});
