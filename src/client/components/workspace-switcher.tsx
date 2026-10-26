import sharedStyles from "../styles/shared.module.css";
import workspaceStyles from "../styles/workspace.module.css";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Terminal,
  ChevronDown,
  Plus,
  FolderOpen,
  Pencil,
  X,
  Check,
  Archive,
  ArrowLeft,
} from "lucide-react";
import { changeWorkspace, workspacesQuery, type AppConfig, type WorkspaceEntry } from "../api";
import { IconButton } from "./icon-button";

type Editor =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "rename" | "remove"; workspace: WorkspaceEntry };
/** Manages named folder identities; a switch mounts a fresh runtime provider in the parent. */
export function WorkspaceSwitcher({
  config,
  disabled,
  onSelect,
}: {
  config: AppConfig;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();
  const workspaces = useQuery(workspacesQuery(config.token));
  const [editor, setEditor] = useState<Editor>({ kind: "list" });
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [mode, setMode] = useState<"create" | "open">("create");
  const [filter, setFilter] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      if (editor.kind === "create")
        return changeWorkspace<WorkspaceEntry>("/api/workspaces", config.token, "POST", {
          name,
          mode,
          ...(path.trim() ? { path: path.trim() } : {}),
        });
      if (editor.kind === "rename")
        return changeWorkspace<WorkspaceEntry>(
          `/api/workspaces/${editor.workspace.id}`,
          config.token,
          "PATCH",
          { name },
        );
      if (editor.kind === "remove") {
        await changeWorkspace(`/api/workspaces/${editor.workspace.id}`, config.token, "DELETE");
        return undefined;
      }
      throw new Error("Choose a workspace action.");
    },
    onSuccess: async (workspace) => {
      const action = editor;
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      if (action.kind === "create" && workspace) {
        dialog.current?.close();
        onSelect(workspace.id);
      } else if (action.kind === "remove" && action.workspace.id === config.workspaceId) {
        const remaining = await queryClient.fetchQuery(workspacesQuery(config.token));
        if (remaining[0]) {
          dialog.current?.close();
          onSelect(remaining[0].id);
        }
      } else {
        await queryClient.invalidateQueries({ queryKey: ["config"] });
        setEditor({ kind: "list" });
      }
    },
  });
  function edit(next: Editor) {
    mutation.reset();
    setEditor(next);
    if (next.kind === "rename") setName(next.workspace.name);
    if (next.kind === "create") {
      setName("");
      setPath("");
      setMode("create");
    }
  }
  return (
    <>
      <button
        className={workspaceStyles.workspacePicker}
        aria-label="Change workspace"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => {
          edit({ kind: "list" });
          dialog.current?.showModal();
        }}
      >
        <Terminal size={16} />
        <span>{config.workspaceName}</span>
        <ChevronDown size={12} />
      </button>
      <dialog
        ref={dialog}
        className={workspaceStyles.workspaceDialog}
        aria-labelledby="workspace-dialog-title"
        onCancel={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
      >
        <header>
          <div className={workspaceStyles.dialogHeading}>
            {editor.kind !== "list" && (
              <IconButton
                label="Back to workspaces"
                disabled={mutation.isPending}
                onClick={() => edit({ kind: "list" })}
              >
                <ArrowLeft size={16} />
              </IconButton>
            )}
            <h2 id="workspace-dialog-title">
              {editor.kind === "list"
                ? "Workspaces"
                : editor.kind === "create"
                  ? "New workspace"
                  : editor.kind === "rename"
                    ? "Rename workspace"
                    : "Remove workspace"}
            </h2>
          </div>
          <IconButton
            label="Close workspaces"
            disabled={mutation.isPending}
            onClick={() => dialog.current?.close()}
          >
            <X size={16} />
          </IconButton>
        </header>
        {editor.kind === "list" ? (
          <>
            <label className={sharedStyles.srOnly} htmlFor="workspace-search">
              Search workspaces
            </label>
            <input
              id="workspace-search"
              className={workspaceStyles.workspaceFilter}
              placeholder="Search workspaces…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            {workspaces.isPending && <p role="status">Loading workspaces…</p>}
            {workspaces.error && (
              <p role="alert">
                {workspaces.error.message}
                <button onClick={() => workspaces.refetch()}>Retry</button>
              </p>
            )}
            <div className={workspaceStyles.workspaceList}>
              {workspaces.data
                ?.filter((item) =>
                  `${item.name} ${item.path}`.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className={`${workspaceStyles.workspaceEntry} ${item.id === config.workspaceId ? sharedStyles.selected : ""}`}
                  >
                    <button
                      className={workspaceStyles.workspaceOpen}
                      aria-label={`Open ${item.name}`}
                      onClick={() => {
                        dialog.current?.close();
                        onSelect(item.id);
                      }}
                    >
                      <FolderOpen size={17} />
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.path}</small>
                      </span>
                      {item.id === config.workspaceId && <Check size={15} />}
                    </button>
                    <IconButton
                      label={`Rename ${item.name}`}
                      onClick={() => edit({ kind: "rename", workspace: item })}
                    >
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton
                      label={`Remove ${item.name}`}
                      disabled={workspaces.data!.length < 2}
                      onClick={() => edit({ kind: "remove", workspace: item })}
                    >
                      <Archive size={14} />
                    </IconButton>
                  </div>
                ))}
            </div>
            <footer>
              <button
                className={workspaceStyles.workspaceCreate}
                onClick={() => edit({ kind: "create" })}
              >
                <Plus size={16} />
                Create workspace
              </button>
            </footer>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            {editor.kind === "remove" ? (
              <div className={workspaceStyles.workspaceRemoval}>
                <strong>{editor.workspace.name}</strong>
                <p>
                  Files and saved conversations stay on disk. This only removes the workspace from
                  this list. Open the folder again to restore it.
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="workspace-name">Workspace name</label>
                <input
                  id="workspace-name"
                  autoFocus
                  maxLength={80}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={mutation.isPending}
                />
                {editor.kind === "create" && (
                  <>
                    <fieldset className={workspaceStyles.workspaceMode}>
                      <legend>Folder</legend>
                      <label>
                        <input
                          type="radio"
                          name="workspace-mode"
                          checked={mode === "create"}
                          onChange={() => setMode("create")}
                        />
                        Create empty workspace
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="workspace-mode"
                          checked={mode === "open"}
                          onChange={() => setMode("open")}
                        />
                        Open existing folder
                      </label>
                    </fieldset>
                    <label htmlFor="workspace-path">
                      {mode === "open" ? "Existing folder path" : "New folder path (optional)"}
                    </label>
                    <input
                      id="workspace-path"
                      value={path}
                      required={mode === "open"}
                      placeholder="/absolute/path/to/project"
                      onChange={(event) => setPath(event.target.value)}
                      disabled={mutation.isPending}
                    />
                    <p className={sharedStyles.muted}>
                      {mode === "create"
                        ? "Leave the path empty to create a managed folder. Existing folders are never replaced."
                        : "Opens files in this folder for the coding agent. Shell commands still need approval."}
                    </p>
                  </>
                )}
              </>
            )}
            {mutation.error && (
              <p role="alert" className={sharedStyles.inlineError}>
                {mutation.error.message}
              </p>
            )}
            <footer>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => edit({ kind: "list" })}
              >
                Cancel
              </button>
              <button className={sharedStyles.primary} disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Saving…"
                  : editor.kind === "create"
                    ? "Create"
                    : editor.kind === "rename"
                      ? "Save name"
                      : "Remove from list"}
              </button>
            </footer>
          </form>
        )}
      </dialog>
    </>
  );
}
