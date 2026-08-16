import { type ReactNode } from "react";
import {
  RouterContextProvider,
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
} from "@tanstack/react-router";

/**
 * Fournit un contexte TanStack Router minimal aux tests de composants.
 * Remplace l'ancien <BrowserRouter> de react-router-dom : les composants
 * passent par src/lib/router-compat, qui exige un router monté.
 *
 * RouterContextProvider (et non RouterProvider) rend les enfants de façon
 * synchrone, ce qui permet aux tests d'utiliser getBy* sans attente.
 */
const rootRoute = createRootRoute();
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/" });

function createTestRouter() {
  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
}

export function TestRouter({ children }: { children: ReactNode }) {
  const router = createTestRouter();
  return (
    <RouterContextProvider router={router as never}>{children}</RouterContextProvider>
  );
}
