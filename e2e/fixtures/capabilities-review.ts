import type { ConnectionsResponse, ConnectionsStatusResponse } from "../../src/shared/connections";
import type { ExecutionSettingsResponse } from "../../src/shared/execution";

let undone = false;
/** Isolated reviewer data: enabled only by ?review=1, with no model or external service calls. */
export function installCapabilitiesReview() {
  const query = new URLSearchParams(location.search);
  if (!query.has("review")) return;
  let execution: ExecutionSettingsResponse = {
    revision: null,
    settings: {
      autoCompact: true,
      compactAt: 75,
      tokenLimit: null,
      costLimit: null,
      maxRetries: 3,
      codeMode: false,
      models: {
        first: { contextWindow: 32768, prices: null },
        second: { contextWindow: 32768, prices: null },
      },
    },
  };
  let connections: ConnectionsResponse = { revision: null, connections: [] };
  let signIn: ConnectionsStatusResponse["signIn"] = null;
  let scheduled = false;
  let failSave = query.get("failure") === "save";
  let failRead = query.get("failure") === "read";
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    if (!url.pathname.startsWith("/api/")) return original(input, init);
    await new Promise((resolve) => setTimeout(resolve, query.has("slow") ? 1000 : 100));
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    if (
      method === "GET" &&
      failRead &&
      !["/api/defaults", "/api/permissions"].includes(url.pathname)
    ) {
      failRead = false;
      return Response.json({ error: "The local server is unavailable." }, { status: 503 });
    }
    if (method !== "GET" && failSave) {
      failSave = false;
      return Response.json({ error: "The local server is unavailable." }, { status: 503 });
    }
    if (url.pathname === "/api/defaults")
      return Response.json({ modelId: "first", permissions: "acceptEdits" });
    if (url.pathname === "/api/permissions") return Response.json([]);
    if (url.pathname === "/api/execution") {
      if (method === "PUT") execution = { ...body, revision: crypto.randomUUID() };
      return Response.json(execution);
    }
    if (url.pathname === "/api/execution/compact") {
      scheduled = true;
      return Response.json({ scheduled: true });
    }
    if (url.pathname === "/api/execution/status")
      return Response.json({
        usage: {
          calls: 3,
          reportedCalls: 3,
          inputTokens: 12000,
          outputTokens: 450,
          totalTokens: 12450,
          knownCost: 0,
          unpricedCalls: 3,
          contextTokens: 8000,
        },
        context: {
          status: scheduled ? "scheduled" : "ready",
          before: null,
          after: null,
          error: null,
        },
        recovery: null,
        status: "idle",
        pending: 0,
      });
    if (url.pathname === "/api/connections") {
      if (method === "PUT") connections = { ...body, revision: crypto.randomUUID() };
      return Response.json(connections);
    }
    if (url.pathname === "/api/connections/status")
      return Response.json({
        connections: connections.connections.map((entry) => ({
          id: entry.id,
          status: !entry.enabled
            ? "disabled"
            : entry.transport.type === "http" && entry.transport.auth === "oauth"
              ? "sign-in-required"
              : "connected",
          toolCount: entry.enabled ? 1 : 0,
        })),
        signIn,
        applying: false,
        error: null,
      });
    if (url.pathname === "/api/connections/sign-in")
      signIn = {
        connectionId: body.connectionId,
        status: "waiting",
        url: "https://example.com/authorize",
      };
    if (
      url.pathname === "/api/connections/cancel-sign-in" ||
      url.pathname === "/api/connections/sign-out"
    )
      signIn = null;
    if (url.pathname === "/api/history") {
      const empty = {
        available: false,
        revision: null,
        files: [],
        conflicts: [],
        reason: "No turn available.",
      };
      const available = {
        available: true,
        revision: (undone ? "b" : "a").repeat(64),
        files: ["src/example.ts", "tests/example.test.ts"],
        conflicts: [],
        reason: null,
      };
      return Response.json({ undo: undone ? empty : available, redo: undone ? available : empty });
    }
    return Response.json({ accepted: true });
  };
}

/** Changes only the in-memory fixture, never workspace files or product transcripts. */
export function applyReviewHistory(action: "undo" | "redo") {
  undone = action === "undo";
}
