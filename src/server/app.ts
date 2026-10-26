import { readWorktreeIdentity } from "./worktree-identity.js";
import { createWorkspaceLearning } from "./workspaces/learning.js";
import { localUrl, required } from "./config.js";
import { createWorkspaceRuntime } from "./agent/runtime.js";
import { createApi } from "./http/router.js";
import { getRequestListener } from "@hono/node-server";
import { localAccessError } from "./http/local-access.js";
import {
  openWorkspaceRegistry,
  WorkspaceError,
  type WorkspaceEntry,
} from "./workspaces/registry.js";
import { loadModelCatalog, type ModelCatalog } from "./agent/models.js";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";

/** Starts a private local runtime; all client calls still cross Intelligence. */
export async function startApp(
  options: {
    port?: number;
    models?: ModelCatalog;
    dataDirectory?: string;
    serve?: (request: IncomingMessage, response: ServerResponse) => void;
  } = {},
) {
  const models = options.models ?? loadModelCatalog();
  const apiUrl = localUrl("INTELLIGENCE_API_URL", ["http:", "https:"]);
  const wsUrl = localUrl("INTELLIGENCE_GATEWAY_WS_URL", ["ws:", "wss:"]);
  const apiKey = required("CPK_INTELLIGENCE_API_KEY");
  const containerId = process.env.LEARNING_CONTAINER_ID ?? "coding-lessons";
  const root = resolve(process.env.CODING_WORKSPACE ?? "workspace");
  await mkdir(root, { recursive: true });
  const dataDirectory = options.dataDirectory ?? ".data";
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const workspaces = await openWorkspaceRegistry(dataDirectory, root);
  const intelligence: CopilotKitIntelligence = new CopilotKitIntelligence({
    apiKey,
    apiUrl,
    wsUrl,
    getLearningContainerId: ({ agentId, input }) => {
      const workspaceId =
        agentId === "coder" ? "default" : agentId.startsWith("coder-") ? agentId.slice(6) : "";
      return learning.containerForRun(workspaceId, input.threadId);
    },
  });
  const learning = createWorkspaceLearning({
    intelligence,
    workspaces,
    defaultContainerId: containerId,
  });
  const token = randomBytes(32).toString("hex");
  const runtimes = new Map<string, ReturnType<typeof createWorkspaceRuntime>>();
  /** Lazily opens the selected workspace; switching never changes a running harness root. */
  function runtimeFor(workspace: WorkspaceEntry) {
    let selected = runtimes.get(workspace.id);
    if (!selected) {
      selected = createWorkspaceRuntime(workspace, {
        dataDirectory,
        intelligence,
        containerId,
        skillsForThread: (threadId) => learning.registryForThread(workspace.id, threadId),
        models,
      });
      runtimes.set(workspace.id, selected);
    }
    return selected;
  }
  /** Resolves URL selection through the registry, with a stable default for older links. */
  function selectedWorkspace(url: URL) {
    const id = url.searchParams.get("workspace") ?? workspaces.list()[0]?.id;
    if (!id) throw new WorkspaceError("No workspace is available.", 404);
    return workspaces.get(id);
  }
  const api = createApi({
    worktreeIdentity: readWorktreeIdentity("app"),
    token,
    intelligence,
    learning,
    workspaces,
    models,
    runtimeFor,
    selectedWorkspace,
  });
  const listener = getRequestListener(api.fetch);
  const server = createServer((request, response) => {
    // Vite/sirv are Node middleware. APIs always use Hono's Fetch adapter.
    const error = localAccessError(request.headers.host ?? "", request.headers.origin);
    if (error) {
      response
        .writeHead(403, { "content-type": "application/json", "cache-control": "no-store" })
        .end(JSON.stringify({ error }));
      return;
    }
    let path: string;
    try {
      path = new URL(request.url ?? "/", `http://${request.headers.host}`).pathname;
    } catch {
      response
        .writeHead(400, { "content-type": "application/json", "cache-control": "no-store" })
        .end(JSON.stringify({ error: "Invalid request URL" }));
      return;
    }
    if (!path.startsWith("/api/") && options.serve) {
      options.serve(request, response);
      return;
    }
    void listener(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(500).end();
      else response.destroy();
    });
  });
  try {
    server.listen(options.port ?? 0, "127.0.0.1");
    await once(server, "listening");
  } catch (error) {
    workspaces.close();
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Runtime did not bind a TCP port");
  let closing: Promise<void> | undefined;
  /** Stops accepting requests before releasing runtimes; repeated calls share one cleanup. */
  function close(): Promise<void> {
    return (closing ??= (async () => {
      const closed = once(server, "close");
      server.close();
      server.closeAllConnections();
      const results = await Promise.allSettled([
        closed,
        ...Array.from(runtimes.values(), (selected) => selected.close()),
      ]);
      workspaces.close();
      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length)
        throw new AggregateError(
          failures.map((result) => result.reason),
          "Failed to close local services",
        );
    })());
  }
  return {
    runtimeUrl: `http://127.0.0.1:${address.port}/api/copilotkit`,
    wsUrl,
    token,
    root,
    close,
  };
}
