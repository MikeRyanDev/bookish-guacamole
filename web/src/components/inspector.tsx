import { lazy, Suspense, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileCode2,
  BookOpen,
  RefreshCw,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Copy,
  Search,
  X,
} from "lucide-react";
import Markdown from "react-markdown";
import { type AppConfig, filesQuery, skillsQuery, request } from "../api";
import { IconButton } from "./icon-button";
import { FileTree } from "./file-tree";
import { FileViewer } from "./file-viewer";
import { viewerKind } from "../viewers/registry";
const AssetViewer = lazy(() =>
  import("../viewers/asset-viewer").then((module) => ({ default: module.AssetViewer })),
);
/** Shows real workspace files and SDK-verified Skill content. */
function WorkspaceInspector({
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
  const queryClient = useQueryClient();
  const kind = viewerKind(file ?? "");
  const [downloadFallback, setDownloadFallback] = useState<string>();
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<{ path: string; text: string }>();
  const searchInput = useRef<HTMLInputElement>(null);
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
    enabled: panel === "files" && Boolean(file) && kind === "text",
    staleTime: 1000,
  });
  const state = panel === "files" ? files : skills;
  const paths = (files.data?.files ?? []).filter((path) =>
    path.toLowerCase().includes(filter.toLowerCase()),
  );
  async function copyPath() {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(file);
      setCopyStatus({ path: file, text: "Path copied." });
    } catch {
      setCopyStatus({ path: file, text: "Could not copy the path. Select it and copy manually." });
    }
  }
  return (
    <aside
      className={`inspector ${expanded && panel === "files" ? "inspector-expanded" : ""}`}
      aria-label="Workspace inspector"
    >
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
        <div className="inspector-utilities">
          {panel === "files" && (
            <IconButton
              className="viewer-expansion"
              label={expanded ? "Collapse file viewer" : "Expand file viewer"}
              aria-pressed={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </IconButton>
          )}
          <IconButton
            label="Refresh inspector"
            disabled={state.isFetching}
            onClick={() => {
              void state.refetch();
              if (panel === "files" && file) {
                if (kind === "text") void preview.refetch();
                else
                  void queryClient.invalidateQueries({
                    queryKey: ["asset", config.workspaceId, file],
                  });
              }
            }}
          >
            <RefreshCw size={14} />
          </IconButton>
        </div>
      </header>
      <div
        className={`inspector-body ${panel === "files" ? "file-browser" : ""} ${file ? "has-file" : ""}`}
      >
        {panel === "files" ? (
          <>
            <nav className="file-navigation" aria-label="Workspace files">
              <div className="file-filter">
                <Search size={14} />
                <input
                  ref={searchInput}
                  aria-label="Search files"
                  placeholder="Search files…"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
                {filter && (
                  <IconButton
                    label="Clear file search"
                    onClick={() => {
                      setFilter("");
                      searchInput.current?.focus();
                    }}
                  >
                    <X size={14} />
                  </IconButton>
                )}
              </div>
              {files.isLoading && (
                <p role="status" className="muted">
                  Loading files…
                </p>
              )}
              {files.error && (
                <div role="alert">
                  <p>Could not load files. {files.error.message}</p>
                  <button onClick={() => void files.refetch()}>Retry file list</button>
                </div>
              )}
              <div className="file-list">
                {files.data?.files.length === 0 && !files.data.truncated && (
                  <p className="muted">No files yet.</p>
                )}
                {filter && files.data && !paths.length && (
                  <p className="muted">No files match “{filter}”.</p>
                )}
                {files.data && files.data.files.length > 0 && (
                  <FileTree
                    paths={files.data.files}
                    git={files.data.git}
                    filter={filter}
                    selected={file}
                    onFile={onFile}
                  />
                )}
                {files.data?.git?.available === false && (
                  <p className="muted" role="status">
                    Git status unavailable. Refresh to retry.
                  </p>
                )}
                {files.data?.truncated && (
                  <p className="muted">
                    File listing limited. Search covers only the listed files.
                  </p>
                )}
              </div>
            </nav>
            {file ? (
              <section className="file-preview" aria-label={file}>
                <header className="file-heading">
                  <IconButton
                    label="Back to files"
                    onClick={() => {
                      onFile(undefined);
                      requestAnimationFrame(() => searchInput.current?.focus());
                    }}
                  >
                    <ArrowLeft size={15} />
                  </IconButton>
                  <span className="file-path" title={file}>
                    {file}
                  </span>
                  <IconButton label="Copy file path" onClick={() => void copyPath()}>
                    <Copy size={14} />
                  </IconButton>
                </header>
                {copyStatus?.path === file && (
                  <p role="status" className="reader-feedback">
                    {copyStatus.text}
                  </p>
                )}
                {kind === "text" && preview.isFetching && (
                  <p role="status" className="reader-feedback">
                    {preview.data ? "Refreshing file…" : "Loading file…"}
                  </p>
                )}
                {kind !== "text" || downloadFallback === file ? (
                  <Suspense fallback={<p role="status">Loading viewer…</p>}>
                    <AssetViewer
                      key={file}
                      path={file}
                      workspace={config.workspaceId}
                      token={config.token}
                      kind={kind === "text" ? "unsupported" : kind}
                    />
                  </Suspense>
                ) : preview.error ? (
                  <div className="reader-error" role="alert">
                    <p>Unable to open this file.</p>
                    <p className="muted">
                      It may have moved, or be private, binary, or larger than 256 KiB.
                    </p>
                    <button disabled={preview.isFetching} onClick={() => void preview.refetch()}>
                      Retry file
                    </button>
                    <button onClick={() => setDownloadFallback(file)}>Download original</button>
                  </div>
                ) : (
                  preview.data && (
                    <FileViewer key={file} path={file} content={preview.data.content} />
                  )
                )}
              </section>
            ) : (
              <div className="file-selection-hint muted">Choose a file to read its contents.</div>
            )}
          </>
        ) : (
          <>
            {skills.isLoading && (
              <p role="status" className="muted">
                Loading…
              </p>
            )}
            {skills.error && <p role="alert">{skills.error.message}</p>}
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
    </aside>
  );
}

/** Resets transient viewer controls when the selected workspace changes. */
export function Inspector(props: Parameters<typeof WorkspaceInspector>[0]) {
  return <WorkspaceInspector key={props.config.workspaceId} {...props} />;
}
