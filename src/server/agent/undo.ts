import { createHash } from "node:crypto";
import { uiMessagesToWire, type MetadataStore } from "@tanstack/ai";
import type { Message } from "@ag-ui/client";
import {
  definePlugin,
  type AnyHarness,
  type HarnessHost,
  type HarnessSession,
} from "@tanstack/ai-harness";
import type { snapshots } from "@tanstack/ai-harness/plugins/coding";
import { z } from "zod";
import type { HistoryActionPreview, HistoryPreview } from "../../shared/history.js";
import { WorkspaceError } from "../workspaces/registry.js";

const step = z.object({
  from: z.string(),
  to: z.string(),
  files: z.array(z.string()),
  toolCallIds: z.array(z.string()),
});
const turn = z.object({ end: z.string(), steps: z.array(step) });
const stateSchema = z.object({
  undo: turn.nullable().optional(),
  redo: turn
    .extend({ messages: z.array(z.unknown()) })
    .nullable()
    .optional(),
});
const idsSchema = z.object({
  users: z.record(z.string(), z.string()),
  tools: z.record(z.string(), z.string()),
  latestUser: z.string().nullable().optional(),
});
const unavailable = (reason: string): HistoryActionPreview => ({
  available: false,
  revision: null,
  files: [],
  conflicts: [],
  reason,
});

/** Associates native file snapshots with the message turn that actually reached a model iteration. */
export function historyOwnership() {
  return definePlugin({
    name: "starter/history-owner",
    setup: (ctx) => {
      const owner = ctx.state<{ userId: string | null }>({ userId: null });
      return {
        middleware: [
          {
            onIteration: async () => {
              const messages = await ctx.session.transcript();
              await owner.update(() => ({
                userId: messages.findLast((message) => message.role === "user")?.id ?? null,
              }));
            },
          },
        ],
      };
    },
  });
}

