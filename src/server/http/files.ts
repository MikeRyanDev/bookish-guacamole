import { Hono } from "hono";
import type { ApiDependencies } from "./context.js";
import { browseWorkspace, searchWorkspace } from "../workspaces/discovery.js";
import { listWorkspaceFiles, readWorkspaceFile, readWorkspaceAsset } from "../workspaces/files.js";

/** Read-only file routes borrow the selected root and propagate disconnect cancellation. */
export function fileRoutes({ selectedWorkspace }: ApiDependencies) {
  const app = new Hono();
  app.get("/directory", async (c) =>
    c.json(
      await browseWorkspace(selectedWorkspace(new URL(c.req.url)).path, {
        directory: c.req.query("path") ?? "",
        cursor: c.req.query("cursor"),
        signal: c.req.raw.signal,
      }),
    ),
  );
  app.get("/search", async (c) =>
    c.json(
      await searchWorkspace(selectedWorkspace(new URL(c.req.url)).path, {
        query: c.req.query("q") ?? "",
        cursor: c.req.query("cursor"),
        signal: c.req.raw.signal,
      }),
    ),
  );
  app.get("/files", async (c) =>
    c.json(await listWorkspaceFiles(selectedWorkspace(new URL(c.req.url)).path)),
  );
  app.get("/file", async (c) =>
    c.json(
      await readWorkspaceFile(
        selectedWorkspace(new URL(c.req.url)).path,
        c.req.query("path") ?? "",
      ),
    ),
  );
  app.get("/asset", async (c) => {
    const bytes = await readWorkspaceAsset(
      selectedWorkspace(new URL(c.req.url)).path,
      c.req.query("path") ?? "",
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": "application/octet-stream",
        "content-length": String(bytes.length),
        "content-disposition": "attachment",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  });
  return app;
}
