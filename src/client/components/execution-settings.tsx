import capabilitiesStyles from "../styles/capabilities.module.css";
import sharedStyles from "../styles/shared.module.css";
import { useId, useRef, useState } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeWorkspace, request, type AppConfig } from "../api";
import type { ExecutionSettingsResponse, ModelPrices } from "../../shared/execution";
import { PendingStatus } from "./pending-status";

/** Workspace policy drafts stay in this form until an explicit save succeeds. */
export function ExecutionSettings({ config, active }: { config: AppConfig; active: boolean }) {
  const client = useQueryClient();
  const panel = useRef<HTMLDivElement>(null);
  const submittedFromPanel = useRef(false);
  const key = ["execution-settings", config.workspaceId];
  const mutationKey = ["save-execution", config.workspaceId];
  const url = `/api/execution?${new URLSearchParams({ workspace: config.workspaceId })}`;
  const busy = useIsMutating({ mutationKey }) > 0;
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => request<ExecutionSettingsResponse>(url, config.token, signal),
    enabled: active,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const mutation = useMutation({
    mutationKey,
    scope: { id: `execution-${config.workspaceId}` },
    onMutate: () => {
      submittedFromPanel.current = !!panel.current?.contains(document.activeElement);
      return client.cancelQueries({ queryKey: key });
    },
    mutationFn: (value: ExecutionSettingsResponse) =>
      changeWorkspace<ExecutionSettingsResponse>(url, config.token, "PUT", value),
    onSuccess: (value) => {
      const restoreFocus =
        submittedFromPanel.current &&
        (document.activeElement === document.body ||
          panel.current?.contains(document.activeElement));
      client.setQueryData(key, value);
      if (restoreFocus && active) requestAnimationFrame(() => panel.current?.focus());
    },
  });
  if (!query.data)
    return query.error ? (
      <div className={sharedStyles.settingsInlineError} role="alert">
        <span>Could not load execution settings.</span>
        <button disabled={query.isFetching} onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    ) : (
      <div
        className={sharedStyles.settingsSkeleton}
        role="status"
        aria-label="Loading execution settings"
      >
        <span />
      </div>
    );
  return (
    <div ref={panel} role="group" aria-label="Execution settings" tabIndex={-1}>
      <ExecutionForm
        key={`${config.workspaceId}-${query.data.revision ?? "initial"}`}
        config={config}
        saved={query.data}
        busy={busy}
        error={mutation.error?.message}
        save={(value) => mutation.mutate(value)}
        clearError={() => mutation.reset()}
        reload={() => {
          mutation.reset();
          void query.refetch();
        }}
      />
    </div>
  );
}

