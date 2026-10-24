import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

test("Learning configuration uses its own model and key and writes a private CLI file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "learning-config-"));
  try {
    await writeFile(
      join(directory, "learning.json"),
      JSON.stringify({
        provider: "compatible",
        model: "custom/my-model",
        baseUrl: "http://host.docker.internal:8000/v1",
        apiKeyEnv: "SEPARATE_KEY",
        contextWindow: 8192,
        maxTokens: 1024,
      }),
    );
    const stdout = execFileSync(process.execPath, [resolve("scripts/write-learning-config.mjs")], {
      cwd: directory,
      env: { ...process.env, SEPARATE_KEY: "private-learning-key" },
      encoding: "utf8",
    });
    const output = join(directory, ".data/learning-model.json");
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual({
      provider: "compatible",
      model: "custom/my-model",
      baseUrl: "http://host.docker.internal:8000/v1",
      apiKey: "private-learning-key",
      contextWindow: 8192,
      maxTokens: 1024,
    });
    expect((await stat(output)).mode & 0o777).toBe(0o600);
    expect(stdout).not.toContain("private-learning-key");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
