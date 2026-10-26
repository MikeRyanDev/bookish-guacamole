import permissionsStyles from "../styles/permissions.module.css";
import settingsStyles from "../styles/settings.module.css";
import sharedStyles from "../styles/shared.module.css";
import { useEffect, useId, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import type { PermissionRule } from "@tanstack/ai-harness/plugins";
import type { ApprovalSettings } from "../../shared/permissions";
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
        className={sharedStyles.composerControl}
        type="button"
        aria-label="Plan mode"
        aria-pressed={planOnly}
        aria-busy={busy || undefined}
        disabled={loading || busy}
        title="Plan without changing files or running commands"
        onClick={() => onPlanOnly(!planOnly)}
      >
        <ListChecks size={15} aria-hidden="true" />
        Plan
      </button>
      <ComposerPopover
        title="Permissions"
        label={loading ? "Loading…" : modeChoices.find((choice) => choice.value === mode)!.label}
      >
        <fieldset className={permissionsStyles.approvalModeList} disabled={loading || busy}>
          <legend className={sharedStyles.srOnly}>Permissions</legend>
          {modeChoices.map((choice) => (
            <label
              key={choice.value}
              className={permissionsStyles.approvalModeChoice}
              title={choice.description}
            >
              <input
                type="radio"
                name={id}
                checked={mode === choice.value}
                onChange={() => onMode(choice.value)}
              />
              <span>
                <strong>{choice.label}</strong>
              </span>
            </label>
          ))}
        </fieldset>
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
  refreshing,
  onRetry,
}: {
  rules: PermissionRule[];
  loading?: boolean;
  error?: string;
  removing?: boolean;
  onRemove: (rule: PermissionRule) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  onRetry?: () => void;
}) {
  const refresh = useRef<HTMLButtonElement>(null);
  const wasRemoving = useRef(false);
  useEffect(() => {
    if (
      wasRemoving.current &&
      !removing &&
      !refresh.current?.closest("[hidden]") &&
      (document.activeElement === document.body || document.activeElement === refresh.current)
    )
      refresh.current?.focus();
    wasRemoving.current = !!removing;
  }, [removing]);
  return (
    <section className={permissionsStyles.workspacePermissions} aria-label="Workspace permissions">
      <div className={settingsStyles.savedRulesHeading}>
        <h3>Saved rules</h3>
        <button
          ref={refresh}
          type="button"
          className={settingsStyles.settingsIconAction}
          aria-label="Refresh permissions"
          title="Refresh permissions"
          disabled={loading || refreshing || removing}
          onClick={onRefresh}
        >
          {refreshing ? (
            <LoaderCircle size={15} className={sharedStyles.settingsSpinner} />
          ) : (
            <RefreshCw size={15} />
          )}
        </button>
      </div>
      {loading ? (
        <div
          className={settingsStyles.settingsRuleSkeleton}
          role="status"
          aria-label="Loading saved rules"
        >
          <span />
          <span />
        </div>
      ) : rules.length ? (
        <ul className={permissionsStyles.savedPermissions}>
          {rules.map((rule) => (
            <li key={JSON.stringify(rule)}>
              <span>
                <strong>{rule.tool}</strong>
                <code>{rule.resource ?? "All calls"}</code>
              </span>
              <button
                type="button"
                className={settingsStyles.settingsIconAction}
                disabled={removing || refreshing}
                title="Remove rule"
                aria-label={`Remove permission for ${rule.tool} ${rule.resource ?? "all calls"}`}
                onClick={() => {
                  onRemove(rule);
                  refresh.current?.focus();
                }}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !error && <p className={settingsStyles.settingsEmpty}>No saved rules.</p>
      )}
      {removing && (
        <p className={settingsStyles.settingsPending} role="status">
          <LoaderCircle size={14} className={sharedStyles.settingsSpinner} /> Removing…
        </p>
      )}
      {error && (
        <div className={sharedStyles.settingsInlineError} role="alert">
          <span>{rules.length ? "Couldn’t update rules." : "Couldn’t load rules."}</span>
          <button disabled={loading || refreshing || removing} onClick={onRetry ?? onRefresh}>
            Retry
          </button>
        </div>
      )}
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
    retry: false,
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
      refreshing={rules.isFetching && !rules.isPending}
      error={remove.error?.message ?? rules.error?.message}
      removing={remove.isPending}
      onRemove={(rule) => remove.mutate(rule)}
      onRetry={() => {
        if (remove.error && remove.variables) remove.mutate(remove.variables);
        else void rules.refetch();
      }}
      onRefresh={() => {
        remove.reset();
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
