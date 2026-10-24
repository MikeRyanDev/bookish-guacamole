import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { changeWorkspace, request, type AppConfig } from "../api";
import type { ConversationDefaults as Defaults } from "../../shared/settings";

/** Confirmed workspace defaults; edits never mutate an existing conversation. */
export function ConversationDefaults({ config }: { config: AppConfig }) {
  const id = useId();
  const client = useQueryClient();
  const key = ["conversation-defaults", config.workspaceId];
  const url = `/api/defaults?${new URLSearchParams({ workspace: config.workspaceId })}`;
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => request<Defaults>(url, config.token, signal),
  });
  const mutation = useMutation({
    scope: { id: `defaults-${config.workspaceId}` },
    mutationFn: (value: Partial<Defaults>) =>
      changeWorkspace<Defaults>(url, config.token, "PATCH", value),
    onSuccess: (value) => client.setQueryData(key, value),
  });
  return (
    <section className="conversation-defaults" aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`}>New conversation defaults</h3>
      <p className="muted">Applies to new conversations in this workspace.</p>
      {query.isPending ? (
        <p role="status">Loading defaults…</p>
      ) : (
        query.data && (
          <div className="defaults-fields">
            <label>
              Default permissions
              <select
                disabled={mutation.isPending}
                aria-label="Default permissions"
                value={query.data.permissions}
                onChange={(e) =>
                  mutation.mutate({
                    permissions: e.target.value as Defaults["permissions"],
                  })
                }
              >
                <option value="acceptEdits">Require permissions</option>
                <option value="bypass">YOLO</option>
              </select>
            </label>
            <label>
              Default model
              <select
                disabled={mutation.isPending}
                aria-label="Default model"
                value={query.data.modelId}
                onChange={(e) => mutation.mutate({ modelId: e.target.value })}
              >
                {config.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} ({model.provider})
                  </option>
                ))}
              </select>
            </label>
          </div>
        )
      )}
      {query.data?.permissions === "bypass" && (
        <p className="muted">YOLO skips approval requests and saved permission denials.</p>
      )}
      {(query.error || mutation.error) && (
        <div role="alert">
          <p>{query.error?.message ?? mutation.error?.message}</p>
          <button
            onClick={() => {
              mutation.reset();
              void query.refetch();
            }}
          >
            Retry defaults
          </button>
        </div>
      )}
    </section>
  );
}
