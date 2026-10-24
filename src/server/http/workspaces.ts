import { Hono } from "hono";
import { z } from "zod";
import type { ApiDependencies } from "./context.js";
import { createWorkspaceSchema } from "../workspaces/registry.js";
import { managementJson } from "./validation.js";

/** Registry changes never delete workspace files or Intelligence conversations. */
export function workspaceRoutes({ workspaces }: ApiDependencies) {
  const app = new Hono();
  app.get("/", (c) => c.json(workspaces.list()));
  // The HTTP boundary and registry share the create/open input schema.
  app.post("/", ...managementJson(createWorkspaceSchema), async (c) =>
    c.json(await workspaces.create(c.req.valid("json")), 201),
  );
  app.patch("/:id", ...managementJson(z.object({ name: z.string() }).strict()), (c) =>
    c.json(workspaces.rename(c.req.param("id"), c.req.valid("json").name)),
  );
  app.delete("/:id", (c) => {
    workspaces.remove(c.req.param("id"));
    return c.json({ removed: true, filesKept: true });
  });
  return app;
}
