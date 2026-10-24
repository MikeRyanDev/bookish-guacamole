import { ThreadHistory } from "./components/thread-history";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CopilotKit,
  CopilotChatConfigurationProvider,
  useThreads,
} from "@copilotkit/react-core/v2";
import {
  Plus,
  PanelLeft,
  PanelRight,
  Sun,
  Moon,
  Search,
  MessageSquare,
  Settings,
  Command,
  X,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useAppearance } from "./appearance";
import { WorkspacePermissions } from "./components/approval-settings";
import { ConversationDefaults } from "./components/conversation-defaults";
import { AppearanceSettings } from "./components/appearance-settings";
import { workspaceRoute } from "./router";
import { configQuery, type AppConfig } from "./api";
import { IconButton } from "./components/icon-button";
import { Conversation } from "./components/conversation";
import { Inspector } from "./components/inspector";
import { WorkspaceSwitcher } from "./components/workspace-switcher";

/** Bootstraps a single local v2 provider after loading the ephemeral runtime session. */
export function Workspace() {
  const workspace = workspaceRoute.useSearch({ select: (search) => search.workspace });
  const config = useQuery(configQuery(workspace));
  const headers = useMemo(
    () => ({ authorization: `Bearer ${config.data?.token ?? ""}` }),
    [config.data?.token],
  );
  if (config.isPending)
    return (
      <main className="boot" role="status">
        Opening workspace…
      </main>
    );
  if (config.error)
    return (
      <main className="boot">
        <h1>Runtime unavailable</h1>
        <p role="alert">{config.error.message}</p>
        <a href="/">Open default workspace</a>
        <button
          onClick={() => {
            config.refetch();
          }}
        >
          Retry
        </button>
      </main>
    );
  return (
    <CopilotKit
      key={config.data.workspaceId}
      enableInspector={true}
      runtimeUrl={config.data.runtimeUrl}
      headers={headers}
      agentId={config.data.agentId}
    >
      <Shell key={config.data.workspaceId} config={config.data} />
    </CopilotKit>
  );
}
/** Keeps thread/file selections in the URL and transient view controls in React. */
function Shell({ config }: { config: AppConfig }) {
  const search = workspaceRoute.useSearch();
  const navigate = workspaceRoute.useNavigate();
  const [draftThread, setDraftThread] = useState(() => crypto.randomUUID());
  const threadId = search.thread ?? draftThread;
  const [compact, setCompact] = useState(() => matchMedia("(max-width: 850px)").matches);
  const [sidebar, setSidebar] = useState(() => !matchMedia("(max-width: 850px)").matches);
  const [inspector, setInspector] = useState(() => !matchMedia("(max-width: 850px)").matches);
  useEffect(() => {
    const media = matchMedia("(max-width: 850px)");
    const update = () => {
      setCompact(media.matches);
      setSidebar(!media.matches);
      setInspector(!media.matches);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  function toggleSidebar() {
    setSidebar(!sidebar);
    if (compact) setInspector(false);
  }
  function toggleInspector() {
    const openFiles = !inspector || search.panel === "skills";
    setInspector(openFiles);
    if (openFiles && search.panel === "skills")
      void navigate({ search: (previous) => ({ ...previous, panel: "files" }) });
    if (compact) setSidebar(false);
  }
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const onBusy = useCallback((value: boolean) => setBusy(value), []);
  const { theme, accent, setTheme, setAccent } = useAppearance();
  const dialog = useRef<HTMLDialogElement>(null);
  const [modal, setModal] = useState<"commands" | "settings">("commands");
  const threads = useThreads({ agentId: config.agentId, limit: 30 });
  const current = threads.threads.find((thread) => thread.id === threadId);
  function showModal(kind: "commands" | "settings") {
    setModal(kind);
    dialog.current?.showModal();
  }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setModal("commands");
        dialog.current?.showModal();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function newThread() {
    if (busy) return;
    if (compact) setSidebar(false);
    setDraftThread(crypto.randomUUID());
    navigate({ search: (previous) => ({ ...previous, thread: undefined }) });
    dialog.current?.close();
  }
  return (
    <div
      className={`workspace ${!sidebar ? "hide-sidebar" : ""} ${!inspector ? "hide-inspector" : ""}`}
    >
      <a className="skip-link" href="#main">
        Skip to conversation
      </a>
      <header className="workspace-header">
        <div className="header-left">
          <IconButton label="Toggle sessions" aria-pressed={sidebar} onClick={toggleSidebar}>
            <PanelLeft size={17} />
          </IconButton>
          <WorkspaceSwitcher
            config={config}
            disabled={busy}
            onSelect={(workspace) =>
              navigate({
                search: (previous) => ({
                  ...previous,
                  workspace,
                  thread: undefined,
                  file: undefined,
                }),
              })
            }
          />
        </div>
        <div className="header-actions">
          <IconButton label="Command menu" onClick={() => showModal("commands")}>
            <Command size={16} />
          </IconButton>
          <IconButton
            label={theme === "light" ? "Use dark theme" : "Use light theme"}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </IconButton>
          <IconButton label="Settings" onClick={() => showModal("settings")}>
            <Settings size={16} />
          </IconButton>
          <IconButton
            label="Toggle files"
            aria-pressed={inspector && search.panel !== "skills"}
            onClick={toggleInspector}
          >
            <span>Files</span>
          </IconButton>
        </div>
      </header>
      <aside className="sessions" aria-label="Sessions">
        <header className="pane-header">
          <span>Sessions</span>
          <IconButton label="New session" disabled={busy} onClick={newThread}>
            <Plus size={17} />
          </IconButton>
        </header>
        <div className="session-search">
          <Search size={14} />
          <label className="sr-only" htmlFor="session-search">
            Search sessions
          </label>
          <input
            id="session-search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search…"
          />
        </div>
        <ThreadHistory
          items={threads.threads.filter((thread) =>
            (thread.name ?? thread.id).toLowerCase().includes(filter.toLowerCase()),
          )}
          filter={filter}
          loading={threads.isLoading}
          error={threads.error}
          hasMore={threads.hasMoreThreads}
          fetchingMore={threads.isFetchingMoreThreads}
          fetchMoreError={threads.fetchMoreError}
          fetchMore={threads.fetchMoreThreads}
          retry={threads.refetchThreads}
          renderItem={(thread) => (
            <Link
              from="/"
              to="/"
              search={(previous) => ({ ...previous, thread: thread.id })}
              className={`session-row ${thread.id === threadId ? "selected" : ""}`}
              aria-disabled={busy && thread.id !== threadId}
              aria-current={thread.id === threadId ? "page" : undefined}
              onClick={(event) => {
                if (busy && thread.id !== threadId) {
                  event.preventDefault();
                  return;
                }
                if (compact) setSidebar(false);
              }}
            >
              <MessageSquare size={15} />
              <span>{thread.name ?? "Untitled session"}</span>
            </Link>
          )}
        />
      </aside>
      <main id="main" className="main-pane">
        <header className="conversation-header">
          <h1>{current?.name ?? "New session"}</h1>
        </header>
        <CopilotChatConfigurationProvider
          agentId={`${config.agentId}-${threadId}`}
          threadId={threadId}
          hasExplicitThreadId={Boolean(search.thread)}
        >
          <Conversation
            config={config}
            key={threadId}
            threadId={threadId}
            runtimeAgentId={config.agentId}
            existing={Boolean(search.thread)}
            onFirstSend={() =>
              navigate({ search: (previous) => ({ ...previous, thread: threadId }), replace: true })
            }
            onBusyChange={onBusy}
          />
        </CopilotChatConfigurationProvider>
      </main>
      <Inspector
        config={config}
        panel={search.panel}
        file={search.file}
        onPanel={(panel) => navigate({ search: (previous) => ({ ...previous, panel }) })}
        onFile={(file) => navigate({ search: (previous) => ({ ...previous, file }) })}
      />
      <dialog
        ref={dialog}
        className="command-dialog"
        aria-labelledby="command-title"
        onClose={() => setModal("commands")}
      >
        <header>
          <h2 id="command-title">{modal === "commands" ? "Commands" : "Settings"}</h2>
          <IconButton label="Close dialog" onClick={() => dialog.current?.close()}>
            <X size={16} />
          </IconButton>
        </header>
        {modal === "commands" ? (
          <div className="command-list">
            <a
              href="https://tanstack.com/ai/latest/docs/harness/overview"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} />
              Harness documentation
            </a>
            <button disabled={busy} onClick={newThread}>
              <Plus size={16} />
              New session
            </button>
            <button
              onClick={() => {
                setTheme(theme === "light" ? "dark" : "light");
                dialog.current?.close();
              }}
            >
              <Sun size={16} />
              Toggle theme
            </button>
            <button
              onClick={() => {
                toggleInspector();
                dialog.current?.close();
              }}
            >
              <PanelRight size={16} />
              Toggle files
            </button>
            <button
              onClick={() => {
                threads.refetchThreads();
                dialog.current?.close();
              }}
            >
              <RefreshCw size={16} />
              Refresh sessions
            </button>
          </div>
        ) : (
          <div className="settings-content">
            <AppearanceSettings
              theme={theme}
              accent={accent}
              setTheme={setTheme}
              setAccent={setAccent}
            />
            <ConversationDefaults config={config} />
            <WorkspacePermissions config={config} />
          </div>
        )}
      </dialog>
    </div>
  );
}
