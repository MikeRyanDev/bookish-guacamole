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
  let registry: Awaited<ReturnType<typeof openWorkspaceRegistry>> | undefined;
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

test("Learning assignments are isolated, durable, and retained when reopening a workspace", async () => {
  const { root, data, teardown } = await setup();
  let registry: Awaited<ReturnType<typeof openWorkspaceRegistry>> | undefined;
  try {
    registry = await openWorkspaceRegistry(data, root);
    const project = await registry.create({ name: "Second project", mode: "create" });
    expect(registry.getLearningAssignment("default")).toBeUndefined();
    registry.setLearningAssignment("default", "coding-lessons");
    registry.setLearningAssignment(project.id, "project-lessons");
    expect(registry.getLearningAssignment("default")).toBe("coding-lessons");
    registry.close();
    registry = await openWorkspaceRegistry(data, root);
    expect(registry.getLearningAssignment(project.id)).toBe("project-lessons");
    registry.remove(project.id);
    expect(() => registry!.getLearningAssignment(project.id)).toThrow("Workspace not found");
    await registry.create({ name: "Reopened", mode: "open", path: project.path });
    expect(registry.getLearningAssignment(project.id)).toBe("project-lessons");
    registry.setLearningAssignment(project.id, null);
    registry.close();
    registry = await openWorkspaceRegistry(data, root);
    expect(registry.getLearningAssignment(project.id)).toBeNull();
    expect(registry.getLearningAssignment("default")).toBe("coding-lessons");
  } finally {
    registry?.close();
    await teardown();
  }
});

test("Learning assignment rejects unknown workspaces and invalid container IDs without changing saved state", async () => {
  const { root, data, teardown } = await setup();
  const registry = await openWorkspaceRegistry(data, root);
  try {
    registry.setLearningAssignment("default", "valid-space");
    for (const invalid of [
      "",
      " spaced ",
      "UPPER",
      "two--hyphens",
      "-leading",
      "trailing-",
      "a".repeat(65),
      3,
      undefined,
    ]) {
      expect(() => registry.setLearningAssignment("default", invalid)).toThrow("Learning space");
      expect(registry.getLearningAssignment("default")).toBe("valid-space");
    }
    expect(() => registry.setLearningAssignment("missing", "valid-space")).toThrow(
      "Workspace not found",
    );
    registry.setLearningAssignment("default", "a".repeat(64));
    expect(registry.getLearningAssignment("default")).toBe("a".repeat(64));
  } finally {
    registry.close();
    await teardown();
  }
});
