import { Hono } from "hono";
import type { WorktreeIdentity } from "../worktree-identity.js";

/** Mount after local access and bearer authentication. Disabled outside managed development. */
export function identityRoutes(identity: WorktreeIdentity | undefined) {
  const app = new Hono();
  if (identity)
    app.get("/worktree-identity", (c) => {
      c.header("cache-control", "no-store");
      return c.json(identity);
    });
  return app;
}
