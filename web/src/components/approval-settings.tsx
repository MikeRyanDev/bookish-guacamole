import { useId, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PermissionRule } from "@tanstack/ai-harness/plugins";
import type { ApprovalMode, ApprovalSettings } from "../../../src/permission-settings";
import { request, changeWorkspace, type AppConfig } from "../api";
import { ComposerPopover } from "./composer-popover";

export const modeChoices: { value: ApprovalMode; label: string; description: string }[] = [
  {
    value: "default",
    label: "Review changes",
    description: "Ask before edits and commands unless a rule allows them.",
  },
  {
    value: "acceptEdits",
    label: "Allow file edits",
    description:
      "Allow ordinary edits. Ask before commands and sensitive paths unless a rule allows them.",
  },
  {
    value: "plan",
    label: "Plan only",
    description: "Inspect permitted files. Do not edit files or run shell commands.",
  },
  {
    value: "bypass",
    label: "YOLO",
    description: "Run tools without approval. Ignore permission rules.",
  },
];
/** Pure controls shared by the production workspace and the isolated prototype. */
export function ApprovalControls({
  mode,
  loading,
  busy,
  error,
  onMode,
  rules,
  rulesLoading,
  rulesError,
  removing,
  onRemove,
  onRefresh,
}: {
  mode: ApprovalMode;
  loading?: boolean;
  busy?: boolean;
  error?: string;
  onMode: (mode: ApprovalMode) => void;
  rules: PermissionRule[];
  rulesLoading?: boolean;
  rulesError?: string;
  removing?: boolean;
  onRemove: (rule: PermissionRule) => void;
  onRefresh: () => void;
}) {
  const id = useId();
  const refreshButton = useRef<HTMLButtonElement>(null);
  const selected = modeChoices.find((choice) => choice.value === mode)!;
  return (
    <div className="approval-controls">
      <ComposerPopover
        title="Approval mode"
        label={`Approval mode: ${loading ? "Loading…" : selected.label}`}
      >
        <p>
          This conversation only. Changes apply to the next turn, including the next goal round.
          Pending approvals still require a decision.
        </p>
        <fieldset className="approval-mode-list" disabled={loading || busy}>
          <legend className="sr-only">Approval mode</legend>
          {modeChoices.map((choice) => (
            <label key={choice.value} className="approval-mode-choice">
              <input
                type="radio"
                name={id}
                value={choice.value}
                checked={mode === choice.value}
                onChange={() => onMode(choice.value)}
              />
              <span>
                <strong>{choice.label}</strong>
                <span className="muted">{choice.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {busy && <p role="status">Saving mode…</p>}
        {error && <p role="alert">{error}</p>}
        {loading && (
          <button type="button" onClick={onRefresh}>
            Retry mode
          </button>
        )}
        {mode === "bypass" && (
          <p>Separate tool restrictions still apply. YOLO does not change saved permissions.</p>
        )}
      </ComposerPopover>
      <ComposerPopover title="Workspace permissions" label="Workspace permissions">
        <p>
          Saved permissions apply to all conversations in this workspace, including after restart.
        </p>
        <p>
          Removal takes effect after active turns finish. Existing approval decisions remain
          unchanged.
        </p>
        {rulesLoading ? (
          <p role="status">Loading permissions…</p>
        ) : rules.length === 0 ? (
          <p>No saved permissions.</p>
        ) : (
          <ul className="saved-permissions">
            {rules.map((rule) => (
              <li key={JSON.stringify(rule)}>
                <span>
                  <strong>{rule.tool}</strong>
                  <code>{rule.resource ?? "Every call of this tool"}</code>
                </span>
                <button
                  type="button"
                  disabled={removing}
                  aria-label={`Remove permission for ${rule.tool} ${rule.resource ?? "all calls"}`}
                  onClick={() => {
                    onRemove(rule);
                    refreshButton.current?.focus();
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {removing && <p role="status">Removing permission… Waiting for active turns to finish.</p>}
        {rulesError && <p role="alert">{rulesError}</p>}
        <button ref={refreshButton} type="button" onClick={onRefresh}>
          Refresh permissions
        </button>
      </ComposerPopover>
    </div>
  );
}
/** Query owns server settings. No optimistic mode change can misstate server authority. */
export function ConversationApprovals({
  config,
  threadId,
}: {
  config: AppConfig;
  threadId: string;
}) {
  const client = useQueryClient();
  const query = new URLSearchParams({ workspace: config.workspaceId, thread: threadId });
  const modeKey = ["approval-mode", config.workspaceId, threadId];
  const rulesKey = ["permissions", config.workspaceId];
  const mode = useQuery({
    queryKey: modeKey,
    queryFn: ({ signal }) =>
      request<ApprovalSettings>(`/api/approval-mode?${query}`, config.token, signal),
    refetchInterval: 3000,
  });
  const rules = useQuery({
    queryKey: rulesKey,
    queryFn: ({ signal }) =>
      request<PermissionRule[]>(`/api/permissions?${query}`, config.token, signal),
    refetchInterval: 3000,
  });
  const setMode = useMutation({
    mutationFn: (value: ApprovalMode) =>
      changeWorkspace<ApprovalSettings>(`/api/approval-mode?${query}`, config.token, "PUT", {
        mode: value,
      }),
    onSuccess: (value) => client.setQueryData(modeKey, value),
  });
  const remove = useMutation({
    mutationFn: (rule: PermissionRule) =>
      changeWorkspace<PermissionRule[]>(`/api/permissions?${query}`, config.token, "DELETE", rule),
    onSuccess: (value) => client.setQueryData(rulesKey, value),
  });
  return (
    <ApprovalControls
      mode={mode.data?.mode ?? "default"}
      loading={!mode.data}
      busy={setMode.isPending}
      error={setMode.error?.message ?? mode.error?.message}
      onMode={(value) => setMode.mutate(value)}
      rules={rules.data ?? []}
      rulesLoading={rules.isPending}
      rulesError={remove.error?.message ?? rules.error?.message}
      removing={remove.isPending}
      onRemove={(rule) => remove.mutate(rule)}
      onRefresh={() => {
        void mode.refetch();
        void rules.refetch();
      }}
    />
  );
}
