import { lazy, Suspense, useRef, useState } from "react";
import { useQuery, useQueryClient, useIsFetching } from "@tanstack/react-query";
import { RefreshCw, ArrowLeft, Maximize2, Minimize2, Copy, Search, X } from "lucide-react";
import { type AppConfig, request } from "../api";
import { IconButton } from "./icon-button";
import { WorkspaceFileBrowser } from "./workspace-file-browser";
import { FileViewer } from "./file-viewer";
import { viewerKind } from "../viewers/registry";
const AssetViewer = lazy(() =>
  import("../viewers/asset-viewer").then((module) => ({ default: module.AssetViewer })),
);
/** Shows real workspace files. */
function WorkspaceInspector({
  config,
  file,
  onFile,
}: {
  config: AppConfig;
  file?: string;
  onFile: (file?: string) => void;
}) {
  const queryClient = useQueryClient();
  const kind = viewerKind(file ?? "");
  const [downloadFallback, setDownloadFallback] = useState<string>();
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<{ path: string; text: string }>();
  const searchInput = useRef<HTMLInputElement>(null);
  const filesFetching = useIsFetching({ queryKey: ["files", config.workspaceId] });
  const preview = useQuery({
    queryKey: ["file", config.workspaceId, file],
    queryFn: ({ signal }) =>
      request<{ path: string; content: string }>(
        `/api/workspace/file?workspace=${encodeURIComponent(config.workspaceId)}&path=${encodeURIComponent(file ?? "")}`,
        config.token,
        signal,
      ),
    enabled: Boolean(file) && kind === "text",
    staleTime: 1000,
  });
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
      className={`inspector ${expanded ? "inspector-expanded" : ""}`}
      aria-label="Workspace inspector"
    >
      <header className="pane-header">
        <span>Files</span>
        <div className="inspector-utilities">
          <IconButton
            className="viewer-expansion"
            label={expanded ? "Collapse file viewer" : "Expand file viewer"}
            aria-pressed={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </IconButton>
          <IconButton
            label="Refresh inspector"
            disabled={filesFetching > 0}
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ["files", config.workspaceId] });
              if (file) {
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
      <div className={`inspector-body file-browser ${file ? "has-file" : ""}`}>
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
            <div className="file-list">
              <WorkspaceFileBrowser
                config={config}
                filter={filter}
                selected={file}
                onFile={onFile}
              />
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
                preview.data && <FileViewer key={file} path={file} content={preview.data.content} />
              )}
            </section>
          ) : (
            <div className="file-selection-hint muted">Choose a file to read its contents.</div>
          )}
        </>
      </div>
    </aside>
  );
}

/** Resets transient viewer controls when the selected workspace changes. */
export function Inspector(props: Parameters<typeof WorkspaceInspector>[0]) {
  return <WorkspaceInspector key={props.config.workspaceId} {...props} />;
}
