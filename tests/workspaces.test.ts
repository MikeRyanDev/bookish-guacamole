import { mkdtemp, mkdir, readFile, writeFile, realpath, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test } from "vitest";
import { openWorkspaceRegistry } from "../src/server/workspaces/registry.js";

/** Keeps registry files and sample projects isolated from the developer's checkout. */
async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "starter-workspaces-"));
  const root = join(directory, "original");
  await mkdir(root);
  return {
    directory,
    root,
    data: join(directory, "data"),
    teardown: () => rm(directory, { recursive: true, force: true }),
  };
}

test("named workspaces survive reopen, rename, and removal without deleting project files", async () => {
  const { root, data, teardown } = await setup();
  let registry;
  try {
    registry = await openWorkspaceRegistry(data, root);
    const original = registry.list()[0]!;
    expect(original.id).toBe("default");
    const project = await registry.create({ name: "Client project", mode: "create" });
    await writeFile(join(project.path, "important.txt"), "keep my work");
    registry.rename(project.id, "Renamed project");
    registry.close();
    registry = await openWorkspaceRegistry(data, root);

    expect(registry.get(project.id).name).toBe("Renamed project");
    expect(registry.list()).toHaveLength(2);
    registry.remove(project.id);
    expect(registry.list()).toHaveLength(1);
    expect(await readFile(join(project.path, "important.txt"), "utf8")).toBe("keep my work");
    const reopened = await registry.create({
      name: "Reopened project",
      mode: "open",
      path: project.path,
    });
    expect(reopened.id).toBe(project.id);
    expect(reopened.path).toBe(await realpath(project.path));
    expect(registry.get(original.id).path).toBe(await realpath(root));
  } finally {
    registry?.close();
    await teardown();
  }
});
