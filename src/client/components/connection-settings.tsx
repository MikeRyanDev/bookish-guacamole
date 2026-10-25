import { useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeWorkspace, request, type AppConfig } from "../api";
import type {
  Connection,
  ConnectionsResponse,
  ConnectionsStatusResponse,
} from "../../shared/connections";
import { PendingStatus } from "./pending-status";

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
      <div className="settings-inline-error" role="alert">
        <span>Could not load connections.</span>
        <button disabled={query.isFetching} onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    ) : (
      <div className="settings-skeleton" role="status" aria-label="Loading connections">
        <span />
      </div>
    );
  const saved = query.data;
  const change = (connections: Connection[]) => save.mutate({ ...saved, connections });
  return (
    <div className="connection-settings capability-form">
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
          <p className="muted">Add tools from an MCP server. External tools require approval.</p>
          <div className="capability-actions">
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
            <p className="muted">The local guide is a read-only example. It needs no account.</p>
          )}
          <ul className="connection-list">
            {saved.connections.map((entry) => {
              const current = entry.enabled
                ? status.data?.connections.find((value) => value.id === entry.id)
                : undefined;
              const login =
                status.data?.signIn?.connectionId === entry.id ? status.data.signIn : null;
              const oauth = entry.transport.type === "http" && entry.transport.auth === "oauth";
              return (
                <li key={entry.id}>
                  <div className="connection-heading">
                    <strong>{entry.id}</strong>
                    <span className="muted">
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
                  <p className="connection-address muted">
                    {entry.transport.type === "example"
                      ? "Local read-only guide"
                      : entry.transport.type === "http"
                        ? entry.transport.url
                        : entry.transport.command}
                  </p>
                  {current?.error && (
                    <p className="connection-error" role="alert">
                      {current.error}
                    </p>
                  )}
                  {removing === entry.id ? (
                    <div className="connection-remove">
                      <p>Remove {entry.id} from this workspace?</p>
                      <div className="capability-actions">
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
                    <div className="capability-actions">
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
                    <div className="connection-sign-in">
                      <p role="status">
                        {login.status === "starting"
                          ? "Preparing sign-in…"
                          : "Complete sign-in in your browser."}
                      </p>
                      <div className="capability-actions">
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
                    <p role="alert" className="connection-error">
                      {login.error}
                    </p>
                  )}
                  {oauth && entry.enabled && (
                    <p className="muted">Sign in again after a server restart.</p>
                  )}
                </li>
              );
            })}
          </ul>
          {save.isPending && <PendingStatus>Saving connections</PendingStatus>}
          {status.data?.applying && (
            <p role="status" className="muted">
              Applying connections after active work finishes…
            </p>
          )}
          {(save.error || command.error || status.error || status.data?.error) && (
            <div className="settings-inline-error" role="alert">
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

function ConnectionEditor({
  existing,
  busy,
  error,
  cancel,
  reload,
  submit,
}: {
  existing?: Connection;
  busy: boolean;
  error?: string;
  cancel: () => void;
  reload: () => void;
  submit: (connection: Connection) => void;
}) {
  const id = useId();
  const [transport, setTransport] = useState(existing?.transport.type ?? "http");
  const [auth, setAuth] = useState(
    existing?.transport.type === "http" ? existing.transport.auth : "none",
  );
  const [validation, setValidation] = useState<string | null>(null);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = (name: string) => String(data.get(name) ?? "").trim();
        let config: Connection["transport"];
        if (transport === "example") config = { type: "example" };
        else if (transport === "stdio") {
          const environment: Record<string, string> = {};
          for (const line of value("environment")
            .split("\n")
            .filter((line) => line.trim())) {
            const match = /^([A-Z_][A-Z0-9_]*)=([A-Z_][A-Z0-9_]*)$/.exec(line.trim());
            if (!match) {
              setValidation(
                "Use CHILD_VARIABLE=SERVER_VARIABLE, one mapping per line. Do not enter secret values.",
              );
              return;
            }
            environment[match[1]!] = match[2]!;
          }
          config = {
            type: "stdio",
            command: value("command"),
            args: String(data.get("args") ?? "")
              .split("\n")
              .filter((line) => line.length > 0),
            environment,
          };
        } else
          config = {
            type: "http",
            url: value("url"),
            auth,
            ...(auth === "environment" ? { tokenVariable: value("tokenVariable") } : {}),
          };
        setValidation(null);
        submit({
          id: existing?.id ?? value("name"),
          enabled: existing?.enabled ?? false,
          transport: config,
        });
      }}
    >
      <fieldset disabled={busy}>
        <legend>{existing ? `Edit ${existing.id}` : "Add connection"}</legend>
        {existing ? (
          <p>
            Connection name: <strong>{existing.id}</strong>
          </p>
        ) : (
          <>
            <label className="capability-field" htmlFor={`${id}-name`}>
              <span>Connection name</span>
              <input
                autoFocus
                id={`${id}-name`}
                name="name"
                required
                pattern="[a-z][a-z0-9_-]{0,39}"
                maxLength={40}
                defaultValue=""
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <p className="muted">Use lowercase letters, numbers, hyphens, or underscores.</p>
          </>
        )}
        <label className="capability-field">
          <span>Transport</span>
          <select
            value={transport}
            onChange={(event) =>
              setTransport(event.target.value as Connection["transport"]["type"])
            }
          >
            <option value="http">Remote HTTP server</option>
            <option value="stdio">Local command (stdio)</option>
            <option value="example">Local read-only guide</option>
          </select>
        </label>
        {transport === "http" && (
          <>
            <label className="capability-field">
              <span>Server URL</span>
              <input
                name="url"
                type="url"
                required
                defaultValue={existing?.transport.type === "http" ? existing.transport.url : ""}
                placeholder="https://example.com/mcp"
              />
            </label>
            <label className="capability-field">
              <span>Authentication</span>
              <select
                value={auth}
                onChange={(event) =>
                  setAuth(event.target.value as "none" | "oauth" | "environment")
                }
              >
                <option value="none">None</option>
                <option value="oauth">OAuth sign-in</option>
                <option value="environment">Bearer token from environment</option>
              </select>
            </label>
            {auth === "environment" && (
              <label className="capability-field">
                <span>Token environment variable</span>
                <input
                  name="tokenVariable"
                  required
                  pattern="[A-Z_][A-Z0-9_]{0,127}"
                  placeholder="STARTER_DOCS_TOKEN"
                  defaultValue={
                    existing?.transport.type === "http"
                      ? (existing.transport.tokenVariable ?? "")
                      : ""
                  }
                  autoComplete="off"
                  spellCheck={false}
                />
                <span className="muted">Enter the variable name, not its secret value.</span>
              </label>
            )}
          </>
        )}
        {transport === "stdio" && (
          <>
            <p className="muted">
              Connecting starts this program on your computer. Use environment variables for
              secrets.
            </p>
            <label className="capability-field">
              <span>Command</span>
              <input
                name="command"
                required
                defaultValue={
                  existing?.transport.type === "stdio" ? existing.transport.command : ""
                }
                placeholder="node"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="capability-field">
              <span>Arguments (one per line)</span>
              <textarea
                name="args"
                defaultValue={
                  existing?.transport.type === "stdio" ? existing.transport.args.join("\n") : ""
                }
                spellCheck={false}
              />
            </label>
            <label className="capability-field">
              <span>Environment mappings</span>
              <textarea
                name="environment"
                placeholder="API_TOKEN=STARTER_DOCS_TOKEN"
                defaultValue={
                  existing?.transport.type === "stdio"
                    ? Object.entries(existing.transport.environment)
                        .map(([name, reference]) => `${name}=${reference}`)
                        .join("\n")
                    : ""
                }
                spellCheck={false}
              />
            </label>
          </>
        )}
        {!existing && <p className="muted">Save first, then choose Connect.</p>}
      </fieldset>
      {(validation || error) && (
        <p role="alert" className="connection-error">
          {validation ?? error}
        </p>
      )}
      {error && /another window/.test(error) && (
        <button type="button" onClick={reload}>
          Discard draft and reload
        </button>
      )}
      <div className="capability-actions">
        <button type="button" disabled={busy} onClick={cancel}>
          Cancel
        </button>
        <button type="submit" className="primary-action" disabled={busy}>
          {busy ? "Saving…" : error ? "Retry save" : "Save connection"}
        </button>
      </div>
    </form>
  );
}
