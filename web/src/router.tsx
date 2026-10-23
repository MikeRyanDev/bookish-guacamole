import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { Workspace } from "./workspace";
const rootRoute = createRootRoute({ component: Outlet });
export const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (value: Record<string, unknown>) => ({
    workspace: typeof value.workspace === "string" ? value.workspace : undefined,
    thread: typeof value.thread === "string" ? value.thread : undefined,
    panel: value.panel === "skills" ? ("skills" as const) : ("files" as const),
    file: typeof value.file === "string" ? value.file : undefined,
  }),
  component: Workspace,
});
export const router = createRouter({ routeTree: rootRoute.addChildren([workspaceRoute]) });
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
