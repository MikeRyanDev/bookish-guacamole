import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { permissions } from "@tanstack/ai-harness/plugins";
import { defineAIPersistence } from "@tanstack/ai-persistence";
import { openLogStore } from "../src/server/storage/log-store.js";
import { createConversationDefaults } from "../src/server/agent/conversation-defaults.js";
import { createPermissionSettings } from "../src/server/agent/permission-settings.js";
import { scriptedAdapter, answer } from "./provider.js";

test("defaults persist and apply only to new threads, including concurrent initialization", async () => {
  const dir = await mkdtemp(join(tmpdir(), "settings-"));
  const models = { first: scriptedAdapter(answer), second: scriptedAdapter(answer) };
  const harness = defineHarness({
    name: "defaults-test",
    adapter: models.first,
    models,
    plugins: () => [permissions({ root: dir })],
  });
  const open = () => {
    const store = openLogStore(join(dir, "state.sqlite"));
    const host = createHarnessHost({
      persistence: defineAIPersistence({ stores: { log: store.log, metadata: store.metadata } }),
    });
    const defaults = createConversationDefaults({
      metadata: store.metadata,
      models,
      defaultModel: "first",
    });
    return {
      store,
      host,
      defaults,
      settings: createPermissionSettings({
        host,
        harness,
        store,
        root: dir,
        defaults: defaults.read,
      }),
    };
  };
  let current = open();
  try {
    await current.settings.initialize("existing");
    await Promise.all([
      current.defaults.set({ permissions: "bypass" }),
      current.defaults.set({ modelId: "second" }),
    ]);
    await expect(
      current.defaults.set({ modelId: "missing", permissions: "bypass" }),
    ).rejects.toThrow();
    await Promise.all([current.settings.initialize("new"), current.settings.initialize("new")]);
    expect((await current.settings.read("existing")).permissionMode).toBe("acceptEdits");
    expect((await current.settings.read("new")).permissionMode).toBe("bypass");
    for (const [threadId, model] of [
      ["existing", "first"],
      ["new", "second"],
    ]) {
      const session = await current.host.open(harness, { threadId: threadId! });
      expect(session.threadSettings().model).toBe(model);
      await session.close();
    }
    await current.host.close();
    current.store.close();
    current = open();
    expect(await current.defaults.read()).toEqual({ modelId: "second", permissions: "bypass" });
    await current.defaults.set({ modelId: "first", permissions: "acceptEdits" });
    expect((await current.settings.read("new")).permissionMode).toBe("bypass");
  } finally {
    await current.host.close();
    current.store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
