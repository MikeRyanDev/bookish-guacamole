import { useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeWorkspace, request, type AppConfig } from "../api";
import { ComposerPopover } from "./composer-popover";

export interface ModelSelection {
  modelId: string;
  status: string;
  pending: number;
}
/** Uses the incumbent composer disclosure and native radios for keyboard selection. */
export function ModelSelector({
  models,
  selected,
  disabled,
  error,
  onSelect,
  onRetry,
}: {
  models: AppConfig["models"];
  selected?: string;
  disabled?: boolean;
  error?: string;
  onSelect: (id: string) => void;
  onRetry?: () => void;
}) {
  const group = useId();
  const choice = models.find((model) => model.id === selected);
  return (
    <>
      <ComposerPopover
        title="Choose model"
        disabled={disabled}
        label={<span className="model-selector-label">{choice?.label ?? "Choose model"}</span>}
      >
        <fieldset className="approval-mode-list" disabled={disabled}>
          <legend className="sr-only">Model for this conversation</legend>
          {models.map((model) => (
            <label key={model.id} className="approval-mode-choice model-choice">
              <input
                type="radio"
                name={group}
                checked={selected === model.id}
                onChange={() => onSelect(model.id)}
              />
              <span>
                <strong>{model.label}</strong> <span className="muted">({model.provider})</span>
              </span>
            </label>
          ))}
        </fieldset>
        {error && <p role="alert">{error}</p>}
        {onRetry && (
          <button type="button" onClick={onRetry}>
            Retry model selection
          </button>
        )}
      </ComposerPopover>
    </>
  );
}

/** Query owns confirmed selection; failed writes leave the last confirmed model intact. */
export function useConversationModel(config: AppConfig, threadId: string) {
  const client = useQueryClient();
  const key = ["model", config.workspaceId, threadId];
  const url = `/api/model?${new URLSearchParams({ workspace: config.workspaceId, thread: threadId })}`;
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => request<ModelSelection>(url, config.token, signal),
    refetchInterval: 3000,
  });
  const change = useMutation({
    onMutate: async () => {
      await client.cancelQueries({ queryKey: key });
    },
    mutationFn: (modelId: string) =>
      changeWorkspace<ModelSelection>(url, config.token, "PUT", { modelId }),
    onSuccess: (value) => client.setQueryData(key, value),
  });
  return { query, change };
}
