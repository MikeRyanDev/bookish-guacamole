import { Hono } from "hono";
import { z } from "zod";
import type { experimental } from "@copilotkit/runtime/v2";
import type {
  LearningCandidate,
  LearningRun,
  WorkspaceLearning,
  LearningCandidateDetail,
  LearningEvidence,
} from "../../shared/learning.js";
import type { ApiDependencies } from "./context.js";
import { WorkspaceError } from "../workspaces/registry.js";
import { managementJson } from "./validation.js";

const containerId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const actionScope = z.object({ containerId }).strict();
const runSummary = ({
  id,
  status,
  createdAt,
  candidateCount,
  failureCode,
}: experimental.LearningRun): LearningRun => ({
  id,
  status,
  createdAt,
  candidateCount,
  failureCode,
});
const candidateSummary = ({
  id,
  title,
  description,
  reason,
  operation,
  status,
}: experimental.LearningCandidate): LearningCandidate => ({
  id,
  title,
  description,
  reason,
  operation,
  status,
});
function objectId(value: string) {
  if (!z.uuid().safeParse(value).success) throw new WorkspaceError("Invalid Learning item.");
  return value;
}

/** Local bearer-protected management; the server retains project credentials and verifies workspace scope. */
export function learningRoutes({
  intelligence,
  learning,
  workspaces,
  selectedWorkspace,
}: ApiDependencies) {
  const app = new Hono();
  function selected(url: string) {
    return selectedWorkspace(new URL(url));
  }
  function requireSpace(url: string, expected?: string) {
    const id = learning.assignment(selected(url).id);
    if (expected !== undefined && id !== expected)
      throw new WorkspaceError(
        "The workspace Learning space changed. Refresh before trying again.",
        409,
      );
    if (!id) throw new WorkspaceError("Choose and save a Learning space first.");
    return id;
  }
  async function settings(workspaceId: string, signal: AbortSignal): Promise<WorkspaceLearning> {
    const id = learning.assignment(workspaceId);
    const space = id
      ? await intelligence.experimental.learning.getLearningContainer({ containerId: id, signal })
      : null;
    return {
      containerId: id,
      inherited: workspaces.getLearningAssignment(workspaceId) === undefined,
      space: space ? { id: space.id, name: space.name } : null,
    };
  }
  app.get("/spaces", async (c) => {
    const cursor = c.req.query("cursor");
    if (cursor !== undefined && !z.string().min(1).max(128).safeParse(cursor).success)
      throw new WorkspaceError("Invalid space cursor.");
    const page = await intelligence.experimental.learning.listLearningContainers({
      cursor,
      signal: c.req.raw.signal,
    });
    return c.json({
      spaces: page.containers.map(({ id, name }) => ({ id, name })),
      nextCursor: page.nextCursor,
    });
  });
  app.get("/", async (c) => c.json(await settings(selected(c.req.url).id, c.req.raw.signal)));
  app.put(
    "/",
    ...managementJson(z.object({ containerId: containerId.nullable() }).strict()),
    async (c) => {
      const workspace = selected(c.req.url);
      const id = c.req.valid("json").containerId;
      const space = id
        ? await intelligence.experimental.learning.getLearningContainer({
            containerId: id,
            signal: c.req.raw.signal,
          })
        : null;
      workspaces.setLearningAssignment(workspace.id, id);
      return c.json({
        containerId: id,
        inherited: false,
        space: space ? { id: space.id, name: space.name } : null,
      } satisfies WorkspaceLearning);
    },
  );
  app.get("/runs", async (c) =>
    c.json({
      runs: (
        await intelligence.experimental.learning.listLearningRuns({
          containerId: requireSpace(c.req.url),
          signal: c.req.raw.signal,
        })
      ).map(runSummary),
    }),
  );
  app.post("/runs", ...managementJson(actionScope), async (c) =>
    c.json(
      {
        run: runSummary(
          await intelligence.experimental.learning.startLearningRun({
            containerId: requireSpace(c.req.url, c.req.valid("json").containerId),
            signal: c.req.raw.signal,
          }),
        ),
      },
      202,
    ),
  );
  app.get("/candidates", async (c) =>
    c.json({
      candidates: (
        await intelligence.experimental.learning.listLearningCandidates({
          containerId: requireSpace(c.req.url),
          signal: c.req.raw.signal,
        })
      ).map(candidateSummary),
    }),
  );
  app.get("/candidates/:id", async (c) => {
    const candidate = await intelligence.experimental.learning.getLearningCandidate({
      containerId: requireSpace(c.req.url),
      candidateId: objectId(c.req.param("id")),
      signal: c.req.raw.signal,
    });
    return c.json({
      ...candidateSummary(candidate),
      files: candidate.bundle.files.map(({ path, content }) => ({ path, content })),
      supportingInsights: candidate.supportingInsights,
    } satisfies LearningCandidateDetail);
  });
  app.post(
    "/candidates/:id/review",
    ...managementJson(actionScope.extend({ action: z.enum(["approve", "reject"]) })),
    async (c) => {
      const input = c.req.valid("json");
      return c.json(
        await intelligence.experimental.learning.reviewLearningCandidate({
          containerId: requireSpace(c.req.url, input.containerId),
          candidateId: objectId(c.req.param("id")),
          action: input.action,
          signal: c.req.raw.signal,
        }),
      );
    },
  );
  app.get("/insights/:id/evidence", async (c) => {
    const evidence = await intelligence.experimental.learning.getLearningInsightEvidence({
      containerId: requireSpace(c.req.url),
      insightId: objectId(c.req.param("id")),
      signal: c.req.raw.signal,
    });
    const sources: LearningEvidence[] = evidence.map((item) =>
      "kind" in item
        ? {
            id: item.trajectoryId,
            label: "Application interactions",
            available: item.trajectoryPresent,
            unavailable: item.unavailable,
            items: item.events.map((event) => ({
              label: event.name,
              content: JSON.stringify(event.value) ?? "",
            })),
          }
        : {
            id: item.threadId,
            label: item.threadName ?? "Saved conversation",
            available: item.threadPresent,
            unavailable: item.unavailable,
            items: item.cited.map((message) => ({ label: message.role, content: message.content })),
          },
    );
    return c.json({ sources });
  });
  return app;
}
