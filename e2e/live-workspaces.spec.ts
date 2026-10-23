import { expect, test } from "@playwright/test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

test("named workspaces isolate real files and conversations and retain identity after reopening", async ({
  page,
}) => {
  test.skip(process.env.LIVE_MODEL !== "1", "Uses the configured OpenAI account.");
  test.setTimeout(180_000);
  await mkdir(".data/workspace-proof", { recursive: true });
  const parent = await mkdtemp(resolve(".data/workspace-proof/run-"));
  const projects = await Promise.all(
    ["alpha", "beta"].map(async (label) => {
      const path = join(parent, label);
      await mkdir(path);
      await writeFile(join(path, `${label}.txt`), `${label.toUpperCase()}_WORKSPACE_ONLY`);
      return { name: `${label} ${parent.split("/").at(-1)}`, path, label };
    }),
  );
  const records: { id: string; url: string; name: string; path: string; label: string }[] = [];
  await page.goto("/");
  for (const project of projects) {
    await page.getByRole("button", { name: "Change workspace" }).click();
    await page.getByRole("button", { name: "Create workspace", exact: true }).click();
    await page.getByRole("textbox", { name: "Workspace name" }).fill(project.name);
    await page.getByRole("radio", { name: "Open existing folder" }).check();
    await page.getByRole("textbox", { name: "Existing folder path" }).fill(project.path);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("button", { name: "Change workspace" })).toContainText(
      project.name,
    );
    await expect(
      page.getByRole("button", { name: `${project.label}.txt`, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: `${project.label === "alpha" ? "beta" : "alpha"}.txt`,
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Conversation history" }).getByRole("button"),
    ).toHaveCount(1);
    await page
      .getByRole("textbox", { name: "Message your coding agent" })
      .fill(
        `Read ${project.label}.txt using the file tool. Reply with its exact contents. Do not run shell commands or edit files.`,
      );
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.locator(".message.assistant .markdown").last()).toContainText(
      `${project.label.toUpperCase()}_WORKSPACE_ONLY`,
      { timeout: 60000 },
    );
    await expect(page.getByRole("button", { name: "Stop run" })).toHaveCount(0);
    const url = page.url();
    records.push({ ...project, url, id: new URL(url).searchParams.get("workspace")! });
  }
  const first = records[0]!;
  const mismatched = new URL(first.url);
  mismatched.searchParams.set("workspace", records[1]!.id);
  await page.goto(mismatched.toString());
  await expect(page.getByRole("button", { name: "Change workspace" })).toContainText(
    records[1]!.name,
  );
  await expect(page.getByText(/Thread is owned by a different agent/).first()).toBeVisible();
  await expect(page.locator(".message.assistant .markdown")).toHaveCount(0);
  await page.getByRole("button", { name: "Change workspace" }).click();
  await page.getByRole("button", { name: `Open ${first.name}`, exact: true }).click();
  await expect(page.getByRole("button", { name: "alpha.txt", exact: true })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Conversation history" }).getByRole("button"),
  ).toHaveCount(2);
  await page.goto(first.url);
  await expect(page.locator(".message.assistant .markdown").last()).toContainText(
    "ALPHA_WORKSPACE_ONLY",
  );
  await expect(page.locator(".message.assistant .markdown")).not.toContainText([
    "BETA_WORKSPACE_ONLY",
  ]);
  await page.getByRole("button", { name: "Change workspace" }).click();
  await page.getByRole("button", { name: `Remove ${first.name}`, exact: true }).click();
  await page.getByRole("button", { name: "Remove from list", exact: true }).click();
  await expect(page.getByRole("button", { name: "Change workspace" })).not.toContainText(
    first.name,
  );
  await page.getByRole("button", { name: "Change workspace" }).click();
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await page.getByRole("textbox", { name: "Workspace name" }).fill(first.name);
  await page.getByRole("radio", { name: "Open existing folder" }).check();
  await page.getByRole("textbox", { name: "Existing folder path" }).fill(first.path);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`workspace=${first.id}`));
  await page.goto(first.url);
  await expect(page.locator(".message.assistant .markdown").last()).toContainText(
    "ALPHA_WORKSPACE_ONLY",
  );
  await page.screenshot({
    path: "docs/proof/workspace-isolation.png",
    fullPage: true,
    animations: "disabled",
  });
  await writeFile(".data/workspace-isolation-proof.json", JSON.stringify(records, null, 2));
});
