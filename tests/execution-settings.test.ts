import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { openLogStore } from "../src/server/storage/log-store.js";
import {
  createExecutionSettings,
  executionSettingsSchema,
} from "../src/server/agent/execution-settings.js";

test("execution settings persist, isolate workspaces, and reject stale writes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "execution-settings-"));
  let store = openLogStore(join(dir, "state.sqlite"));
  try {
    let settings = createExecutionSettings(store.metadata, ["coder"]);
    const initial = await settings.read();
    expect(initial.settings).toMatchObject({
      autoCompact: true,
      codeMode: false,
      maxRetries: 3,
      tokenLimit: null,
      costLimit: null,
    });
    expect(initial.settings.models.coder).toEqual({ contextWindow: 32768, prices: null });
    const updated = await settings.save({
      ...initial,
      settings: { ...initial.settings, tokenLimit: 100000 },
    });
    expect(updated.revision).not.toBe(initial.revision);
    await expect(settings.save(initial)).rejects.toThrow(/changed/);
    store.close();
    store = openLogStore(join(dir, "state.sqlite"));
    settings = createExecutionSettings(store.metadata, ["coder", "new-model"]);
    const reloaded = await settings.read();
    expect(reloaded.settings.tokenLimit).toBe(100000);
    expect(reloaded.settings.models["new-model"]?.contextWindow).toBe(32768);
    const other = openLogStore(join(dir, "other.sqlite"));
    try {
      expect(
        (await createExecutionSettings(other.metadata, ["coder"]).read()).settings.tokenLimit,
      ).toBeNull();
    } finally {
      other.close();
    }
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("invalid limits, prices, and unknown settings fail validation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "execution-validation-"));
  const store = openLogStore(join(dir, "state.sqlite"));
  try {
    const settings = createExecutionSettings(store.metadata, ["coder"]);
    const initial = await settings.read();
    for (const patch of [
      { tokenLimit: -1 },
      { costLimit: 0 },
      { maxRetries: 1.5 },
      { secret: "no" },
      { models: { coder: { contextWindow: 1, prices: null } } },
    ]) {
      expect(executionSettingsSchema.safeParse({ ...initial.settings, ...patch }).success).toBe(
        false,
      );
    }
    await expect(
      settings.save({
        ...initial,
        settings: {
          ...initial.settings,
          models: { absent: { contextWindow: 32768, prices: null } },
        },
      }),
    ).rejects.toThrow(/configured model/);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
