import { test, expect } from "@playwright/test";
import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

test("real Intelligence keeps file Undo/Redo, usage, compaction, and read programs coherent", async ({
  page,
}) => {
  test.skip(
    process.env.LIVE_MODEL !== "1" || !process.env.CAPABILITIES_WORKSPACE,
    "Requires an explicitly isolated workspace and model use.",
  );
  test.setTimeout(180_000);
  const historyErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Files changed after"))
      historyErrors.push(message.text());
  });
  const root = resolve(process.env.CAPABILITIES_WORKSPACE!);
  const path = resolve(root, "capabilities-proof.txt");
  await writeFile(path, "before recovery proof\n");
  const config = await (await page.request.get("/api/config")).json();
  const headers = { Authorization: `Bearer ${config.token}` };
  const endpoint = (route: string, thread?: string) =>
    `/api/${route}?workspace=${encodeURIComponent(config.workspaceId)}${thread ? `&thread=${encodeURIComponent(thread)}` : ""}`;
  const get = async (route: string, thread?: string) => {
    const response = await page.request.get(endpoint(route, thread), { headers });
    expect(response.ok()).toBe(true);
    return response.json();
  };
  const initial = await get("execution");
  const originalConnections = await get("connections");
  const save = async (settings: unknown) => {
    const current = await get("execution");
    const response = await page.request.put(endpoint("execution"), {
      headers,
      data: { revision: current.revision, settings },
    });
    expect(response.ok()).toBe(true);
  };
  const send = async (prompt: string) => {
    await page.getByRole("textbox", { name: "Message your coding agent" }).fill(prompt);
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByRole("button", { name: "Stop run" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop run" })).toBeHidden({ timeout: 90_000 });
  };
  try {
    await save({
      ...initial.settings,
      tokenLimit: null,
      costLimit: null,
      codeMode: true,
      autoCompact: false,
      models: Object.fromEntries(
        Object.entries(initial.settings.models).map(([id, value]) => [
          id,
          { ...(value as object), contextWindow: 4096 },
        ]),
      ),
    });
    const added = await page.request.put(endpoint("connections"), {
      headers,
      data: {
        revision: originalConnections.revision,
        connections: [
          ...originalConnections.connections,
          { id: "proof-guide", enabled: true, transport: { type: "example" } },
        ],
      },
    });
    expect(added.ok()).toBe(true);
    await expect
      .poll(
        async () =>
          (await get("connections/status")).connections.find(
            (entry: { id: string }) => entry.id === "proof-guide",
          )?.status,
      )
      .toBe("connected");
    await page.goto("/");
    await send(
      'Use write_file to change only capabilities-proof.txt to exactly "after recovery proof\\n". Do not use bash. Report completion.',
    );
    expect(await readFile(path, "utf8")).toBe("after recovery proof\n");
    const url = page.url();
    const thread = new URL(url).searchParams.get("thread")!;
    const content = await page.locator(".message.assistant .markdown").last().innerText();
    await page.getByRole("button", { name: "Undo last turn", exact: true }).click();
    const undo = page.getByRole("dialog", { name: "Undo last turn?", exact: true });
    await expect(undo).toContainText("capabilities-proof.txt");
    await writeFile(path, "later human edit\n");
    await undo.getByRole("button", { name: "Undo turn", exact: true }).click();
    await expect(undo).toBeVisible();
    await expect(undo).toContainText("Files changed after the recorded turn");
    expect(await readFile(path, "utf8")).toBe("later human edit\n");
    expect(historyErrors).toEqual([]);
    await writeFile(path, "after recovery proof\n");
    await undo.getByRole("button", { name: "Refresh preview", exact: true }).click();
    await undo.getByRole("button", { name: "Undo turn", exact: true }).click();
    await expect(undo).toBeHidden({ timeout: 15_000 });
    expect(await readFile(path, "utf8")).toBe("before recovery proof\n");
    await page.reload();
    await expect(page.locator(".message.assistant .markdown")).toHaveCount(0);
    await page.getByRole("button", { name: "Redo turn", exact: true }).click();
    const redo = page.getByRole("dialog", { name: "Redo last turn?", exact: true });
    await redo.getByRole("button", { name: "Redo turn", exact: true }).click();
    await expect(redo).toBeHidden({ timeout: 15_000 });
    expect(await readFile(path, "utf8")).toBe("after recovery proof\n");
    await page.reload();
    await expect(page.locator(".message.assistant .markdown").last()).toHaveText(content);
    await send(
      "Keep the recovery-proof objective. Reply only acknowledged. Reference data: " +
        "context evidence retained. ".repeat(1600),
    );
    const compact = await page.request.post(endpoint("execution/compact", thread), {
      headers,
      data: {},
    });
    expect(compact.ok()).toBe(true);
    await send(
      "Use execute_typescript to read capabilities-proof.txt and greet.js in one program. Return both contents from the program. Also call the proof-guide documentation tool. Do not edit anything. Explain what you found.",
    );
    for (const group of await page
      .getByRole("region", { name: "Completed tool activity" })
      .getByRole("button")
      .all())
      await group.click();
    await expect(
      page.getByRole("region", { name: "execute_typescript tool call" }).first(),
    ).toBeVisible();
    const state = await get("execution/status", thread);
    expect(state.usage.totalTokens).toBeGreaterThan(1000);
    expect(state.context.status).toBe("ready");
    expect(state.context.summaries).toBeGreaterThan(0);
    const before = state.usage.calls;
    await save({ ...initial.settings, tokenLimit: 1000, costLimit: null, codeMode: true });
    await send("Say one word: done.");
    await expect(page.getByText(/Conversation token limit reached/)).toBeVisible();
    expect((await get("execution/status", thread)).usage.calls).toBe(before);
    await mkdir(".data/capabilities", { recursive: true });
    await writeFile(
      ".data/capabilities/live-capabilities.json",
      JSON.stringify(
        {
          url,
          usage: state.usage,
          context: state.context,
          undoReload: true,
          redoReload: true,
          budgetBlocked: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await save(initial.settings);
    const latest = await get("connections");
    await page.request.put(endpoint("connections"), {
      headers,
      data: { revision: latest.revision, connections: originalConnections.connections },
    });
    await rm(path, { force: true });
  }
});
