import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type {
  LearningCandidateDetail,
  LearningEvidence,
  LearningSpace,
} from "../../shared/learning";
import { changeWorkspace, type AppConfig } from "../api";
import { learningDescription } from "../learning-description";
import learningStyles from "../styles/learning.module.css";
import sharedStyles from "../styles/shared.module.css";

import { learningQuery, pathFor } from "./learning-queries";
import { QueryError } from "./learning-query-error";
import { ReaderHeading, SkillMarkdown } from "./learning-reader";

/** Keeps proposal decisions and supporting evidence scoped to the selected space. */
export function CandidateReview({
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
    <article className={learningStyles.learningReview} aria-label="Skill review">
      <ReaderHeading title={data?.title ?? "Review Skill"} back={back} />
      {data && (
        <div className={learningStyles.learningReaderTabs} aria-label="Review content">
          <button aria-pressed={!evidence} onClick={() => setEvidence(false)}>
            Instructions
          </button>
          <button aria-pressed={evidence} onClick={() => setEvidence(true)}>
            Supporting evidence
          </button>
        </div>
      )}
      <div
        className={learningStyles.learningDocument}
        tabIndex={0}
        aria-label={evidence ? "Supporting evidence" : "Skill instructions"}
      >
        {candidate.isPending && <p role="status">Loading proposal…</p>}
        {candidate.error && (
          <QueryError
            error={candidate.error}
            pending={candidate.isFetching}
            retry={() => {
              void candidate.refetch().then((result) => {
                if (result.isSuccess) review.reset();
              });
            }}
          />
        )}
        {data && (
          <>
            <p className={["learning-description", sharedStyles.muted].join(" ")}>
              {learningDescription(data.description)}
            </p>
            {evidence && <p className={sharedStyles.muted}>{data.reason}</p>}
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
        <footer className={learningStyles.learningDecision}>
          {review.error && (
            <p role="alert">
              {review.error.message} The current review state is refreshed before another decision.
            </p>
          )}
          {data.status === "pending_review" && !review.data && (
            <>
              <p className={sharedStyles.muted} role={review.isPending ? "status" : undefined}>
                {review.isPending
                  ? "Saving review…"
                  : candidate.isError
                    ? "Refresh the proposal before another decision."
                    : candidate.isFetching
                      ? "Refreshing review state…"
                      : `${data.operation === "remove" ? "Approve removes this Skill from" : "Approve publishes to"} ${space.name}.`}
              </p>
              <div className={learningStyles.learningActions}>
                <button
                  disabled={review.isPending || candidate.isFetching || candidate.isError}
                  onClick={() => review.mutate("reject")}
                >
                  Reject skill
                </button>
                <button
                  className={sharedStyles.primary}
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
    <section className={learningStyles.learningEvidence}>
      <p>{insight.statement}</p>
      <p className={sharedStyles.muted}>{insight.impact}</p>
      {sources.isPending && <p role="status">Loading evidence…</p>}
      {sources.error && (
        <QueryError
          error={sources.error}
          pending={sources.isFetching}
          retry={() => void sources.refetch()}
        />
      )}
      {sources.data?.sources.map((source) => (
        <div key={source.id}>
          <h3>{source.label}</h3>
          {(!source.available || source.unavailable) && (
            <p className={sharedStyles.muted}>The source is no longer available.</p>
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
