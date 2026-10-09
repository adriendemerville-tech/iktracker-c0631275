import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuthLazy } from "@/integrations/supabase/lazy-auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  // Les routes /lovable/* (webhooks email, previews) s'authentifient elles-mêmes
  // et ne doivent pas passer par les middlewares applicatifs.
  if (
    new URL(request.url).pathname.startsWith("/lovable/") ||
    new URL(request.url).pathname === "/email/unsubscribe"
  ) {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuthLazy],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
