import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/devis-chantier")({
  beforeLoad: () => {
    throw redirect({ to: "/artisans", replace: true, statusCode: 301 });
  },
});