/** Native snapshots own recovery. This service stores only outer message IDs and checks file conflicts. */
export function createUndo({
  host,
  harness,
  history,
  metadata,
}: {
  host: HarnessHost;
  harness: AnyHarness;
  history: ReturnType<typeof snapshots>;
  metadata: MetadataStore;
}) {
  const active = new Set<string>();
  const readIds = async (threadId: string) =>
    idsSchema.parse(
      (await metadata.get("starter/transcript-ids", threadId)) ?? { users: {}, tools: {} },
    );
  async function inspect(session: HarnessSession): Promise<HistoryPreview> {
    const snapshot = session.snapshot();
    const busy =
      snapshot.status !== "idle" ||
      snapshot.pendingWaits.length > 0 ||
      snapshot.queuedTurns > 0 ||
      snapshot.activeOperations.length > 0;
    if (busy)
      return {
        undo: unavailable("Finish or stop the current operation first."),
        redo: unavailable("Finish or stop the current operation first."),
      };
    const parsed = stateSchema.safeParse(snapshot.plugins["tanstack/snapshots"]);
    if (!parsed.success)
      return {
        undo: unavailable("File snapshots are unavailable."),
        redo: unavailable("File snapshots are unavailable."),
      };
    const transcript = await session.transcript();
    const ids = await readIds(session.threadId);
    const result: HistoryPreview = {
      undo: unavailable("There is no message turn to undo."),
      redo: unavailable("There is no undone turn to restore."),
    };
    for (const action of ["undo", "redo"] as const) {
      const saved = parsed.data[action];
      if (!saved) continue;
      if (action === "undo") {
        const last = transcript.findLast((message) => message.role === "user");
        const owner = z
          .object({ userId: z.string().nullable() })
          .safeParse(snapshot.plugins["starter/history-owner"]);
        if (
          !owner.success ||
          owner.data.userId !== last?.id ||
          (ids.latestUser !== undefined &&
            ids.latestUser !== (last?.id ? ids.users[last.id] : null))
        ) {
          result.undo = unavailable(
            "The last message has no matching file snapshot. Send another message before using Undo.",
          );
          continue;
        }
        if (!last?.id || !Object.hasOwn(ids.users, last.id)) {
          result.undo = unavailable(
            "Undo applies to message turns. Goal continuations cannot be undone here.",
          );
          continue;
        }
      }
      const files = [...new Set(saved.steps.flatMap((entry) => entry.files))].sort();
      const conflicts = new Set<string>();
      try {
        if (action === "undo") {
          for (const file of (await history.diff(saved.end)).files)
            if (files.includes(file)) conflicts.add(file);
        } else {
          const first = new Map<string, string>();
          for (const entry of saved.steps)
            for (const file of entry.files) if (!first.has(file)) first.set(file, entry.from);
          for (const from of new Set(first.values())) {
            for (const file of (await history.diff(from)).files)
              if (first.get(file) === from) conflicts.add(file);
          }
        }
        result[action] = {
          available: conflicts.size === 0,
          files,
          conflicts: [...conflicts],
          revision: createHash("sha256")
            .update(JSON.stringify({ action, saved, ids: transcript.map((message) => message.id) }))
            .digest("hex"),
          reason: conflicts.size
            ? "Files changed after the recorded turn. Keep or copy those edits before trying again."
            : null,
        };
      } catch {
        result[action] = {
          ...unavailable(
            "The file snapshot could not be read. Check that Git and the workspace are available.",
          ),
          files,
        };
      }
    }
    return result;
  }
  return {
    async rememberInput(input: {
      threadId: string;
      runId: string;
      messages: Message[];
      resume?: unknown[];
      forwardedProps?: Record<string, unknown>;
    }) {
      const user = input.messages.findLast((message) => message.role === "user");
      for (;;) {
        const version = await metadata.getVersioned!("starter/transcript-ids", input.threadId);
        const saved = idsSchema.parse(version?.value ?? { users: {}, tools: {} });
        // The pinned harness assigns user-${inputId}; regression tests guard this bridge contract.
        if (
          user &&
          !input.resume?.length &&
          !input.forwardedProps?.starterGoal &&
          !input.forwardedProps?.starterHistory
        ) {
          saved.users[`user-${input.runId}`] = user.id;
          saved.latestUser = user.id;
        }
        for (const message of input.messages)
          if (message.role === "tool") saved.tools[message.toolCallId] = message.id;
        if (
          (
            await metadata.setIf!(
              "starter/transcript-ids",
              input.threadId,
              saved,
              version?.revision ?? null,
            )
          ).ok
        )
          return;
      }
    },
    async preview(threadId: string): Promise<HistoryPreview> {
      if (!threadId || threadId.length > 200) throw new WorkspaceError("Invalid conversation.");
      const session = await host.open(harness, { threadId });
      try {
        return await inspect(session);
      } finally {
        await session.close();
      }
    },
    async execute(
      threadId: string,
      action: "undo" | "redo",
      revision: string,
      outerMessages: Message[],
    ): Promise<Message[]> {
      if (active.has(threadId))
        throw new WorkspaceError("A history change is already running.", 409);
      active.add(threadId);
      let session: HarnessSession | undefined;
      try {
        session = await host.open(harness, { threadId });
        const preview = (await inspect(session))[action];
        if (!preview.available)
          throw new WorkspaceError(preview.reason ?? "History cannot be changed now.", 409);
        if (preview.revision !== revision)
          throw new WorkspaceError(
            "The conversation changed. Review the affected files again.",
            409,
          );
        const result = await session.runCommand({ name: action });
        if (
          typeof result !== "string" ||
          !result.startsWith(action === "undo" ? "Undid the last turn." : "Redid the last turn.")
        )
          throw new WorkspaceError(
            "History changed while the preview was open. Refresh the preview and try again.",
            409,
          );
        const ids = await readIds(threadId);
        const original = new Map(outerMessages.map((message) => [message.id, message]));
        const projected = uiMessagesToWire(await session.transcript(), {
          includeSnapshotStructuredOutput: true,
          includeActivity: true,
        }).flatMap((message) => {
          if (message.role === "user" && !Object.hasOwn(ids.users, message.id)) return [];
          const id =
            message.role === "user"
              ? ids.users[message.id]!
              : message.role === "tool"
                ? (ids.tools[message.toolCallId] ?? message.id)
                : message.id;
          return [original.get(id) ?? { ...message, id }];
        });
        // No model turn may run while this command owns the session. Keep the
        // outer boundary in sync even when a previous failed prompt was rolled back natively.
        await metadata.set("starter/transcript-ids", threadId, {
          ...ids,
          latestUser: projected.findLast((message) => message.role === "user")?.id ?? null,
        });
        return projected;
      } finally {
        await session?.close();
        active.delete(threadId);
      }
    },
  };
}
