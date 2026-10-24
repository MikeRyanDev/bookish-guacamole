import { useId, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import type { PermissionRule } from "@tanstack/ai-harness/plugins";
import type { ApprovalSettings } from "../../../src/permission-settings";
import { request, changeWorkspace, type AppConfig } from "../api";
import { ComposerPopover } from "./composer-popover";

type PermissionMode = "acceptEdits" | "bypass";
export const modeChoices: { value: PermissionMode; label: string; description: string }[] = [
  {
    value: "acceptEdits",
    label: "Require permissions",
    description: "Ask before commands and sensitive edits.",
  },
  { value: "bypass", label: "YOLO", description: "Run without permission prompts." },
];
/** Separate conversation behavior from permission policy. Both apply on the next turn. */
export function ApprovalControls({
  mode,
  planOnly,
  loading,
  busy,
  error,
  onMode,
  onPlanOnly,
  onRefresh,
}: {
  mode: PermissionMode;
  planOnly: boolean;
  loading?: boolean;
  busy?: boolean;
  error?: string;
  onMode: (mode: PermissionMode) => void;
  onPlanOnly: (enabled: boolean) => void;
  onRefresh: () => void;
}) {
  const id = useId();
  return (
    <>
      <button
        className="composer-control"
        type="button"
        aria-label="Plan mode"
        aria-pressed={planOnly}
        aria-busy={busy || undefined}
        disabled={loading || busy}
        title="Read and propose work without edits or commands. Applies next turn."
        onClick={() => onPlanOnly(!planOnly)}
      >
        <ListChecks size={15} aria-hidden="true" />
        Plan
      </button>
      <ComposerPopover
        title="Permissions"
        label={loading ? "Loading…" : modeChoices.find((choice) => choice.value === mode)!.label}
      >
        <fieldset className="approval-mode-list" disabled={loading || busy}>
          <legend className="sr-only">Permissions</legend>
          {modeChoices.map((choice) => (
            <label key={choice.value} className="approval-mode-choice">
              <input
                type="radio"
                name={id}
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
        <p className="muted">Applies next turn. Pending approvals stay open.</p>
        {loading && (
          <button type="button" onClick={onRefresh}>
            Retry
          </button>
        )}
      </ComposerPopover>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
/** Saved rules are occasional workspace maintenance, exposed in Settings. */
export function SavedPermissions({
  rules,
  loading,
  error,
  removing,
  onRemove,
  onRefresh,
}: {
  rules: PermissionRule[];
  loading?: boolean;
  error?: string;
  removing?: boolean;
  onRemove: (rule: PermissionRule) => void;
  onRefresh: () => void;
}) {
  const refresh = useRef<HTMLButtonElement>(null);
  return (
    <section className="workspace-permissions" aria-label="Workspace permissions">
      <h3>Workspace permissions</h3>
      <p className="muted">Saved for all conversations in this workspace.</p>
      {loading ? (
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
                  refresh.current?.focus();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {removing && <p role="status">Removing permission after active turns finish…</p>}
      {error && <p role="alert">{error}</p>}
      <button ref={refresh} type="button" onClick={onRefresh}>
        Refresh permissions
      </button>
    </section>
  );
}
export function WorkspacePermissions({ config }: { config: AppConfig }) {
  const client = useQueryClient();
  const key = ["permissions", config.workspaceId];
  const url = `/api/permissions?${new URLSearchParams({ workspace: config.workspaceId })}`;
  const rules = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => request<PermissionRule[]>(url, config.token, signal),
  });
  const remove = useMutation({
    mutationFn: (rule: PermissionRule) =>
      changeWorkspace<PermissionRule[]>(url, config.token, "DELETE", rule),
    onSuccess: (value) => client.setQueryData(key, value),
  });
  return (
    <SavedPermissions
      rules={rules.data ?? []}
      loading={rules.isPending}
      error={remove.error?.message ?? rules.error?.message}
      removing={remove.isPending}
      onRemove={(rule) => remove.mutate(rule)}
      onRefresh={() => {
        void rules.refetch();
      }}
    />
  );
}
/** Query owns server settings; selection reflects the server response. */
export function ConversationApprovals({
  config,
  threadId,
}: {
  config: AppConfig;
  threadId: string;
}) {
  const client = useQueryClient();
  const key = ["approval-mode", config.workspaceId, threadId];
  const url = `/api/approval-mode?${new URLSearchParams({ workspace: config.workspaceId, thread: threadId })}`;
  const settings = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => request<ApprovalSettings>(url, config.token, signal),
    refetchInterval: 3000,
  });
  const change = useMutation({
    mutationFn: (value: { permissions: PermissionMode } | { planOnly: boolean }) =>
      changeWorkspace<ApprovalSettings>(url, config.token, "PUT", value),
    onSuccess: (value) => client.setQueryData(key, value),
  });
  return (
    <ApprovalControls
      mode={settings.data?.permissionMode ?? "acceptEdits"}
      planOnly={settings.data?.planOnly ?? false}
      loading={!settings.data}
      busy={change.isPending}
      error={change.error?.message ?? settings.error?.message}
      onMode={(permissions) => change.mutate({ permissions })}
      onPlanOnly={(planOnly) => change.mutate({ planOnly })}
      onRefresh={() => {
        void settings.refetch();
      }}
    />
  );
}
