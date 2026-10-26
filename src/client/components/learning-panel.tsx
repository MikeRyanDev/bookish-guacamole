import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { LearningSpace, WorkspaceLearning } from "../../shared/learning";
import { changeWorkspace, request, type AppConfig } from "../api";
import learningStyles from "../styles/learning.module.css";
import sharedStyles from "../styles/shared.module.css";

import { learningQuery, pathFor } from "./learning-queries";
import { QueryError } from "./learning-query-error";
import { SpaceLearning } from "./learning-space";

export function LearningPanel({ config }: { config: AppConfig }) {
  const client = useQueryClient();
  const settings = useQuery(learningQuery<WorkspaceLearning>(config, ""));
  const spaces = useInfiniteQuery({
    queryKey: ["learning-spaces"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      request<{ spaces: LearningSpace[]; nextCursor: string | null }>(
        `/api/learning/spaces${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
        config.token,
        signal,
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
  const changeButton = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const confirmed = settings.data?.containerId ?? "";
  const selection = draft ?? confirmed;
  const save = useMutation({
    mutationFn: (containerId: string | null) =>
      changeWorkspace<WorkspaceLearning>(pathFor(config), config.token, "PUT", { containerId }),
    onSuccess: async (value) => {
      client.setQueryData(learningQuery<WorkspaceLearning>(config, "").queryKey, value);
      setDraft(undefined);
      setSaved(true);
      setEditing(false);
      requestAnimationFrame(() => changeButton.current?.focus());
      await Promise.all([
        client.invalidateQueries({ queryKey: ["config"] }),
        client.invalidateQueries({ queryKey: ["skills", config.workspaceId] }),
      ]);
    },
  });
  const choices = spaces.data?.pages.flatMap((page) => page.spaces) ?? [];
  return (
    <section className={learningStyles.learningPanel} aria-label="Workspace Learning">
      <div className={learningStyles.learningSettings}>
        {confirmed && !editing ? (
          <div className={learningStyles.learningAssignmentSummary}>
            <span>
              Learning space <strong>{settings.data?.space?.name ?? "Current space"}</strong>
            </span>
            <button
              ref={changeButton}
              onClick={() => {
                setEditing(true);
                setSaved(false);
              }}
            >
              Change space
            </button>
          </div>
        ) : (
          <form
            className={learningStyles.learningAssignment}
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate(selection || null);
            }}
          >
            <label htmlFor="learning-space">Learning space</label>
            <select
              id="learning-space"
              value={selection}
              disabled={
                save.isPending ||
                spaces.isPending ||
                settings.isPending ||
                settings.isError ||
                spaces.isError
              }
              onChange={(event) => {
                setDraft(event.target.value);
                setSaved(false);
                save.reset();
              }}
            >
              <option value="">Off for new conversations</option>
              {confirmed && !choices.some((space) => space.id === confirmed) && (
                <option value={confirmed}>{settings.data?.space?.name ?? "Current space"}</option>
              )}
              {choices.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
            {spaces.isPending && <p role="status">Loading spaces…</p>}
            {spaces.error && (
              <QueryError
                error={spaces.error}
                pending={spaces.isFetching}
                retry={() => void spaces.refetch()}
              />
            )}
            {spaces.hasNextPage && (
              <button
                type="button"
                disabled={spaces.isFetchingNextPage}
                onClick={() => void spaces.fetchNextPage()}
              >
                {spaces.isFetchingNextPage ? "Loading…" : "Load more spaces"}
              </button>
            )}
            {!spaces.isPending && !spaces.error && choices.length === 0 && (
              <p className={sharedStyles.muted}>
                No Learning spaces yet. Create one in Intelligence, then refresh the spaces.
              </p>
            )}
            {choices.length === 0 && !spaces.error && (
              <button
                type="button"
                disabled={spaces.isFetching}
                onClick={() => void spaces.refetch()}
              >
                Refresh spaces
              </button>
            )}
            <p className={sharedStyles.muted}>
              New conversations use this space. Existing conversations keep their assignment.
            </p>
            <div className={learningStyles.learningActions}>
              <button
                type="submit"
                className={sharedStyles.primary}
                disabled={
                  save.isPending ||
                  settings.isPending ||
                  settings.isError ||
                  spaces.isError ||
                  draft === undefined ||
                  (Boolean(settings.data) && selection === confirmed)
                }
              >
                {save.isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={save.isPending || (!editing && draft === undefined)}
                onClick={() => {
                  setDraft(undefined);
                  setEditing(false);
                  save.reset();
                  requestAnimationFrame(() => changeButton.current?.focus());
                }}
              >
                Cancel
              </button>
            </div>
            {!save.isPending &&
              !settings.isPending &&
              !settings.isError &&
              !spaces.isError &&
              selection === confirmed && (
                <p className={sharedStyles.muted}>Choose a different space to enable Save.</p>
              )}
            {save.error && <p role="alert">{save.error.message}</p>}
          </form>
        )}
        {saved && <p role="status">Learning space saved.</p>}
      </div>
      {settings.isPending && <p role="status">Loading Learning…</p>}
      {settings.error && (
        <QueryError
          error={settings.error}
          pending={settings.isFetching}
          retry={() => void settings.refetch()}
        />
      )}
      {editing && (
        <p className={sharedStyles.muted}>Save or cancel your space change to continue.</p>
      )}
      {settings.data?.space ? (
        <div className={learningStyles.learningWork} hidden={editing}>
          <SpaceLearning key={settings.data.space.id} config={config} space={settings.data.space} />
        </div>
      ) : (
        settings.data && (
          <p className={sharedStyles.muted}>
            Choose a space to learn from saved conversations and review Skills.
          </p>
        )
      )}
    </section>
  );
}
