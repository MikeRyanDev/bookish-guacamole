import { identityRoutes } from "./worktree-identity.js";
import { WorkspaceError } from "../workspaces/registry.js";
import { learningRoutes } from "./learning.js";
import { localAccessError } from "./local-access.js";
import { Hono } from "hono";
import type { ApiDependencies } from "./context.js";
import type { AppConfig } from "../../shared/api.js";
import { handleApiError } from "./validation.js";
import { settingsRoutes } from "./settings.js";
import { workspaceRoutes } from "./workspaces.js";
import { fileRoutes } from "./files.js";

/** Builds the API without opening sockets. Local trust checks also guard static serving. */
export function createApi(dependencies: ApiDependencies) {
  const { token, workspaces, models, learning, runtimeFor, selectedWorkspace } = dependencies;
  const app = new Hono();
  app.onError(handleApiError);
  app.use("*", async (c, next) => {
    const error = localAccessError(c.req.header("host") ?? "", c.req.header("origin"));
    if (error) return c.json({ error }, 403);
    await next();
  });
  app.use("/api/*", async (c, next) => {
    c.header("cache-control", "no-store");
    if (c.req.path === "/api/config" && c.req.method === "GET") {
      if (c.req.header("sec-fetch-site") === "cross-site")
        return c.json({ error: "Cross-site request refused" }, 403);
    } else if (c.req.header("authorization") !== `Bearer ${token}`) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  });
  app.get("/api/config", (c) => {
    const workspace = selectedWorkspace(new URL(c.req.url));
    const selected = runtimeFor(workspace);
    return c.json({
      token,
      runtimeUrl: selected.basePath,
      agentId: selected.agentId,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspace: workspace.path,
      model: models.adapters[models.defaultModel]!.model,
      models: models.publicModels,
      defaultModel: models.defaultModel,
      containerId: learning.assignment(workspace.id),
    } satisfies AppConfig & { model: string });
  });
  app.route("/api", identityRoutes(dependencies.worktreeIdentity));
  app.route("/api/learning", learningRoutes(dependencies));
  app.route("/api", settingsRoutes(dependencies));
  app.route("/api/workspaces", workspaceRoutes(dependencies));
  app.route("/api/workspace", fileRoutes(dependencies));
  app.get("/api/skills", async (c) => {
    const workspace = selectedWorkspace(new URL(c.req.url));
    const skillRegistry = learning.registryForWorkspace(workspace.id);
    if (!skillRegistry) return c.json({ revision: "", skills: [], status: null });
    const snapshot = await skillRegistry.acquireSnapshot();
    if (skillRegistry.status.stale)
      throw new WorkspaceError(
        "Published Skills are unavailable. Retry after checking Intelligence.",
        502,
      );
    return c.json({
      revision: snapshot.revision,
      skills: snapshot.skills.map(({ name, description, files }) => ({
        name,
        description,
        content: files.find((file) => file.path === "SKILL.md")?.text ?? "",
      })),
      status: skillRegistry.status,
    });
  });
  app.all("/api/workspaces/:id/copilotkit", (c) =>
    runtimeFor(workspaces.get(c.req.param("id"))).handler.fetch(c.req.raw),
  );
  app.all("/api/workspaces/:id/copilotkit/*", (c) =>
    runtimeFor(workspaces.get(c.req.param("id"))).handler.fetch(c.req.raw),
  );
  app.all("/api/copilotkit", (c) => runtimeFor(workspaces.get("default")).handler.fetch(c.req.raw));
  app.all("/api/copilotkit/*", (c) =>
    runtimeFor(workspaces.get("default")).handler.fetch(c.req.raw),
  );
  app.notFound((c) => c.json({ error: "Not found" }, 404));
  return app;
}
