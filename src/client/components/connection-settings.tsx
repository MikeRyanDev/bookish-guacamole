import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type {
  Connection,
  ConnectionsResponse,
  ConnectionsStatusResponse,
} from "../../shared/connections";
import { changeWorkspace, request, type AppConfig } from "../api";
import capabilitiesStyles from "../styles/capabilities.module.css";
import sharedStyles from "../styles/shared.module.css";
import { PendingStatus } from "./pending-status";

import { ConnectionEditor } from "./connection-editor";

const statusLabels = {
  disabled: "Disconnected",
  connecting: "Connecting…",
  connected: "Connected",
  reconnecting: "Reconnecting…",
  failed: "Connection failed",
  "sign-in-required": "Sign-in required",
  "signed-in": "Signed in",
};

/** MCP is opt-in. Configuration and connection progress remain workspace-scoped server reads. */
export function ConnectionSettings({ config, active }: { config: AppConfig; active: boolean }) {
  const client = useQueryClient();
  const key = ["connections", config.workspaceId];
  const statusKey = ["connection-status", config.workspaceId];
  const suffix = `?${new URLSearchParams({ workspace: config.workspaceId })}`;
  const url = `/api/connections${suffix}`;
  const [editor, setEditor] = useState<Connection | "new" | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => request<ConnectionsResponse>(url, config.token, signal),
    enabled: active,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const status = useQuery({
    queryKey: statusKey,
    queryFn: ({ signal }) =>
      request<ConnectionsStatusResponse>(`/api/connections/status${suffix}`, config.token, signal),
    enabled: active && !!query.data,
    retry: false,
    refetchInterval: active ? 1500 : false,
  });
  const save = useMutation({
    mutationKey: ["save-connections", config.workspaceId],
    scope: { id: `connections-${config.workspaceId}` },
    onMutate: () => client.cancelQueries({ queryKey: key }),
    mutationFn: (value: ConnectionsResponse) =>
      changeWorkspace<ConnectionsResponse>(url, config.token, "PUT", value),
    onSuccess: (value) => {
      client.setQueryData(key, value);
      void client.invalidateQueries({ queryKey: statusKey });
    },
  });
  const command = useMutation({
    mutationFn: ({
      action,
      connectionId,
    }: {
      action: "retry" | "sign-in" | "cancel-sign-in" | "sign-out";
      connectionId?: string;
    }) =>
      changeWorkspace(
        `/api/connections/${action}${suffix}`,
        config.token,
        "POST",
        connectionId ? { connectionId } : {},
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: statusKey }),
  });
  const signing =
    !!status.data?.signIn && ["starting", "waiting"].includes(status.data.signIn.status);
  const busy = save.isPending || command.isPending || status.data?.applying === true || signing;
  const closeEditor = () => {
    setEditor(null);
    save.reset();
    requestAnimationFrame(() => addButton.current?.focus());
  };
  if (!query.data)
    return query.error ? (
      <div className={sharedStyles.settingsInlineError} role="alert">
        <span>Could not load connections.</span>
        <button disabled={query.isFetching} onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    ) : (
      <div className={sharedStyles.settingsSkeleton} role="status" aria-label="Loading connections">
        <span />
      </div>
    );
  const saved = query.data;
  const change = (connections: Connection[]) => save.mutate({ ...saved, connections });
  return (
    <div className={["connection-settings", capabilitiesStyles.capabilityForm].join(" ")}>
      {editor !== null ? (
        <ConnectionEditor
          key={typeof editor === "string" ? "new" : editor.id}
          existing={editor === "new" ? undefined : editor}
          busy={save.isPending}
          error={save.error?.message}
          cancel={closeEditor}
          reload={() => {
            closeEditor();
            void query.refetch();
          }}
          submit={(connection) => {
            const connections =
              editor === "new"
                ? [...saved.connections, connection]
                : saved.connections.map((entry) => (entry.id === editor.id ? connection : entry));
            save.mutate({ ...saved, connections }, { onSuccess: closeEditor });
          }}
        />
      ) : (
        <>
          <p className={sharedStyles.muted}>
            Add tools from an MCP server. External tools require approval.
          </p>
          <div className={capabilitiesStyles.capabilityActions}>
            <button
              ref={addButton}
              type="button"
              disabled={busy}
              onClick={() => {
                save.reset();
                setEditor("new");
              }}
            >
              Add connection
            </button>
            {!saved.connections.some((entry) => entry.transport.type === "example") && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  let id = "local-guide";
                  for (let index = 2; saved.connections.some((entry) => entry.id === id); index++)
                    id = `local-guide-${index}`;
                  change([
                    ...saved.connections,
                    { id, enabled: true, transport: { type: "example" } },
                  ]);
                }}
              >
                Try local guide
              </button>
            )}
          </div>
          {saved.connections.length === 0 && (
            <p className={sharedStyles.muted}>
              The local guide is a read-only example. It needs no account.
            </p>
          )}
          <ul className={capabilitiesStyles.connectionList}>
            {saved.connections.map((entry) => {
              const current = entry.enabled
                ? status.data?.connections.find((value) => value.id === entry.id)
                : undefined;
              const login =
                status.data?.signIn?.connectionId === entry.id ? status.data.signIn : null;
              const oauth = entry.transport.type === "http" && entry.transport.auth === "oauth";
              return (
                <li key={entry.id}>
                  <div className={capabilitiesStyles.connectionHeading}>
                    <strong>{entry.id}</strong>
                    <span className={sharedStyles.muted}>
                      {current
                        ? statusLabels[current.status]
                        : entry.enabled
                          ? "Checking connection…"
                          : "Disconnected"}
                      {current?.status === "connected"
                        ? ` · ${current.toolCount} ${current.toolCount === 1 ? "tool" : "tools"}`
                        : ""}
                    </span>
                  </div>
                  <p
                    className={[capabilitiesStyles.connectionAddress, sharedStyles.muted].join(" ")}
                  >
                    {entry.transport.type === "example"
                      ? "Local read-only guide"
                      : entry.transport.type === "http"
                        ? entry.transport.url
                        : entry.transport.command}
                  </p>
                  {current?.error && (
                    <p className={capabilitiesStyles.connectionError} role="alert">
                      {current.error}
                    </p>
                  )}
                  {removing === entry.id ? (
                    <div className={capabilitiesStyles.connectionRemove}>
                      <p>Remove {entry.id} from this workspace?</p>
                      <div className={capabilitiesStyles.capabilityActions}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            save.mutate(
                              {
                                ...saved,
                                connections: saved.connections.filter(
                                  (value) => value.id !== entry.id,
                                ),
                              },
                              {
                                onSuccess: () => {
                                  setRemoving(null);
                                  addButton.current?.focus();
                                },
                              },
                            )
                          }
                        >
                          Remove connection
                        </button>
                        <button
                          type="button"
                          disabled={save.isPending}
                          onClick={() => setRemoving(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={capabilitiesStyles.capabilityActions}>
                      <button
                        type="button"
                        aria-label={`${entry.enabled ? "Disconnect" : "Connect"} ${entry.id}`}
                        disabled={busy}
                        onClick={() =>
                          change(
                            saved.connections.map((value) =>
                              value.id === entry.id ? { ...value, enabled: !value.enabled } : value,
                            ),
                          )
                        }
                      >
                        {entry.enabled ? "Disconnect" : "Connect"}
                      </button>
                      <button
                        type="button"
                        aria-label={`Edit ${entry.id}`}
                        disabled={busy}
                        onClick={() => {
                          save.reset();
                          setEditor(entry);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${entry.id}`}
                        disabled={busy}
                        onClick={() => setRemoving(entry.id)}
                      >
                        Remove
                      </button>
                      {entry.enabled && current?.status === "failed" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => command.mutate({ action: "retry" })}
                        >
                          Retry connection
                        </button>
                      )}
                      {entry.enabled && oauth && (
                        <button
                          type="button"
                          aria-label={`${current?.status === "signed-in" || current?.status === "connected" ? "Sign out of" : "Sign in to"} ${entry.id}`}
                          disabled={busy}
                          onClick={() =>
                            command.mutate({
                              action:
                                current?.status === "signed-in" || current?.status === "connected"
                                  ? "sign-out"
                                  : "sign-in",
                              connectionId: entry.id,
                            })
                          }
                        >
                          {current?.status === "signed-in" || current?.status === "connected"
                            ? "Sign out"
                            : "Sign in"}
                        </button>
                      )}
                    </div>
                  )}
                  {login && ["starting", "waiting"].includes(login.status) && (
                    <div className={capabilitiesStyles.connectionSignIn}>
                      <p role="status">
                        {login.status === "starting"
                          ? "Preparing sign-in…"
                          : "Complete sign-in in your browser."}
                      </p>
                      <div className={capabilitiesStyles.capabilityActions}>
                        {login.url && (
                          <a href={login.url} target="_blank" rel="noreferrer">
                            Open sign-in
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={command.isPending}
                          onClick={() => command.mutate({ action: "cancel-sign-in" })}
                        >
                          Cancel sign-in
                        </button>
                      </div>
                    </div>
                  )}
                  {login?.status === "failed" && (
                    <p role="alert" className={capabilitiesStyles.connectionError}>
                      {login.error}
                    </p>
                  )}
                  {oauth && entry.enabled && (
                    <p className={sharedStyles.muted}>Sign in again after a server restart.</p>
                  )}
                </li>
              );
            })}
          </ul>
          {save.isPending && <PendingStatus>Saving connections</PendingStatus>}
          {status.data?.applying && (
            <p role="status" className={sharedStyles.muted}>
              Applying connections after active work finishes…
            </p>
          )}
          {(save.error || command.error || status.error || status.data?.error) && (
            <div className={sharedStyles.settingsInlineError} role="alert">
              <span>
                {save.error?.message ??
                  command.error?.message ??
                  status.data?.error ??
                  "Could not read connection status."}
              </span>
              <button
                type="button"
                disabled={save.isPending || command.isPending || status.isFetching}
                onClick={() => {
                  if (save.error && save.variables) save.mutate(save.variables);
                  else if (command.error && command.variables) command.mutate(command.variables);
                  else if (status.data?.error) command.mutate({ action: "retry" });
                  else void status.refetch();
                }}
              >
                Retry
              </button>
              {save.error && /another window/.test(save.error.message) && (
                <button
                  type="button"
                  onClick={() => {
                    save.reset();
                    void query.refetch();
                  }}
                >
                  Reload connections
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
