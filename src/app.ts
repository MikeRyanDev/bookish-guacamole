import { createPermissionSettings } from "./permission-settings.js";
import { z } from "zod";
import { browseWorkspace, searchWorkspace, FileDiscoveryError } from "./workspace-discovery.js";
import { openWorkspaceRegistry, WorkspaceError, type WorkspaceEntry } from "./workspaces.js";
import { loadModelCatalog, type ModelCatalog } from "./model.js";
import { createModelSettings } from "./model-settings.js";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { SkillRegistry } from "@copilotkit/runtime/internal/learned-skills";
import { listWorkspaceFiles, readWorkspaceFile, readWorkspaceAsset } from "./workspace.js";
import { resolve } from "node:path";
import { CopilotKitIntelligence, CopilotRuntime } from "@copilotkit/runtime/v2";
import { createCopilotNodeListener } from "@copilotkit/runtime/v2/node";
import { createHarnessHost } from "@tanstack/ai-harness";
import { defineAIPersistence } from "@tanstack/ai-persistence";
import { createHarnessAgent } from "./bridge.js";
import { createCodingHarness } from "./harness.js";
import { openLogStore } from "./log-store.js";

/** Reads a required setting without printing its value on failure. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env. See README.md.`);
  return value;
}

/** Refuses accidental use of a hosted backend in this local starter. */
function localUrl(name: string, protocols: string[]): string {
  const value = required(name);
  const url = new URL(value);
  if (
    !protocols.includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new Error(`${name} must point to your CLI-installed local backend.`);
  }
  return value;
}

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
  const intelligence = new CopilotKitIntelligence({
    apiKey,
    apiUrl,
    wsUrl,
    getLearningContainerId: () => containerId,
  });
  const skillRegistry = new SkillRegistry({ client: intelligence, containerId });
  const token = randomBytes(32).toString("hex");
  const runtimes = new Map<string, ReturnType<typeof createWorkspaceRuntime>>();
  /** Keeps each workspace's agent identity, tools, and execution log separate. */
  function createWorkspaceRuntime(workspace: WorkspaceEntry) {
    const agentId = workspace.id === "default" ? "coder" : `coder-${workspace.id}`;
    const basePath =
      workspace.id === "default" ? "/api/copilotkit" : `/api/workspaces/${workspace.id}/copilotkit`;
    const store = openLogStore(
      resolve(
        dataDirectory,
        workspace.id === "default" ? "harness.sqlite" : `harness-${workspace.id}.sqlite`,
      ),
    );
    const host = createHarnessHost({
      persistence: defineAIPersistence({ stores: { log: store.log, metadata: store.metadata } }),
    });
    const harness = createCodingHarness({
      root: workspace.path,
      intelligence,
      containerId,
      models,
    });
    const modelSettings = createModelSettings({
      host,
      harness,
      defaultModel: models.defaultModel,
      models: models.adapters,
    });
    const approvalSettings = createPermissionSettings({
      host,
      harness,
      store,
      root: workspace.path,
    });
    const runtime = new CopilotRuntime({
      agents: {
        [agentId]: createHarnessAgent({
          host,
          harness,
          agentId,
          initialize: approvalSettings.initialize,
        }),
      },
      intelligence,
      identifyUser: () => ({ id: "local-developer", name: "Local developer" }),
    });
    return {
      agentId,
      basePath,
      approvalSettings,
      modelSettings,
      listener: createCopilotNodeListener({ runtime, basePath }),
      close: async () => {
        await host.close();
        store.close();
      },
    };
  }
  /** Lazily opens the selected workspace; switching never changes a running harness root. */
  function runtimeFor(workspace: WorkspaceEntry) {
    let selected = runtimes.get(workspace.id);
    if (!selected) {
      selected = createWorkspaceRuntime(workspace);
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
  /** Limits management bodies before parsing; model and file content use separate routes. */
  async function readJson(request: IncomingMessage): Promise<unknown> {
    if (!request.headers["content-type"]?.startsWith("application/json"))
      throw new WorkspaceError("Send JSON workspace settings.", 415);
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > 16384) throw new WorkspaceError("Workspace settings are too large.", 413);
      chunks.push(bytes);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new WorkspaceError("Workspace settings must be valid JSON.");
    }
  }
  /** Sends JSON without allowing browser caches to retain local session credentials. */
  function json(response: ServerResponse, value: unknown, status = 200) {
    response
      .writeHead(status, { "content-type": "application/json", "cache-control": "no-store" })
      .end(JSON.stringify(value));
  }
  /** Routes browser data and the v2 runtime through one authenticated local origin. */
  async function handle(request: IncomingMessage, response: ServerResponse) {
    const hostHeader = request.headers.host ?? "";
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(hostHeader)) {
      json(response, { error: "Invalid host" }, 403);
      return;
    }
    const origin = request.headers.origin;
    if (origin && origin !== `http://${hostHeader}`) {
      json(response, { error: "Invalid origin" }, 403);
      return;
    }
    const url = new URL(request.url ?? "/", `http://${hostHeader}`);
    if (url.pathname === "/api/config" && request.method === "GET") {
      if (request.headers["sec-fetch-site"] === "cross-site") {
        json(response, { error: "Cross-site request refused" }, 403);
        return;
      }
      const workspace = selectedWorkspace(url);
      const selected = runtimeFor(workspace);
      json(response, {
        token,
        runtimeUrl: selected.basePath,
        agentId: selected.agentId,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspace: workspace.path,
        // Compatibility: this field names the configured default, not the thread selection.
        model: models.adapters[models.defaultModel]!.model,
        models: models.publicModels,
        defaultModel: models.defaultModel,
        containerId,
      });
      return;
    }
    if (!url.pathname.startsWith("/api/")) {
      if (options.serve) options.serve(request, response);
      else response.writeHead(404).end("Not found");
      return;
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      json(response, { error: "Unauthorized" }, 401);
      return;
    }
    if (url.pathname === "/api/model") {
      const selected = runtimeFor(selectedWorkspace(url));
      const settings = selected.modelSettings;
      const thread = url.searchParams.get("thread") ?? "";
      if (request.method === "GET") {
        json(response, await settings.read(thread));
        return;
      }
      if (request.method === "PUT") {
        const input = z
          .object({ modelId: z.string() })
          .strict()
          .safeParse(await readJson(request));
        if (!input.success) throw new WorkspaceError("Send a configured model ID.");
        await selected.approvalSettings.initialize(thread);
        json(response, await settings.set(thread, input.data.modelId));
        return;
      }
    }
    if (url.pathname === "/api/approval-mode") {
      const settings = runtimeFor(selectedWorkspace(url)).approvalSettings;
      const thread = url.searchParams.get("thread") ?? "";
      if (request.method === "GET") {
        json(response, await settings.read(thread));
        return;
      }
      if (request.method === "PUT") {
        const input = z
          .union([
            z.object({ mode: z.string() }).strict(),
            z.object({ permissions: z.enum(["acceptEdits", "bypass"]) }).strict(),
            z.object({ planOnly: z.boolean() }).strict(),
          ])
          .safeParse(await readJson(request));
        if (!input.success) throw new WorkspaceError("Send an approval mode.");
        json(
          response,
          "planOnly" in input.data
            ? await settings.setPlanOnly(thread, input.data.planOnly)
            : "permissions" in input.data
              ? await settings.setPermissions(thread, input.data.permissions)
              : await settings.set(thread, input.data.mode),
        );
        return;
      }
    }
    if (url.pathname === "/api/permissions") {
      const settings = runtimeFor(selectedWorkspace(url)).approvalSettings;
      if (request.method === "GET") {
        json(response, await settings.list());
        return;
      }
      if (request.method === "DELETE") {
        const rule = z
          .object({
            tool: z.string().min(1),
            resource: z.string().optional(),
            decision: z.literal("allow"),
            kind: z.enum(["read", "edit", "execute"]).optional(),
          })
          .strict()
          .safeParse(await readJson(request));
        if (!rule.success) throw new WorkspaceError("Send a saved permission.");
        json(response, await settings.remove(rule.data));
        return;
      }
    }
    if (url.pathname === "/api/workspaces") {
      if (request.method === "GET") {
        json(response, workspaces.list());
        return;
      }
      if (request.method === "POST") {
        json(response, await workspaces.create(await readJson(request)), 201);
        return;
      }
    }
    const managed = /^\/api\/workspaces\/([a-zA-Z0-9-]+)$/.exec(url.pathname);
    if (managed) {
      const id = managed[1]!;
      if (request.method === "PATCH") {
        const input = await readJson(request);
        if (
          typeof input !== "object" ||
          input === null ||
          !("name" in input) ||
          Object.keys(input).length !== 1
        )
          throw new WorkspaceError("Send the new workspace name.");
        json(response, workspaces.rename(id, input.name));
        return;
      }
      if (request.method === "DELETE") {
        workspaces.remove(id);
        json(response, { removed: true, filesKept: true });
        return;
      }
    }
    if (
      ["/api/workspace/directory", "/api/workspace/search"].includes(url.pathname) &&
      request.method === "GET"
    ) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      response.once("close", abort);
      try {
        const root = selectedWorkspace(url).path;
        const options = {
          cursor: url.searchParams.get("cursor") ?? undefined,
          signal: controller.signal,
        };
        const result = url.pathname.endsWith("/directory")
          ? await browseWorkspace(root, {
              ...options,
              directory: url.searchParams.get("path") ?? "",
            })
          : await searchWorkspace(root, { ...options, query: url.searchParams.get("q") ?? "" });
        if (!response.destroyed) json(response, result);
      } finally {
        response.off("close", abort);
      }
      return;
    }
    if (url.pathname === "/api/workspace/files" && request.method === "GET") {
      json(response, await listWorkspaceFiles(selectedWorkspace(url).path));
      return;
    }
    if (url.pathname === "/api/workspace/file" && request.method === "GET") {
      json(
        response,
        await readWorkspaceFile(selectedWorkspace(url).path, url.searchParams.get("path") ?? ""),
      );
      return;
    }
    if (url.pathname === "/api/workspace/asset" && request.method === "GET") {
      const bytes = await readWorkspaceAsset(
        selectedWorkspace(url).path,
        url.searchParams.get("path") ?? "",
      );
      response.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-length": bytes.length,
        "content-disposition": "attachment",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      response.end(bytes);
      return;
    }
    if (url.pathname === "/api/skills" && request.method === "GET") {
      const snapshot = await skillRegistry.acquireSnapshot();
      json(response, {
        revision: snapshot.revision,
        skills: snapshot.skills.map(({ name, description, files }) => ({
          name,
          description,
          content: files.find((file) => file.path === "SKILL.md")?.text ?? "",
        })),
        status: skillRegistry.status,
      });
      return;
    }
    const workspaceRuntime = /^\/api\/workspaces\/([a-zA-Z0-9-]+)\/copilotkit(?:\/|$)/.exec(
      url.pathname,
    );
    if (workspaceRuntime) {
      await runtimeFor(workspaces.get(workspaceRuntime[1]!)).listener(request, response);
      return;
    }
    if (url.pathname === "/api/copilotkit" || url.pathname.startsWith("/api/copilotkit/")) {
      await runtimeFor(workspaces.get("default")).listener(request, response);
      return;
    }
    json(response, { error: "Not found" }, 404);
  }
  const server = createServer((request, response) => {
    handle(request, response).catch((error) => {
      if (error instanceof WorkspaceError || error instanceof FileDiscoveryError) {
        json(response, { error: error.message }, error.status);
        return;
      }
      console.error(
        "Local request failed",
        error instanceof Error ? error.message : "Unknown error",
      );
      if (!response.headersSent)
        json(response, { error: "Request failed. Check the local server log." }, 500);
      else response.end();
    });
  });
  server.listen(options.port ?? 0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Runtime did not bind a TCP port");
  return {
    runtimeUrl: `http://127.0.0.1:${address.port}/api/copilotkit`,
    wsUrl,
    token,
    root,
    close: async () => {
      for (const selected of runtimes.values()) await selected.close();
      const closed = once(server, "close");
      server.close();
      server.closeAllConnections();
      await closed;
      workspaces.close();
    },
  };
}
