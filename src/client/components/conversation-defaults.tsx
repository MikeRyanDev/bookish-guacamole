import settingsStyles from "../styles/settings.module.css";
import sharedStyles from "../styles/shared.module.css";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { LoaderCircle } from "lucide-react";
import { changeWorkspace, request, type AppConfig } from "../api";
import type { ConversationDefaults as Defaults } from "../../shared/settings";

/** Confirms each field independently; errors retain the last saved choice and retry the failed write. */
export function ConversationDefaults({
  config,
  field,
}: {
  config: AppConfig;
  field?: keyof Defaults;
}) {
  const id = useId();
  const client = useQueryClient();
  const key = ["conversation-defaults", config.workspaceId];
  const mutationKey = ["save-defaults", config.workspaceId];
  const busy = useIsMutating({ mutationKey }) > 0;
  const url = `/api/defaults?${new URLSearchParams({ workspace: config.workspaceId })}`;
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => request<Defaults>(url, config.token, signal),
    retry: false,
  });
  const mutation = useMutation({
    mutationKey,
    scope: { id: `defaults-${config.workspaceId}` },
    onMutate: () => client.cancelQueries({ queryKey: key }),
    mutationFn: (value: Partial<Defaults>) =>
      changeWorkspace<Defaults>(url, config.token, "PATCH", value),
    onSuccess: (value) => client.setQueryData(key, value),
  });
  const fields = field ? [field] : (["modelId", "permissions"] as const);
  return (
    <section
      className={settingsStyles.conversationDefaults}
      aria-label={
        field === "modelId"
          ? "Model defaults"
          : field === "permissions"
            ? "Permission defaults"
            : "Conversation defaults"
      }
    >
      <div className={settingsStyles.defaultsFields}>
        {fields.map((name) => (
          <div key={name}>
            <div className={settingsStyles.settingsFieldHeading}>
              <label htmlFor={`${id}-${name}`}>
                {name === "modelId" ? "Default model" : "Default permissions"}
              </label>
              <span className={sharedStyles.muted}>New conversations</span>
            </div>
            <div className={settingsStyles.settingsSelectRow} aria-busy={query.isPending || busy}>
              {query.isPending ? (
                <div
                  className={sharedStyles.settingsSkeleton}
                  role="status"
                  aria-label={name === "modelId" ? "Loading models" : "Loading permissions"}
                >
                  <span />
                </div>
              ) : query.data ? (
                <select
                  id={`${id}-${name}`}
                  disabled={busy || (name === "modelId" && config.models.length === 0)}
                  value={
                    mutation.isPending
                      ? (mutation.variables?.[name] ?? query.data[name])
                      : query.data[name]
                  }
                  onChange={(event) =>
                    mutation.mutate(
                      name === "modelId"
                        ? { modelId: event.target.value }
                        : { permissions: event.target.value as Defaults["permissions"] },
                    )
                  }
                >
                  {name === "modelId" ? (
                    config.models.length ? (
                      config.models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))
                    ) : (
                      <option>No models configured</option>
                    )
                  ) : (
                    <>
                      <option value="acceptEdits">Require permissions</option>
                      <option value="bypass">YOLO — skip approvals</option>
                    </>
                  )}
                </select>
              ) : (
                <select
                  id={`${id}-${name}`}
                  disabled
                  aria-label={name === "modelId" ? "Default model" : "Default permissions"}
                >
                  <option>Unavailable</option>
                </select>
              )}
              {busy && (
                <span
                  className={sharedStyles.settingsSaveState}
                  role="status"
                  aria-label={mutation.isPending ? "Saving" : "Saving settings"}
                >
                  <LoaderCircle size={15} className={sharedStyles.settingsSpinner} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {(query.error || mutation.error) && (
        <div className={sharedStyles.settingsInlineError} role="alert">
          <span>{mutation.error ? "Couldn’t save." : "Couldn’t load defaults."}</span>
          <button
            disabled={busy || query.isFetching}
            onClick={() => {
              if (mutation.error && mutation.variables) mutation.mutate(mutation.variables);
              else void query.refetch();
            }}
          >
            {busy || query.isFetching ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}
    </section>
  );
}
