import { useIsFetching, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import type { LearningCandidate, LearningRun, LearningSpace } from "../../shared/learning";
import { changeWorkspace, skillsQuery, type AppConfig } from "../api";
import { learningDescription } from "../learning-description";
import learningStyles from "../styles/learning.module.css";
import sharedStyles from "../styles/shared.module.css";
import { IconButton } from "./icon-button";

import { CandidateReview } from "./learning-candidate";
import { learningQuery, pathFor } from "./learning-queries";
import { QueryError } from "./learning-query-error";
import { ReaderHeading, SkillMarkdown } from "./learning-reader";

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
/** Owns run/list queries and the selected document within one Learning space. */
export function SpaceLearning({ config, space }: { config: AppConfig; space: LearningSpace }) {
  const client = useQueryClient();
  const refreshing = useIsFetching({
    predicate: (query) =>
      query.queryKey[1] === config.workspaceId &&
      ["learning", "skills"].includes(String(query.queryKey[0])),
  });
  const [tab, setTab] = useState<"review" | "published">("review");
  const [candidate, setCandidate] = useState<string>();
  const [published, setPublished] = useState<string>();
  const list = useRef<HTMLElement>(null);
  function back() {
    const selected =
      list.current?.querySelector<HTMLButtonElement>(
        `[aria-pressed="true"].${learningStyles.learningSkillRow}`,
      ) ??
      list.current?.querySelector<HTMLButtonElement>(
        `.${learningStyles.learningTabs} button[aria-pressed="true"]`,
      );
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
    <div
      className={`${learningStyles.learningSpaceContent} ${candidate || selectedSkill ? learningStyles.hasSelection : ""}`}
    >
      <nav className={learningStyles.learningLibrary} aria-label="Learning Skills" ref={list}>
        <div className={learningStyles.learningRun}>
          <div className={learningStyles.learningRunLine}>
            <button
              className={learningStyles.learningLearn}
              aria-describedby="learning-run-status learning-run-scope"
              disabled={
                start.isPending ||
                runs.isPending ||
                runs.isError ||
                runs.isFetching ||
                runs.data?.runs.some(activeRun)
              }
              onClick={() => start.mutate()}
            >
              Learn
            </button>
            <div id="learning-run-status" className={learningStyles.learningProgress} role="status">
              {start.isPending ? (
                "Starting Learning…"
              ) : runs.isPending ? (
                "Loading Learning status…"
              ) : runs.isError ? (
                "Status unavailable"
              ) : runs.isFetching ? (
                "Refreshing status…"
              ) : latest ? (
                <>
                  <span>{runLabel[latest.status]}</span>
                  {latest.status === "succeeded" && latest.candidateCount !== null && (
                    <span>
                      {latest.candidateCount} proposed{" "}
                      {latest.candidateCount === 1 ? "Skill" : "Skills"}
                    </span>
                  )}
                </>
              ) : (
                "Ready to learn"
              )}
            </div>
          </div>
          <p id="learning-run-scope" className={sharedStyles.muted}>
            Uses saved conversations in {space.name}.
          </p>
          {start.error && (
            <p role="alert">
              {start.error.message} Use Refresh skills to check the run before trying again.
            </p>
          )}
          {runs.error && (
            <QueryError
              error={runs.error}
              pending={runs.isFetching}
              retry={() => void runs.refetch()}
            />
          )}
          {!runs.error && latest?.status === "failed" && (
            <p className={sharedStyles.muted}>Check Learning in Intelligence, then try again.</p>
          )}
        </div>
        <div className={learningStyles.learningTabs} aria-label="Skills">
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
          <IconButton
            label="Refresh skills"
            disabled={refreshing > 0 || start.isPending}
            onClick={() => {
              start.reset();
              void client.invalidateQueries({
                predicate: (query) =>
                  query.queryKey[1] === config.workspaceId &&
                  ["learning", "skills"].includes(String(query.queryKey[0])),
              });
            }}
          >
            <RefreshCw size={14} />
          </IconButton>
        </div>
        {tab === "review" ? (
          <>
            {proposals.isPending && <p role="status">Loading proposals…</p>}
            {proposals.error && (
              <QueryError
                error={proposals.error}
                pending={proposals.isFetching}
                retry={() => void proposals.refetch()}
              />
            )}
            {proposals.data && pending.length === 0 && (
              <p className={sharedStyles.muted}>
                No Skills need review. A successful Learning run may produce new proposals.
              </p>
            )}
            {pending.map((item) => (
              <button
                className={learningStyles.learningSkillRow}
                aria-pressed={candidate === item.id}
                key={item.id}
                onClick={() => setCandidate(item.id)}
              >
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.operation === "remove"
                      ? "Proposed removal"
                      : learningDescription(item.description)}
                  </small>
                </span>
              </button>
            ))}
          </>
        ) : (
          <>
            {skills.isPending && <p role="status">Loading published Skills…</p>}
            {skills.error && (
              <QueryError
                error={skills.error}
                pending={skills.isFetching}
                retry={() => void skills.refetch()}
              />
            )}
            {skills.data?.skills.length === 0 && (
              <p className={sharedStyles.muted}>
                No published Skills yet. Approve a proposal after reviewing its instructions and
                evidence.
              </p>
            )}
            {skills.data?.skills.map((skill) => (
              <button
                className={learningStyles.learningSkillRow}
                key={skill.name}
                aria-pressed={published === skill.name}
                onClick={() => setPublished(skill.name)}
              >
                <span>
                  <strong>{skill.name}</strong>
                  <small>{learningDescription(skill.description)}</small>
                </span>
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
        <article className={learningStyles.learningReview} key={selectedSkill.name}>
          <ReaderHeading title={selectedSkill.name} back={back} />
          <div
            className={learningStyles.learningDocument}
            tabIndex={0}
            aria-label="Published Skill instructions"
          >
            <p className={["learning-description", sharedStyles.muted].join(" ")}>
              {learningDescription(selectedSkill.description)}
            </p>
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
    <div className={learningStyles.learningReaderEmpty}>
      <h2>{title}</h2>
      <p className={sharedStyles.muted}>{message}</p>
    </div>
  );
}
