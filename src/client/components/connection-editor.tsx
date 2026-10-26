import { useId, useState } from "react";
import type { Connection } from "../../shared/connections";
import capabilitiesStyles from "../styles/capabilities.module.css";
import sharedStyles from "../styles/shared.module.css";

/** Validates a connection draft locally; the parent owns persistence and server errors. */
export function ConnectionEditor({
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
            <label className={capabilitiesStyles.capabilityField} htmlFor={`${id}-name`}>
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
            <p className={sharedStyles.muted}>
              Use lowercase letters, numbers, hyphens, or underscores.
            </p>
          </>
        )}
        <label className={capabilitiesStyles.capabilityField}>
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
            <label className={capabilitiesStyles.capabilityField}>
              <span>Server URL</span>
              <input
                name="url"
                type="url"
                required
                defaultValue={existing?.transport.type === "http" ? existing.transport.url : ""}
                placeholder="https://example.com/mcp"
              />
            </label>
            <label className={capabilitiesStyles.capabilityField}>
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
              <label className={capabilitiesStyles.capabilityField}>
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
                <span className={sharedStyles.muted}>
                  Enter the variable name, not its secret value.
                </span>
              </label>
            )}
          </>
        )}
        {transport === "stdio" && (
          <>
            <p className={sharedStyles.muted}>
              Connecting starts this program on your computer. Use environment variables for
              secrets.
            </p>
            <label className={capabilitiesStyles.capabilityField}>
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
            <label className={capabilitiesStyles.capabilityField}>
              <span>Arguments (one per line)</span>
              <textarea
                name="args"
                defaultValue={
                  existing?.transport.type === "stdio" ? existing.transport.args.join("\n") : ""
                }
                spellCheck={false}
              />
            </label>
            <label className={capabilitiesStyles.capabilityField}>
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
        {!existing && <p className={sharedStyles.muted}>Save first, then choose Connect.</p>}
      </fieldset>
      {(validation || error) && (
        <p role="alert" className={capabilitiesStyles.connectionError}>
          {validation ?? error}
        </p>
      )}
      {error && /another window/.test(error) && (
        <button type="button" onClick={reload}>
          Discard draft and reload
        </button>
      )}
      <div className={capabilitiesStyles.capabilityActions}>
        <button type="button" disabled={busy} onClick={cancel}>
          Cancel
        </button>
        <button type="submit" className={capabilitiesStyles.primaryAction} disabled={busy}>
          {busy ? "Saving…" : error ? "Retry save" : "Save connection"}
        </button>
      </div>
    </form>
  );
}
