import { useEffect, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { changeWorkspace, request, skillsQuery, type AppConfig } from "../api";
import type {
  LearningSpace,
  WorkspaceLearning,
  LearningRun,
  LearningCandidate,
  LearningCandidateDetail,
  LearningEvidence,
} from "../../shared/learning";

const pathFor = (config: AppConfig, path = "") =>
  `/api/learning${path}?workspace=${encodeURIComponent(config.workspaceId)}`;
function learningQuery<T>(config: AppConfig, path: string, containerId: string | null = null) {
  return queryOptions({
    queryKey: ["learning", config.workspaceId, containerId, path],
    queryFn: ({ signal }) => request<T>(pathFor(config, path), config.token, signal),
    retry: false,
  });
}
function QueryError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="learning-error" role="alert">
      <p>{error.message}</p>
      <button type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}

/** Workspace-scoped settings and actions; confirmed server state stays in Query. */
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
      await Promise.all([
        client.invalidateQueries({ queryKey: ["config"] }),
        client.invalidateQueries({ queryKey: ["skills", config.workspaceId] }),
      ]);
    },
  });
  const choices = spaces.data?.pages.flatMap((page) => page.spaces) ?? [];
  return (
    <section className="learning-panel" aria-label="Workspace Learning">
      <div className="learning-settings">
        {confirmed && !editing ? (
          <div className="learning-assignment-summary">
            <span>
              Learning space <strong>{settings.data?.space?.name ?? "Current space"}</strong>
            </span>
            <button
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
            className="learning-assignment"
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
              <QueryError error={spaces.error} retry={() => void spaces.refetch()} />
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
              <p className="muted">
                No Learning spaces yet. Create one in Intelligence, then refresh.
              </p>
            )}
            <p className="muted">
              New conversations use this space. Existing conversations keep their assignment.
            </p>
            <div className="learning-actions">
              <button
                type="submit"
                className="primary"
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
                }}
              >
                Cancel
              </button>
            </div>
            {save.error && <p role="alert">{save.error.message}</p>}
          </form>
        )}
        {confirmed && !editing && (
          <p className="muted">
            New conversations use this space. Existing conversations keep their assignment.
          </p>
        )}
        {saved && <p role="status">Learning space saved.</p>}
      </div>
      {settings.isPending && <p role="status">Loading Learning…</p>}
      {settings.error && (
        <QueryError error={settings.error} retry={() => void settings.refetch()} />
      )}
      {editing && <p className="muted">Save or cancel your space change to continue.</p>}
      {settings.data?.space ? (
        <div className="learning-work" hidden={editing}>
          <SpaceLearning key={settings.data.space.id} config={config} space={settings.data.space} />
        </div>
      ) : (
        settings.data && (
          <p className="muted">
            Choose a space to learn from saved conversations and review Skills.
          </p>
        )
      )}
    </section>
  );
}
const activeRun = (run: LearningRun) => !["succeeded", "failed"].includes(run.status);
const runLabel: Record<LearningRun["status"], string> = {
  queued: "Learning queued",
  freezing: "Preparing conversations",
  batching: "Finding patterns",
  reducing: "Combining insights",
  finalizing: "Preparing Skills",
  succeeded: "Learning finished",
  failed: "Learning failed",
};
function SpaceLearning({ config, space }: { config: AppConfig; space: LearningSpace }) {
  const client = useQueryClient();
  const [tab, setTab] = useState<"review" | "published">("review");
  const [candidate, setCandidate] = useState<string>();
  const [published, setPublished] = useState<string>();
  const list = useRef<HTMLElement>(null);
  function back() {
    const selected =
      list.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"].learning-skill-row') ??
      list.current?.querySelector<HTMLButtonElement>('.learning-tabs button[aria-pressed="true"]');
    setCandidate(undefined);
    setPublished(undefined);
    requestAnimationFrame(() => selected?.focus());
  }
  const runs = useQuery({
    ...learningQuery<{ runs: LearningRun[] }>(config, "/runs", space.id),
    refetchInterval: (query) => (query.state.data?.runs.some(activeRun) ? 2500 : false),
  });
  const completedRun = runs.data?.runs.find((run) => run.status === "succeeded")?.id;
  const proposalQuery = learningQuery<{ candidates: LearningCandidate[] }>(
    config,
    "/candidates",
    space.id,
  );
  const proposals = useQuery({
    ...proposalQuery,
    queryKey: [...proposalQuery.queryKey, completedRun ?? null],
  });
  const skills = useQuery({
    ...skillsQuery(config.token, config.workspaceId),
    enabled: tab === "published",
  });
  const start = useMutation({
    mutationFn: () =>
      changeWorkspace<{ run: LearningRun }>(pathFor(config, "/runs"), config.token, "POST", {
        containerId: space.id,
      }),
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ["learning", config.workspaceId, space.id] });
    },
  });
  const latest = runs.data?.runs[0];
  const pending =
    proposals.data?.candidates.filter((item) => item.status === "pending_review") ?? [];
  const selectedSkill = skills.data?.skills.find((skill) => skill.name === published);
  return (
    <div className={`learning-space-content${candidate || selectedSkill ? " has-selection" : ""}`}>
      <nav className="learning-library" aria-label="Learning Skills" ref={list}>
        <div className="learning-run">
          <p className="muted">Learning uses saved conversations across this shared space.</p>
          <button
            className="learning-learn"
            disabled={
              start.isPending ||
              runs.isPending ||
              runs.isError ||
              runs.isFetching ||
              runs.data?.runs.some(activeRun)
            }
            onClick={() => start.mutate()}
          >
            {start.isPending ? "Starting Learning…" : "Learn"}
          </button>
          {start.error && (
            <p role="alert">{start.error.message} Refresh status before trying again.</p>
          )}
          {runs.isPending && <p role="status">Loading Learning status…</p>}
          {runs.error && <QueryError error={runs.error} retry={() => void runs.refetch()} />}
          {latest && (
            <div className="learning-progress" role="status">
              <strong>{runLabel[latest.status]}</strong>
              {latest.status === "succeeded" && latest.candidateCount !== null && (
                <span>
                  {latest.candidateCount} proposed{" "}
                  {latest.candidateCount === 1 ? "Skill" : "Skills"}
                </span>
              )}
              {latest.status === "failed" && (
                <span>Check Learning in Intelligence, then try again.</span>
              )}
            </div>
          )}
          {(latest || start.error) && (
            <button disabled={runs.isFetching} onClick={() => void runs.refetch()}>
              Refresh status
            </button>
          )}
        </div>
        <div className="learning-tabs" aria-label="Skills">
          <button
            aria-pressed={tab === "review"}
            onClick={() => {
              setTab("review");
              setCandidate(undefined);
              setPublished(undefined);
            }}
          >
            Review skills{proposals.data ? ` (${pending.length})` : ""}
          </button>
          <button
            aria-pressed={tab === "published"}
            onClick={() => {
              setTab("published");
              setCandidate(undefined);
              setPublished(undefined);
            }}
          >
            Published skills
          </button>
        </div>
        {tab === "review" ? (
          <>
            {proposals.isPending && <p role="status">Loading proposals…</p>}
            {proposals.error && (
              <QueryError error={proposals.error} retry={() => void proposals.refetch()} />
            )}
            {proposals.data && pending.length === 0 && (
              <p className="muted">
                No Skills need review. A successful Learning run may produce new proposals.
              </p>
            )}
            {pending.map((item) => (
              <button
                className="learning-skill-row"
                aria-pressed={candidate === item.id}
                key={item.id}
                onClick={() => setCandidate(item.id)}
              >
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.operation === "remove" ? "Proposed removal" : item.description}
                  </small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </>
        ) : (
          <>
            {skills.isPending && <p role="status">Loading published Skills…</p>}
            {skills.error && (
              <QueryError error={skills.error} retry={() => void skills.refetch()} />
            )}
            {skills.data?.skills.length === 0 && (
              <p className="muted">
                No published Skills yet. Approve a proposal after reviewing its instructions and
                evidence.
              </p>
            )}
            {skills.data?.skills.map((skill) => (
              <button
                className="learning-skill-row"
                key={skill.name}
                aria-pressed={published === skill.name}
                onClick={() => setPublished(skill.name)}
              >
                <span>
                  <strong>{skill.name}</strong>
                  <small>{skill.description}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </>
        )}
      </nav>
      {candidate ? (
        <CandidateReview
          key={candidate}
          config={config}
          space={space}
          candidateId={candidate}
          back={back}
        />
      ) : selectedSkill ? (
        <article className="learning-review" key={selectedSkill.name}>
          <ReaderHeading title={selectedSkill.name} back={back} />
          <div className="learning-document" tabIndex={0} aria-label="Published Skill instructions">
            <p className="muted">{selectedSkill.description}</p>
            <SkillMarkdown content={selectedSkill.content} />
          </div>
        </article>
      ) : (
        <LearningPlaceholder
          tab={tab}
          loading={tab === "review" ? proposals.isPending : skills.isPending}
          failed={tab === "review" ? proposals.isError : skills.isError}
          empty={tab === "review" ? pending.length === 0 : skills.data?.skills.length === 0}
        />
      )}
    </div>
  );
}
/** Mirrors the list state so the reader never suggests selecting an unavailable document. */
function LearningPlaceholder({
  tab,
  loading,
  failed,
  empty,
}: {
  tab: "review" | "published";
  loading: boolean;
  failed: boolean;
  empty: boolean;
}) {
  const title = loading
    ? "Loading Skills…"
    : failed
      ? "Skills unavailable"
      : empty
        ? tab === "review"
          ? "No Skills to review"
          : "No published Skills"
        : tab === "review"
          ? "Review a Skill"
          : "Read a published Skill";
  const message = loading
    ? "The list will appear when the request finishes."
    : failed
      ? "Retry the failed request to load this list."
      : empty
        ? tab === "review"
          ? "Run Learning to create proposals from saved conversations."
          : "Published instructions appear here after you approve a proposal."
        : tab === "review"
          ? "Choose a proposal to read its instructions and supporting evidence before publishing."
          : "Choose a Skill to read the instructions available to conversations in this space.";
  return (
    <div className="learning-reader-empty">
      <h2>{title}</h2>
      <p className="muted">{message}</p>
    </div>
  );
}
function CandidateReview({
  config,
  space,
  candidateId,
  back,
}: {
  config: AppConfig;
  space: LearningSpace;
  candidateId: string;
  back: () => void;
}) {
  const client = useQueryClient();
  const candidate = useQuery(
    learningQuery<LearningCandidateDetail>(config, `/candidates/${candidateId}`, space.id),
  );
  const [evidence, setEvidence] = useState(false);
  const review = useMutation({
    mutationFn: (action: "approve" | "reject") =>
      changeWorkspace<{ status: "approved" | "rejected" }>(
        pathFor(config, `/candidates/${candidateId}/review`),
        config.token,
        "POST",
        { containerId: space.id, action },
      ),
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["learning", config.workspaceId, space.id] }),
        client.invalidateQueries({ queryKey: ["skills", config.workspaceId] }),
      ]);
    },
  });
  const data = candidate.data;
  return (
    <article className="learning-review" aria-label="Skill review">
      <ReaderHeading title={data?.title ?? "Review Skill"} back={back} />
      {data && (
        <div className="learning-reader-tabs" aria-label="Review content">
          <button aria-pressed={!evidence} onClick={() => setEvidence(false)}>
            Instructions
          </button>
          <button aria-pressed={evidence} onClick={() => setEvidence(true)}>
            Supporting evidence
          </button>
        </div>
      )}
      <div
        className="learning-document"
        tabIndex={0}
        aria-label={evidence ? "Supporting evidence" : "Skill instructions"}
      >
        {candidate.isPending && <p role="status">Loading proposal…</p>}
        {candidate.error && (
          <QueryError error={candidate.error} retry={() => void candidate.refetch()} />
        )}
        {data && (
          <>
            <p className="muted">{data.reason}</p>
            {data.operation === "remove" && <p>This proposal removes the published Skill.</p>}
            {evidence ? (
              data.supportingInsights.length ? (
                data.supportingInsights.map((insight) => (
                  <Evidence key={insight.id} config={config} space={space} insight={insight} />
                ))
              ) : (
                <p>No supporting evidence was returned.</p>
              )
            ) : data.files.length ? (
              data.files.map((file) => (
                <section key={file.path} aria-label={file.path}>
                  {file.path !== "SKILL.md" && <h3>{file.path}</h3>}
                  {file.path.endsWith(".md") ? (
                    <SkillMarkdown content={file.content} />
                  ) : (
                    <pre>{file.content}</pre>
                  )}
                </section>
              ))
            ) : (
              <p>No instruction files were returned.</p>
            )}
          </>
        )}
      </div>
      {data && (
        <footer className="learning-decision">
          {review.error && (
            <p role="alert">
              {review.error.message} The current review state is refreshed before another decision.
            </p>
          )}
          {data.status === "pending_review" && !review.data && (
            <>
              <p className="muted" role={review.isPending ? "status" : undefined}>
                {review.isPending
                  ? "Saving review…"
                  : `${data.operation === "remove" ? "Approve removes this Skill from" : "Approve publishes to"} ${space.name}.`}
              </p>
              <div className="learning-actions">
                <button
                  disabled={review.isPending || candidate.isFetching || candidate.isError}
                  onClick={() => review.mutate("reject")}
                >
                  Reject skill
                </button>
                <button
                  className="primary"
                  disabled={review.isPending || candidate.isFetching || candidate.isError}
                  onClick={() => review.mutate("approve")}
                >
                  Approve skill
                </button>
              </div>
            </>
          )}
          {(review.data?.status ?? data.status) === "approved" && (
            <p role="status">
              {data.operation === "remove"
                ? `Approved. Removed from ${space.name}.`
                : `Approved. Published to ${space.name}.`}
            </p>
          )}
          {(review.data?.status ?? data.status) === "rejected" && (
            <p role="status">Rejected. This proposal was not published.</p>
          )}
        </footer>
      )}
    </article>
  );
}
/** Moves keyboard focus into each newly selected document without scrolling the dialog. */
function ReaderHeading({ title, back }: { title: string; back: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  return (
    <header className="learning-reader-heading">
      <button className="learning-back" onClick={back}>
        <ArrowLeft size={15} />
        Back to skills
      </button>
      <h2 ref={heading} tabIndex={-1}>
        {title}
      </h2>
    </header>
  );
}
/** Renders complete Skill source, keeping YAML metadata inspectable without treating it as a heading. */
function SkillMarkdown({ content }: { content: string }) {
  const metadata = content.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  return (
    <>
      <div className="markdown">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{ h1: "h3", h2: "h4", h3: "h5", h4: "h6", h5: "h6" }}
        >
          {metadata ? content.slice(metadata[0].length) : content}
        </Markdown>
      </div>
      {metadata && (
        <details className="learning-metadata">
          <summary>Skill metadata</summary>
          <pre>{metadata[0]}</pre>
        </details>
      )}
    </>
  );
}
function Evidence({
  config,
  space,
  insight,
}: {
  config: AppConfig;
  space: LearningSpace;
  insight: LearningCandidateDetail["supportingInsights"][number];
}) {
  const sources = useQuery(
    learningQuery<{ sources: LearningEvidence[] }>(
      config,
      `/insights/${insight.id}/evidence`,
      space.id,
    ),
  );
  return (
    <section className="learning-evidence">
      <p>{insight.statement}</p>
      <p className="muted">{insight.impact}</p>
      {sources.isPending && <p role="status">Loading evidence…</p>}
      {sources.error && <QueryError error={sources.error} retry={() => void sources.refetch()} />}
      {sources.data?.sources.map((source) => (
        <div key={source.id}>
          <h3>{source.label}</h3>
          {(!source.available || source.unavailable) && (
            <p className="muted">The source is no longer available.</p>
          )}
          {source.items.map((item, index) => (
            <blockquote key={index}>
              <small>{item.label}</small>
              <p>{item.content}</p>
            </blockquote>
          ))}
        </div>
      ))}
    </section>
  );
}
