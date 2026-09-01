import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { buildSitemapResponse } = await import("@/lib/sitemap.server");
        return buildSitemapResponse();
      },
    },
  },
});
