import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { buildFeedResponse } = await import("@/lib/feed.server");
        return buildFeedResponse();
      },
    },
  },
});
