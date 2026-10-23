import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const execute = promisify(execFile);

test("restore recovers an apply interrupted before the deployment changed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "image-recovery-"));
  const original = {
    image: "registry.example/app@sha256:original",
    imagePullPolicy: "IfNotPresent",
  };
  const state = {
    node: "k3d-local-abc123-server-0",
    original,
    temporary: { image: "cpki-luna-app-api:123456789", imagePullPolicy: "Never" },
    status: "applied",
  };
  try {
    await mkdir(join(directory, ".data"));
    await mkdir(join(directory, "bin"));
    await writeFile(
      join(directory, ".data/temporary-intelligence-image.json"),
      JSON.stringify(state),
    );
    await writeFile(
      join(directory, "bin/docker"),
      `#!${process.execPath}\nconst args=process.argv.slice(2); if(args.includes('get'))console.log(${JSON.stringify(JSON.stringify({ spec: { template: { spec: { containers: [{ name: "learning-agent", ...original }] } } } }))}); else if(args.includes('rollout'))console.log('ready'); else process.exit(9);\n`,
      { mode: 0o755 },
    );
    const result = await execute(
      process.execPath,
      [resolve("scripts/temporary-intelligence-image.mjs"), "restore"],
      {
        cwd: directory,
        env: { ...process.env, PATH: `${join(directory, "bin")}:${process.env.PATH}` },
      },
    );
    expect(result.stdout).toContain("Restored CLI image");
    expect(
      JSON.parse(await readFile(join(directory, ".data/temporary-intelligence-image.json"), "utf8"))
        .status,
    ).toBe("restored");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
