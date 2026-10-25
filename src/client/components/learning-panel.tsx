import { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import Markdown from "react-markdown";
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
  const confirmed = settings.data?.containerId ?? "";
  const selection = draft ?? confirmed;
  const save = useMutation({
    mutationFn: (containerId: string | null) =>
      changeWorkspace<WorkspaceLearning>(pathFor(config), config.token, "PUT", { containerId }),
    onSuccess: async (value) => {
      client.setQueryData(learningQuery<WorkspaceLearning>(config, "").queryKey, value);
      setDraft(undefined);
      setSaved(true);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["config"] }),
        client.invalidateQueries({ queryKey: ["skills", config.workspaceId] }),
      ]);
    },
  });
  const choices = spaces.data?.pages.flatMap((page) => page.spaces) ?? [];
  return (
    <section className="learning-panel" aria-label="Workspace Learning">
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
          disabled={save.isPending || spaces.isPending}
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
        {spaces.error && <QueryError error={spaces.error} retry={() => void spaces.refetch()} />}
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
          <p className="muted">No Learning spaces yet. Create one in Intelligence, then refresh.</p>
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
              draft === undefined ||
              (Boolean(settings.data) && selection === confirmed)
            }
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={save.isPending || draft === undefined}
            onClick={() => {
              setDraft(undefined);
              save.reset();
            }}
          >
            Cancel
          </button>
        </div>
        {save.error && <p role="alert">{save.error.message}</p>}
        {saved && <p role="status">Learning space saved.</p>}
      </form>
      {settings.isPending && <p role="status">Loading Learning…</p>}
      {settings.error && (
        <QueryError error={settings.error} retry={() => void settings.refetch()} />
      )}
      {settings.data?.space ? (
        <SpaceLearning key={settings.data.space.id} config={config} space={settings.data.space} />
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
  if (candidate)
    return (
      <CandidateReview
        config={config}
        space={space}
        candidateId={candidate}
        back={() => setCandidate(undefined)}
      />
    );
  return (
    <div className="learning-space-content">
      <div className="learning-run">
        <p className="muted">Learning uses saved conversations across this shared space.</p>
        <button
          className="learning-learn"
          disabled={start.isPending || runs.data?.runs.some(activeRun)}
          onClick={() => start.mutate()}
        >
          {start.isPending ? "Starting Learning…" : "Learn"}
        </button>
        {start.error && (
          <p role="alert">{start.error.message} Refresh status before trying again.</p>
        )}
        {runs.error && <QueryError error={runs.error} retry={() => void runs.refetch()} />}
        {latest && (
          <div className="learning-progress" role="status">
            <strong>{runLabel[latest.status]}</strong>
            {latest.status === "succeeded" && latest.candidateCount !== null && (
              <span>
                {latest.candidateCount} proposed {latest.candidateCount === 1 ? "Skill" : "Skills"}
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
        <button aria-pressed={tab === "review"} onClick={() => setTab("review")}>
          Review skills{proposals.data ? ` (${pending.length})` : ""}
        </button>
        <button aria-pressed={tab === "published"} onClick={() => setTab("published")}>
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
              key={item.id}
              onClick={() => setCandidate(item.id)}
            >
              <span>
                <strong>{item.title}</strong>
                <small>{item.operation === "remove" ? "Proposed removal" : item.description}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </>
      ) : (
        <>
          {skills.isPending && <p role="status">Loading published Skills…</p>}
          {skills.error && <QueryError error={skills.error} retry={() => void skills.refetch()} />}
          {skills.data?.skills.length === 0 && (
            <p className="muted">
              No published Skills yet. Approve a proposal after reviewing its instructions and
              evidence.
            </p>
          )}
          {skills.data?.skills.map((skill) => (
            <details className="skill" key={skill.name}>
              <summary>{skill.name}</summary>
              <p className="muted">{skill.description}</p>
              <div className="markdown">
                <Markdown>{skill.content}</Markdown>
              </div>
            </details>
          ))}
        </>
      )}
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
    <article className="learning-review">
      <button className="learning-back" disabled={review.isPending} onClick={back}>
        <ArrowLeft size={15} />
        Back to skills
      </button>
      {candidate.isPending && <p role="status">Loading proposal…</p>}
      {candidate.error && (
        <QueryError error={candidate.error} retry={() => void candidate.refetch()} />
      )}
      {data && (
        <>
          <h2>{data.title}</h2>
          <p className="muted">{data.reason}</p>
          {data.operation === "remove" && <p>This proposal removes the published Skill.</p>}
          {data.files.map((file) => (
            <section key={file.path} aria-label={file.path}>
              {file.path !== "SKILL.md" && <h3>{file.path}</h3>}
              <div className="markdown">
                {file.path.endsWith(".md") ? (
                  <Markdown components={{ h1: "h3", h2: "h4", h3: "h5", h4: "h6", h5: "h6" }}>
                    {file.content}
                  </Markdown>
                ) : (
                  <pre>{file.content}</pre>
                )}
              </div>
            </section>
          ))}
          <details onToggle={(event) => setEvidence(event.currentTarget.open)}>
            <summary>Supporting evidence</summary>
            {evidence &&
              (data.supportingInsights.length ? (
                data.supportingInsights.map((insight) => (
                  <Evidence key={insight.id} config={config} space={space} insight={insight} />
                ))
              ) : (
                <p>No supporting evidence was returned.</p>
              ))}
          </details>
          {review.error && (
            <p role="alert">
              {review.error.message} The current review state is refreshed before another decision.
            </p>
          )}
          {data.status === "pending_review" && !review.data && (
            <>
              <p className="muted">Approve publishes to {space.name}.</p>
              <div className="learning-actions">
                <button
                  className="primary"
                  disabled={review.isPending || candidate.isFetching || candidate.isError}
                  onClick={() => review.mutate("approve")}
                >
                  Approve
                </button>
                <button
                  disabled={review.isPending || candidate.isFetching || candidate.isError}
                  onClick={() => review.mutate("reject")}
                >
                  Reject
                </button>
              </div>
            </>
          )}
          {review.isPending && <p role="status">Saving review…</p>}
          {(review.data?.status ?? data.status) === "approved" && (
            <p role="status">Approved. Published to {space.name}.</p>
          )}
          {(review.data?.status ?? data.status) === "rejected" && (
            <p role="status">Rejected. This proposal was not published.</p>
          )}
        </>
      )}
    </article>
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
