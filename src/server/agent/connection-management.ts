import type { CredentialStore } from "@tanstack/ai/byok";
import type { AnyHarness, HarnessHost, HarnessSession } from "@tanstack/ai-harness";
import type { ConnectionsResponse, ConnectionsStatusResponse } from "../../shared/connections.js";
import type { createConnections } from "./connections.js";
import { WorkspaceError } from "../workspaces/registry.js";

/** Keeps MCP lifecycle and cancellable OAuth commands outside model runs. Tokens stay in memory. */
export function createConnectionManagement(options: {
  host: HarnessHost;
  harness: AnyHarness;
  settings: ReturnType<typeof createConnections>;
  credentials: CredentialStore;
}) {
  const { host, harness, settings, credentials } = options;
  let held: Promise<HarnessSession> | undefined;
  let signIn: ConnectionsStatusResponse["signIn"] = null;
  let signing: Promise<void> | undefined;
  let login: { cancelled: boolean; cancel?: () => Promise<unknown> } | undefined;
  let applying: Promise<void> | undefined;
  let applyError: string | null = null;
  let closed = false;
  const session = () => {
    if (closed) throw new WorkspaceError("The workspace is closing.", 409);
    held ??= host
      .open(harness, { threadId: "starter:connection-management" })
      .catch((error: unknown) => {
        held = undefined;
        throw error;
      });
    return held;
  };
  function requireIdle() {
    if (closed || applying || signing)
      throw new WorkspaceError("Wait for the connection change or cancel sign-in first.", 409);
  }
  function reload() {
    applyError = null;
    // Native reload waits for active turns. Keep HTTP responsive and report its outcome by polling.
    applying = host
      .reload(harness)
      .catch(() => {
        applyError = "Could not apply the connections. Stop active work, then retry.";
      })
      .finally(() => {
        applying = undefined;
      });
  }
  return {
    read: settings.read,
    async status(): Promise<ConnectionsStatusResponse> {
      const active = await session();
      const connections = await settings.status(active.snapshot().plugins["tanstack/mcp"]);
      for (const connection of connections) {
        if (
          connection.status === "sign-in-required" &&
          (await credentials.get({ scope: {}, id: connection.id }))
        )
          connection.status = "signed-in";
      }
      return { connections, signIn, applying: !!applying, error: applyError };
    },
    async save(input: ConnectionsResponse) {
      requireIdle();
      // Reserve synchronously so concurrent saves cannot race a reload or sign-in.
      let release!: () => void;
      applying = new Promise<void>((resolve) => {
        release = resolve;
      });
      try {
        const previous = await settings.read();
        const saved = await settings.save(input);
        for (const old of previous.connections) {
          const next = saved.connections.find((entry) => entry.id === old.id);
          if (!next || JSON.stringify(old.transport) !== JSON.stringify(next.transport))
            await credentials.delete({ scope: {}, id: old.id });
        }
        release();
        reload();
        return saved;
      } catch (error) {
        release();
        applying = undefined;
        throw error;
      }
    },
    async retry() {
      requireIdle();
      settings.refresh();
      reload();
      return { accepted: true };
    },
    async startSignIn(connectionId: string) {
      requireIdle();
      signIn = { connectionId, status: "starting" };
      const attempt: NonNullable<typeof login> = { cancelled: false };
      login = attempt;
      const work = async () => {
        let unsubscribe: (() => void) | undefined;
        try {
          const entry = (await settings.read()).connections.find(
            (value) => value.id === connectionId,
          );
          if (attempt.cancelled) return;
          if (
            !entry?.enabled ||
            entry.transport.type !== "http" ||
            entry.transport.auth !== "oauth"
          )
            throw new WorkspaceError("Enable an OAuth connection before signing in.");
          const active = await session();
          if (attempt.cancelled) return;
          unsubscribe = active.onEvent(({ event }) => {
            if (event.type !== "CUSTOM" || event.name !== "harness.auth_required") return;
            const value = event.value;
            if (value?.connector !== connectionId || typeof value.url !== "string") return;
            const url = new URL(value.url);
            if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return;
            signIn = { connectionId, status: "waiting", url: url.href };
          });
          const operation = active.runCommand({ name: `connect:${connectionId}` });
          attempt.cancel = () => operation.cancel();
          if (attempt.cancelled) await operation.cancel();
          await operation;
          signIn = { connectionId, status: "complete" };
        } catch {
          signIn = {
            connectionId,
            status: "failed",
            error: "Sign-in did not complete. Check the server and try again.",
          };
        } finally {
          unsubscribe?.();
        }
      };
      signing = work().finally(() => {
        signing = undefined;
        login = undefined;
      });
      return { accepted: true };
    },
    async cancelSignIn() {
      if (signing) {
        if (login) login.cancelled = true;
        await login?.cancel?.();
        await signing;
      }
      signIn = null;
      return { cancelled: true };
    },
    async signOut(connectionId: string) {
      requireIdle();
      signIn = null;
      applyError = null;
      applying = credentials
        .delete({ scope: {}, id: connectionId })
        .then(async () => {
          settings.refresh();
          await host.reload(harness);
        })
        .catch(() => {
          applyError = "Could not sign out. Stop active work, then retry.";
        })
        .finally(() => {
          applying = undefined;
        });
      return { accepted: true };
    },
    /** Release management state after host.close() has cancelled all active operations. */
    async close() {
      closed = true;
      if (login) login.cancelled = true;
      const active = await held;
      await signing;
      await applying;
      await active?.close();
    },
  };
}
