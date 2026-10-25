import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { expect, test, vi } from "vitest";
import { startApp } from "../src/server/app.js";
import { createModelCatalog } from "../src/server/agent/models.js";

test("Learning management is authenticated, validates assignments, and refuses actions against a changed space", async () => {
  const directory = await mkdtemp(join(tmpdir(), "learning-http-"));
  for (const [key, value] of Object.entries({
    OPENAI_API_KEY: "test",
    CPK_INTELLIGENCE_API_KEY: "private-backend-key",
    INTELLIGENCE_API_URL: "http://localhost:9",
    INTELLIGENCE_GATEWAY_WS_URL: "ws://localhost:9",
    CODING_WORKSPACE: join(directory, "workspace"),
  }))
    vi.stubEnv(key, value);
  const space = {
    id: "chosen",
    name: "Coding lessons",
    projectId: 7,
    promptContext: null,
    createdAt: "2026-10-24T00:00:00Z",
    updatedAt: "2026-10-24T00:00:00Z",
  };
  const list = vi
    .spyOn(CopilotKitIntelligence.prototype, "listLearningContainers")
    .mockResolvedValue({ containers: [space], nextCursor: null });
  const get = vi
    .spyOn(CopilotKitIntelligence.prototype, "getLearningContainer")
    .mockResolvedValue(space);
  const start = vi
    .spyOn(CopilotKitIntelligence.prototype, "startLearningRun")
    .mockRejectedValue(new Error("private backend details"));
  const candidateId = "0198a012-a20f-77c0-9e33-8992f18e74a1";
  const review = vi
    .spyOn(CopilotKitIntelligence.prototype, "reviewLearningCandidate")
    .mockResolvedValue({
      candidateId,
      operation: "add",
      status: "approved",
      publishedRegistryRevision: 1,
      publishedSkillId: candidateId,
    });
  const app = await startApp({
    models: createModelCatalog({
      defaultModel: "test",
      models: [
        {
          id: "test",
          label: "Test",
          provider: "openai",
          model: "test",
          apiKeyEnv: "OPENAI_API_KEY",
        },
      ],
    }),
    dataDirectory: join(directory, "data"),
  });
  const origin = new URL(app.runtimeUrl).origin;
  const headers = { authorization: `Bearer ${app.token}`, "content-type": "application/json" };
  const send = (path: string, method = "GET", body?: unknown) =>
    fetch(origin + path, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  try {
    expect((await fetch(origin + "/api/learning/spaces")).status).toBe(401);
    const spaces = await send("/api/learning/spaces");
    expect(spaces.status).toBe(200);
    expect(await spaces.json()).toEqual({
      spaces: [{ id: "chosen", name: "Coding lessons" }],
      nextCursor: null,
    });
    expect(
      (await send("/api/learning?workspace=default", "PUT", { containerId: "../bad" })).status,
    ).toBe(400);
    expect(
      (await send("/api/learning?workspace=missing", "PUT", { containerId: "chosen" })).status,
    ).toBe(404);
    const saved = await send("/api/learning?workspace=default", "PUT", { containerId: "chosen" });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({
      containerId: "chosen",
      inherited: false,
      space: { name: "Coding lessons" },
    });
    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({ containerId: "chosen", signal: expect.any(AbortSignal) }),
    );
    expect(
      (await send("/api/learning/runs?workspace=default", "POST", { containerId: "old" })).status,
    ).toBe(409);
    expect(start).not.toHaveBeenCalled();
    const failure = await send("/api/learning/runs?workspace=default", "POST", {
      containerId: "chosen",
    });
    expect(failure.status).toBe(500);
    expect(JSON.stringify(await failure.json())).not.toContain("private backend details");
    start.mockResolvedValueOnce({
      id: candidateId,
      learningContainerId: "chosen",
      projectId: 7,
      status: "queued",
      triggerSource: "manual",
      attemptCount: 0,
      candidateCount: null,
      insightCount: null,
      createdAt: space.createdAt,
      updatedAt: space.updatedAt,
      startedAt: null,
      completedAt: null,
      failureCode: null,
      kubernetesJobName: "private-job",
    });
    const admitted = await send("/api/learning/runs?workspace=default", "POST", {
      containerId: "chosen",
    });
    expect(admitted.status).toBe(202);
    expect(await admitted.json()).toEqual({
      run: {
        id: candidateId,
        status: "queued",
        createdAt: space.createdAt,
        candidateCount: null,
        failureCode: null,
      },
    });
    const reviewPath = `/api/learning/candidates/${candidateId}/review?workspace=default`;
    expect(
      (await send(reviewPath, "POST", { containerId: "other", action: "approve" })).status,
    ).toBe(409);
    expect(
      (await send(reviewPath, "POST", { containerId: "chosen", action: "approve", projectId: 1 }))
        .status,
    ).toBe(400);
    expect(review).not.toHaveBeenCalled();
    expect(
      (await send(reviewPath, "POST", { containerId: "chosen", action: "approve" })).status,
    ).toBe(200);
    expect(review).toHaveBeenCalledWith({
      containerId: "chosen",
      candidateId,
      action: "approve",
      signal: expect.any(AbortSignal),
    });
    expect(
      (await send("/api/learning?workspace=default", "PUT", { containerId: null })).status,
    ).toBe(200);
    expect(
      (await send("/api/learning/runs?workspace=default", "POST", { containerId: "chosen" }))
        .status,
    ).toBe(409);
  } finally {
    await app.close();
    list.mockRestore();
    get.mockRestore();
    start.mockRestore();
    review.mockRestore();
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});
