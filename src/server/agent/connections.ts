import { resolve } from "node:path";
import type { MetadataStore } from "@tanstack/ai";
import { definePlugin } from "@tanstack/ai-harness";
import { mcp, type McpServerConfig } from "@tanstack/ai-mcp/harness";
import { z } from "zod";
import type { ConnectionsResponse, ConnectionStatus } from "../../shared/connections.js";
import { WorkspaceError } from "../workspaces/registry.js";

const variable = z.string().regex(/^[A-Z_][A-Z0-9_]{0,127}$/);
const httpUrl = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  }, "Use an HTTP URL without credentials, a query, or a fragment.");
const transport = z.discriminatedUnion("type", [
  z.object({ type: z.literal("example") }).strict(),
  z
    .object({
      type: z.literal("http"),
      url: httpUrl,
      auth: z.enum(["none", "oauth", "environment"]),
      tokenVariable: variable.optional(),
    })
    .strict()
    .refine((value) =>
      value.auth === "environment" ? !!value.tokenVariable : value.tokenVariable === undefined,
    ),
  z
    .object({
      type: z.literal("stdio"),
      command: z.string().min(1).max(1024),
      args: z.array(z.string().max(2048)).max(32),
      environment: z.record(variable, variable).refine((value) => Object.keys(value).length <= 32),
    })
    .strict(),
]);
export const connectionsUpdateSchema = z
  .object({
    revision: z.string().nullable(),
    connections: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/),
            enabled: z.boolean(),
            transport,
          })
          .strict(),
      )
      .max(12)
      .refine(
        (values) => new Set(values.map((value) => value.id)).size === values.length,
        "Use unique connection names.",
      ),
  })
  .strict();

/** Owns a shared native MCP plugin. Rotate it after a save, then reload the host's sessions. */
export function createConnections(
  metadata: MetadataStore,
  options: { root: string; environment?: NodeJS.ProcessEnv },
) {
  const environment = options.environment ?? process.env;
  async function read(): Promise<ConnectionsResponse> {
    const saved = await metadata.getVersioned!("starter/connections", "settings");
    return connectionsUpdateSchema.parse({
      connections: saved?.value ?? [],
      revision: saved?.revision ?? null,
    });
  }
  function valueOf(name: string): string {
    const value = environment[name];
    if (!value)
      throw new WorkspaceError(
        `Set ${name} in the server environment before enabling this connection.`,
      );
    return value;
  }
  function serversOf(input: ConnectionsResponse): Record<string, McpServerConfig> {
    return Object.fromEntries(
      input.connections
        .filter((entry) => entry.enabled)
        .map(({ id, transport: config }) => {
          let server: McpServerConfig;
          if (config.type === "example") {
            server = {
              type: "stdio",
              command: process.execPath,
              args: [resolve("scripts/mcp-guide.mjs")],
              needsApproval: false,
              codeMode: true,
            };
          } else if (config.type === "stdio") {
            server = {
              type: "stdio",
              command: config.command,
              args: config.args,
              cwd: options.root,
              env: Object.fromEntries(
                Object.entries(config.environment).map(([name, reference]) => [
                  name,
                  valueOf(reference),
                ]),
              ),
              needsApproval: true,
            };
          } else {
            server = {
              type: "http",
              url: config.url,
              oauth: config.auth === "oauth",
              ...(config.auth === "environment"
                ? { headers: { Authorization: `Bearer ${valueOf(config.tokenVariable!)}` } }
                : {}),
              needsApproval: true,
            };
          }
          return [id, { ...server, timeoutMs: 10000 }];
        }),
    );
  }
  function makePlugin() {
    return definePlugin({
      name: "tanstack/mcp",
      lifetime: "host",
      setup: async (context) => {
        const saved = await read();
        // A removed environment variable must not disable the coding/permission plugins.
        const available = saved.connections.filter((entry) => {
          try {
            serversOf({ connections: [entry], revision: null });
            return true;
          } catch {
            return false;
          }
        });
        return mcp({
          servers: serversOf({ connections: available, revision: saved.revision }),
          onDuplicateTool: "error",
        }).setup(context);
      },
    });
  }
  let currentPlugin = makePlugin();
  return {
    read,
    plugin: () => currentPlugin,
    refresh: () => {
      currentPlugin = makePlugin();
    },
    async save(input: ConnectionsResponse): Promise<ConnectionsResponse> {
      const parsed = connectionsUpdateSchema.safeParse(input);
      if (!parsed.success)
        throw new WorkspaceError(
          "Check the connection names, addresses, and environment variable names.",
        );
      serversOf(parsed.data);
      const result = await metadata.setIf!(
        "starter/connections",
        "settings",
        parsed.data.connections,
        parsed.data.revision,
      );
      if (!result.ok)
        throw new WorkspaceError(
          "Connections changed in another window. Reload them before saving.",
          409,
        );
      currentPlugin = makePlugin();
      return { connections: parsed.data.connections, revision: result.revision };
    },
    async status(snapshot: unknown): Promise<ConnectionStatus[]> {
      const native = z
        .object({
          servers: z.array(
            z.object({
              name: z.string(),
              status: z.enum(["connecting", "connected", "reconnecting", "failed"]),
              toolCount: z.number(),
            }),
          ),
        })
        .safeParse(snapshot);
      return (await read()).connections.map((entry) => {
        const base = { id: entry.id, toolCount: 0 };
        if (!entry.enabled) return { ...base, status: "disabled" };
        try {
          serversOf({ connections: [entry], revision: null });
        } catch (error) {
          return {
            ...base,
            status: "failed",
            error:
              error instanceof WorkspaceError ? error.message : "Check the server environment.",
          };
        }
        const state = native.success
          ? native.data.servers.find((value) => value.name === entry.id)
          : undefined;
        if (
          entry.transport.type === "http" &&
          entry.transport.auth === "oauth" &&
          (!state || state.status !== "connected")
        )
          return { ...base, status: "sign-in-required" };
        return state
          ? {
              ...base,
              status: state.status,
              toolCount: state.toolCount,
              ...(state.status === "failed"
                ? {
                    error:
                      "Connection failed. Check the address, server, and credentials, then retry.",
                  }
                : {}),
            }
          : { ...base, status: "connecting" };
      });
    },
  };
}
