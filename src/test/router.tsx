import { type ReactNode } from "react";
import {
  RouterProvider,
  createRootRoute,
  createRouter,
  createMemoryHistory,
  Outlet,
} from "@tanstack/react-router";

/**
 * Fournit un contexte TanStack Router minimal aux tests de composants.
 * Remplace l'ancien <BrowserRouter> de react-router-dom : les composants
 * passent par src/lib/router-compat, qui exige un router monté.
 */
export function TestRouter({ children }: { children: ReactNode }) {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        {children}
        <Outlet />
      </>
    ),
  });

  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return <RouterProvider router={router as never} />;
}
