import { useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeWorkspace, request, type AppConfig } from "../api";
import type {
  ConversationExecutionStatus,
  ExecutionSettingsResponse,
} from "../../shared/execution";
import type { HistoryPreview } from "../../shared/history";
import { ComposerPopover } from "./composer-popover";
import { PendingStatus } from "./pending-status";

/** Shows consumption and native recovery controls without storing conversation messages. */
export function ConversationCapabilities({
  config,
  threadId,
  modelId,
  busy,
  onHistory,
  onExecutionSettings,
}: {
  config: AppConfig;
  threadId: string;
  modelId?: string;
  busy: boolean;
  onHistory: (action: "undo" | "redo", revision: string) => Promise<void>;
  onExecutionSettings?: () => void;
}) {
  const client = useQueryClient();
  const id = useId();
  const suffix = `?${new URLSearchParams({ workspace: config.workspaceId, thread: threadId })}`;
  const statusKey = ["execution-status", config.workspaceId, threadId];
  const historyKey = ["history", config.workspaceId, threadId];
  const status = useQuery({
    queryKey: statusKey,
    queryFn: ({ signal }) =>
      request<ConversationExecutionStatus>(`/api/execution/status${suffix}`, config.token, signal),
    retry: false,
    refetchInterval: busy ? 1000 : false,
  });
  const policy = useQuery({
    queryKey: ["execution-settings", config.workspaceId],
    queryFn: ({ signal }) =>
      request<ExecutionSettingsResponse>(
        `/api/execution?${new URLSearchParams({ workspace: config.workspaceId })}`,
        config.token,
        signal,
      ),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const history = useQuery({
    queryKey: historyKey,
    queryFn: ({ signal }) => request<HistoryPreview>(`/api/history${suffix}`, config.token, signal),
    enabled: !busy,
    retry: false,
  });
  const [action, setAction] = useState<"undo" | "redo" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  const compact = useMutation({
    mutationFn: () => changeWorkspace(`/api/execution/compact${suffix}`, config.token, "POST", {}),
    onSuccess: () => client.invalidateQueries({ queryKey: statusKey }),
  });
  const restore = useMutation({
    mutationFn: ({ action, revision }: { action: "undo" | "redo"; revision: string }) =>
      onHistory(action, revision),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: historyKey }),
        client.invalidateQueries({ queryKey: statusKey }),
        client.invalidateQueries({ queryKey: ["files", config.workspaceId] }),
      ]);
      dialog.current?.close();
    },
  });
  const usage = status.data?.usage;
  const context = status.data?.context;
  const limits = policy.data?.settings;
  const windowSize = modelId ? limits?.models[modelId]?.contextWindow : undefined;
  const preview = action ? history.data?.[action] : undefined;
  const blocked = busy || (status.data?.pending ?? 0) > 0;
  const format = (number: number) => number.toLocaleString();
  const costKnown =
    usage &&
    !usage.historyIncomplete &&
    usage.reportedCalls === usage.calls &&
    usage.unpricedCalls === 0;
  function review(next: "undo" | "redo", trigger: HTMLButtonElement) {
    returnFocus.current = trigger;
    setAction(next);
    restore.reset();
    void history.refetch();
    dialog.current?.showModal();
  }
  return (
    <div className="conversation-capabilities">
      <ComposerPopover label="Usage" title="Conversation usage">
        {status.isPending ? (
          <PendingStatus>Loading usage…</PendingStatus>
        ) : status.error ? (
          <div role="alert">
            <p>Could not load usage.</p>
            <button
              type="button"
              disabled={status.isFetching}
              onClick={() => void status.refetch()}
            >
              Retry usage
            </button>
          </div>
        ) : (
          usage && (
            <>
              <dl className="usage-values">
                <div>
                  <dt>Reported tokens</dt>
                  <dd>
                    {format(usage.totalTokens)}
                    {limits?.tokenLimit ? ` / ${format(limits.tokenLimit)}` : ""}
                  </dd>
                </div>
                <div>
                  <dt>Last reported context</dt>
                  <dd>
                    {usage.contextTokens === null
                      ? "Not reported yet"
                      : `${format(usage.contextTokens)}${windowSize ? ` / ${format(windowSize)}` : ""}`}
                  </dd>
                </div>
                <div>
                  <dt>Cost (USD)</dt>
                  <dd>
                    {costKnown ? `$${usage.knownCost.toFixed(4)}` : "Unknown"}
                    {limits?.costLimit ? ` / $${limits.costLimit}` : ""}
                  </dd>
                </div>
              </dl>
              {!costKnown && (
                <p className="muted">
                  Cost is unknown when any call lacks a price or usage report.
                </p>
              )}
              {usage.reportedCalls < usage.calls && (
                <p className="muted">Usage has not arrived for every model call.</p>
              )}
              {costKnown && usage.calls > 0 && (
                <p className="muted">Uses provider cost or the prices in Execution settings.</p>
              )}
            </>
          )
        )}
        {policy.error && (
          <p role="alert">
            Could not load the limits.{" "}
            <button type="button" onClick={() => void policy.refetch()}>
              Retry limits
            </button>
          </p>
        )}
        {context?.status === "compacting" && <p role="status">Summarizing context…</p>}
        {context?.status === "scheduled" && (
          <p role="status">Context will be summarized with your next message.</p>
        )}
        {context?.status === "failed" && <p role="alert">{context.error}</p>}
        <div className="usage-actions">
          <button
            type="button"
            disabled={
              blocked ||
              compact.isPending ||
              context?.status === "scheduled" ||
              context?.status === "compacting" ||
              status.isPending ||
              !!status.error
            }
            onClick={() => compact.mutate()}
          >
            {compact.isPending
              ? "Scheduling…"
              : context?.status === "failed"
                ? "Retry summary next message"
                : "Summarize next message"}
          </button>
          {onExecutionSettings && (
            <button type="button" onClick={onExecutionSettings}>
              Edit execution settings
            </button>
          )}
          {usage?.historyIncomplete && (
            <p className="muted">
              Earlier calls lack complete accounting. Start a new conversation to enforce limits.
            </p>
          )}
        </div>
        {compact.error && <p role="alert">{compact.error.message}</p>}
      </ComposerPopover>
      <button
        ref={undoButton}
        className="composer-control"
        type="button"
        disabled={blocked || restore.isPending}
        onClick={(event) => review("undo", event.currentTarget)}
      >
        Undo last turn
      </button>
      {history.data?.redo.revision && (
        <button
          className="composer-control"
          type="button"
          disabled={blocked || restore.isPending}
          onClick={(event) => review("redo", event.currentTarget)}
        >
          Redo turn
        </button>
      )}
      {status.data?.recovery && (
        <span className="muted" role="status">
          Retrying temporary failure · {status.data.recovery.attempt}/
          {status.data.recovery.maxRetries}
        </span>
      )}
      <dialog
        ref={dialog}
        className="history-dialog"
        aria-labelledby={`${id}-heading`}
        onCancel={(event) => {
          if (restore.isPending) event.preventDefault();
        }}
        onClose={() => {
          setAction(null);
          (returnFocus.current?.isConnected ? returnFocus.current : undoButton.current)?.focus();
        }}
      >
        <h2 id={`${id}-heading`}>{action === "redo" ? "Redo last turn?" : "Undo last turn?"}</h2>
        {history.isFetching ? (
          <PendingStatus>Checking the conversation and files…</PendingStatus>
        ) : history.error ? (
          <div role="alert">
            <p>Could not check the affected files.</p>
            <button type="button" onClick={() => void history.refetch()}>
              Retry preview
            </button>
          </div>
        ) : (
          preview && (
            <>
              <p>
                {action === "redo"
                  ? "Restores the undone files, prompt, and response."
                  : "Restores these files and removes the last prompt and response."}
              </p>
              {preview.files.length ? (
                <ul>
                  {preview.files.map((file) => (
                    <li key={file}>
                      <code>{file}</code>
                    </li>
                  ))}
                </ul>
              ) : preview.available ? (
                <p className="muted">No file changes in this turn.</p>
              ) : null}
              {!preview.available && <p role="alert">{preview.reason}</p>}
              {preview.conflicts.length > 0 && <p>Later edits: {preview.conflicts.join(", ")}</p>}
              {blocked && <p role="status">Finish or stop the current operation first.</p>}
            </>
          )
        )}
        {restore.error && (
          <div role="alert">
            <p>{restore.error.message}</p>
            <button
              type="button"
              onClick={() => {
                restore.reset();
                void history.refetch();
              }}
            >
              Refresh preview
            </button>
          </div>
        )}
        <div className="capability-actions">
          <button
            type="button"
            disabled={restore.isPending}
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              blocked ||
              restore.isPending ||
              history.isFetching ||
              !!history.error ||
              !!restore.error ||
              !preview?.available ||
              !preview.revision
            }
            onClick={() => {
              if (action && preview?.revision)
                restore.mutate({ action, revision: preview.revision });
            }}
          >
            {restore.isPending ? "Restoring…" : action === "redo" ? "Redo turn" : "Undo turn"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