function ExecutionForm({
  config,
  saved,
  busy,
  error,
  save,
  clearError,
  reload,
}: {
  config: AppConfig;
  saved: ExecutionSettingsResponse;
  busy: boolean;
  error?: string;
  save: (value: ExecutionSettingsResponse) => void;
  clearError: () => void;
  reload: () => void;
}) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [priceModels, setPriceModels] = useState(() =>
    Object.fromEntries(
      Object.entries(saved.settings.models).map(([name, model]) => [name, !!model.prices]),
    ),
  );
  const settings = saved.settings;
  const number = (data: FormData, name: string) => Number(data.get(name));
  const optionalNumber = (data: FormData, name: string) =>
    data.get(name) === "" ? null : number(data, name);
  return (
    <form
      ref={form}
      className={["execution-form", capabilitiesStyles.capabilityForm].join(" ")}
      onChange={() => setDirty(true)}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        save({
          revision: saved.revision,
          settings: {
            autoCompact: data.has("autoCompact"),
            compactAt: number(data, "compactAt"),
            tokenLimit: optionalNumber(data, "tokenLimit"),
            costLimit: optionalNumber(data, "costLimit"),
            maxRetries: number(data, "maxRetries"),
            codeMode: data.has("codeMode"),
            models: Object.fromEntries(
              Object.keys(settings.models).map((name) => [
                name,
                {
                  contextWindow: number(data, `${name}.contextWindow`),
                  prices: priceModels[name]
                    ? {
                        input: number(data, `${name}.input`),
                        output: number(data, `${name}.output`),
                        cacheRead: number(data, `${name}.cacheRead`),
                        cacheWrite: number(data, `${name}.cacheWrite`),
                      }
                    : null,
                },
              ]),
            ),
          },
        });
      }}
    >
      <fieldset disabled={busy}>
        <legend>Context</legend>
        <label className={capabilitiesStyles.capabilityCheck}>
          <input type="checkbox" name="autoCompact" defaultChecked={settings.autoCompact} />{" "}
          <span>Summarize long conversations</span>
        </label>
        <p className={sharedStyles.muted}>
          Keep the full transcript while shortening model context.
        </p>
        <label className={capabilitiesStyles.capabilityField} htmlFor={`${id}-threshold`}>
          <span>Summarize at (%)</span>
          <input
            id={`${id}-threshold`}
            name="compactAt"
            type="number"
            min={50}
            max={90}
            step={1}
            required
            defaultValue={settings.compactAt}
          />
        </label>
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Conversation limits</legend>
        <p className={sharedStyles.muted}>
          Stop further model calls at the limit, including Goal work. A call already in progress can
          exceed it.
        </p>
        <div className={capabilitiesStyles.capabilityFields}>
          <label className={capabilitiesStyles.capabilityField} htmlFor={`${id}-tokens`}>
            <span>Token limit</span>
            <input
              id={`${id}-tokens`}
              name="tokenLimit"
              type="number"
              min={1000}
              max={1_000_000_000}
              step={1}
              placeholder="No limit"
              defaultValue={settings.tokenLimit ?? ""}
            />
          </label>
          <label className={capabilitiesStyles.capabilityField} htmlFor={`${id}-cost`}>
            <span>Cost limit (USD)</span>
            <input
              id={`${id}-cost`}
              name="costLimit"
              type="number"
              min={0.000001}
              max={100000}
              step="any"
              placeholder="No limit"
              defaultValue={settings.costLimit ?? ""}
            />
          </label>
        </div>
        <p className={sharedStyles.muted}>
          Cost limits need model prices below. Missing usage stops work when a limit is set.
        </p>
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Recovery</legend>
        <label className={capabilitiesStyles.capabilityField} htmlFor={`${id}-retries`}>
          <span>Temporary failure retries</span>
          <select id={`${id}-retries`} name="maxRetries" defaultValue={settings.maxRetries}>
            {[0, 1, 2, 3, 4, 5].map((count) => (
              <option value={count} key={count}>
                {count === 0 ? "No retries" : `${count} ${count === 1 ? "retry" : "retries"}`}
              </option>
            ))}
          </select>
        </label>
        <p className={sharedStyles.muted}>Stop also cancels a pending retry.</p>
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Code mode</legend>
        <label className={capabilitiesStyles.capabilityCheck}>
          <input type="checkbox" name="codeMode" defaultChecked={settings.codeMode} />
          <span>Enable code mode</span>
        </label>
        <p className={sharedStyles.muted}>
          Batch read-only tools in an isolated TypeScript program. Writes keep their approval
          controls. Applies to the next turn.
        </p>
      </fieldset>
      <details className={capabilitiesStyles.capabilityDetails}>
        <summary>Model limits and prices</summary>
        <p className={sharedStyles.muted}>
          Set each model’s context window. The starter uses 32,768 tokens until you change it.
          Prices are USD per million tokens.
        </p>
        {config.models.map((model) => {
          const policy = settings.models[model.id];
          if (!policy) return null;
          return (
            <fieldset disabled={busy} key={model.id}>
              <legend>{model.label}</legend>
              <label className={capabilitiesStyles.capabilityField}>
                <span>Context window for {model.label}</span>
                <input
                  name={`${model.id}.contextWindow`}
                  type="number"
                  min={4096}
                  max={10_000_000}
                  step={1}
                  required
                  defaultValue={policy.contextWindow}
                />
              </label>
              <label className={capabilitiesStyles.capabilityCheck}>
                <input
                  type="checkbox"
                  checked={priceModels[model.id] ?? false}
                  onChange={(event) =>
                    setPriceModels((previous) => ({
                      ...previous,
                      [model.id]: event.target.checked,
                    }))
                  }
                />
                <span>Set prices for {model.label}</span>
              </label>
              <div hidden={!priceModels[model.id]}>
                <div className={capabilitiesStyles.capabilityFields}>
                  {(
                    [
                      ["input", "Input"],
                      ["output", "Output"],
                      ["cacheRead", "Cache read"],
                      ["cacheWrite", "Cache write"],
                    ] satisfies [keyof ModelPrices, string][]
                  ).map(([name, label]) => (
                    <label className={capabilitiesStyles.capabilityField} key={name}>
                      <span>
                        {label} price for {model.label}
                      </span>
                      <input
                        name={`${model.id}.${name}`}
                        type="number"
                        min={0}
                        max={100000}
                        step="any"
                        required={!!priceModels[model.id]}
                        disabled={!priceModels[model.id]}
                        defaultValue={policy.prices?.[name] ?? ""}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>
          );
        })}
      </details>
      {(dirty || error || busy) && (
        <div className={capabilitiesStyles.capabilitySave}>
          {error && (
            <div className={sharedStyles.settingsInlineError} role="alert">
              <span>{error} Your draft is unchanged.</span>
              {/another window/.test(error) && (
                <button type="button" onClick={reload}>
                  Reload settings
                </button>
              )}
            </div>
          )}
          <div className={capabilitiesStyles.capabilityActions}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                form.current?.reset();
                setPriceModels(
                  Object.fromEntries(
                    Object.entries(settings.models).map(([name, model]) => [name, !!model.prices]),
                  ),
                );
                setDirty(false);
                clearError();
              }}
            >
              Cancel changes
            </button>
            <button className={capabilitiesStyles.primaryAction} type="submit" disabled={busy}>
              {busy ? "Saving…" : error ? "Retry save" : "Save changes"}
            </button>
            {busy && <PendingStatus>Saving execution settings</PendingStatus>}
          </div>
        </div>
      )}
    </form>
  );
}
