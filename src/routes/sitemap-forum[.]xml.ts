// Sitemap dédié au module forum. La logique vit dans `@/lib/sitemap-forum.server`
// pour ne pas embarquer ces données dans le bundle client via routeTree.gen.
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/sitemap-forum.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { buildForumSitemapResponse } = await import("@/lib/sitemap-forum.server");
        return buildForumSitemapResponse(request);
      },
    },
  },
});
