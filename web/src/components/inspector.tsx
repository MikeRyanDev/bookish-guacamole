import { useQuery } from "@tanstack/react-query";
import { FileCode2, BookOpen, RefreshCw } from "lucide-react";
import Markdown from "react-markdown";
import { type AppConfig, filesQuery, skillsQuery, request } from "../api";
import { IconButton } from "./icon-button";
/** Shows real workspace files and SDK-verified Skill content. */
export function Inspector({
  config,
  panel,
  file,
  onPanel,
  onFile,
}: {
  config: AppConfig;
  panel: "files" | "skills";
  file?: string;
  onPanel: (panel: "files" | "skills") => void;
  onFile: (file?: string) => void;
}) {
  const files = useQuery(filesQuery(config.token, config.workspaceId));
  const skills = useQuery(skillsQuery(config.token));
  const preview = useQuery({
    queryKey: ["file", config.workspaceId, file],
    queryFn: ({ signal }) =>
      request<{ path: string; content: string }>(
        `/api/workspace/file?workspace=${encodeURIComponent(config.workspaceId)}&path=${encodeURIComponent(file ?? "")}`,
        config.token,
        signal,
      ),
    enabled: panel === "files" && Boolean(file),
    staleTime: 1000,
  });
  const state = panel === "files" ? files : skills;
  return (
    <aside className="inspector" aria-label="Workspace inspector">
      <header className="pane-header">
        <div className="tabs">
          <IconButton
            label="Files"
            aria-pressed={panel === "files"}
            onClick={() => onPanel("files")}
          >
            <FileCode2 size={15} />
          </IconButton>
          <IconButton
            label="Learned skills"
            aria-pressed={panel === "skills"}
            onClick={() => onPanel("skills")}
          >
            <BookOpen size={15} />
          </IconButton>
        </div>
        <IconButton
          label="Refresh inspector"
          disabled={state.isFetching}
          onClick={() => {
            state.refetch();
            if (file) preview.refetch();
          }}
        >
          <RefreshCw size={14} />
        </IconButton>
      </header>
      <div className="inspector-body">
        {state.isLoading && (
          <p role="status" className="muted">
            Loading…
          </p>
        )}
        {state.error && <p role="alert">{state.error.message}</p>}
        {panel === "files" ? (
          <>
            <div className="section-title">Workspace</div>
            {files.data?.files.length === 0 && !files.data.truncated && (
              <p className="muted">No files yet.</p>
            )}
            {files.data?.files.map((path) => (
              <button
                className={`file-row ${file === path ? "selected" : ""}`}
                key={path}
                onClick={() => onFile(file === path ? undefined : path)}
              >
                <FileCode2 size={14} />
                <span>{path}</span>
              </button>
            ))}
            {files.data?.truncated && (
              <p className="muted">File listing limited. Some paths are omitted.</p>
            )}
            {file && (
              <section className="file-preview">
                <header>{file}</header>
                {preview.error ? (
                  <p role="alert">{preview.error.message}</p>
                ) : (
                  <pre>{preview.data?.content ?? "Loading…"}</pre>
                )}
              </section>
            )}
          </>
        ) : (
          <>
            <div className="section-title">
              Injected automatically <span>r{skills.data?.revision ?? "—"}</span>
            </div>
            {skills.data?.skills.length === 0 && <p className="muted">No published Skills yet.</p>}
            {skills.data?.skills.map((skill) => (
              <details className="skill" key={skill.name}>
                <summary>
                  <BookOpen size={14} />
                  {skill.name}
                </summary>
                <p className="muted">{skill.description}</p>
                <div className="markdown">
                  <Markdown>{skill.content}</Markdown>
                </div>
              </details>
            ))}
          </>
        )}
      </div>
      <footer className="inspector-footer">
        <span>{config.model}</span>
        <span>{config.containerId}</span>
      </footer>
    </aside>
  );
}
