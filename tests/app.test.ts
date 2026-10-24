import { request as httpRequest } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { startApp } from "../src/app.js";

test("local browser bootstrap refuses cross-origin access and protects workspace APIs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "starter-http-"));
  for (const [key, value] of Object.entries({
    OPENAI_API_KEY: "provider-private-test",
    CPK_INTELLIGENCE_API_KEY: "backend-private-test",
    INTELLIGENCE_API_URL: "http://localhost:9",
    INTELLIGENCE_GATEWAY_WS_URL: "ws://localhost:9",
    CODING_WORKSPACE: join(directory, "workspace"),
  }))
    vi.stubEnv(key, value);
  const app = await startApp({ dataDirectory: join(directory, "data") });
  const origin = new URL(app.runtimeUrl).origin;
  try {
    const response = await fetch(origin + "/api/config");
    const config = await response.json();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(config.model).toBe("gpt-6-luna");
    expect(JSON.stringify(config)).not.toContain("private-test");
    expect(
      (await fetch(origin + "/api/config", { headers: { origin: "https://untrusted.example" } }))
        .status,
    ).toBe(403);
    expect(
      (await fetch(origin + "/api/config", { headers: { "sec-fetch-site": "cross-site" } })).status,
    ).toBe(403);
    const wrongHost = await new Promise<number | undefined>((resolve, reject) => {
      const request = httpRequest(
        origin + "/api/config",
        { headers: { host: "untrusted.example" } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      );
      request.on("error", reject);
      request.end();
    });
    expect(wrongHost).toBe(403);
    expect((await fetch(origin + "/api/workspace/files")).status).toBe(401);
    const asset = origin + "/api/workspace/asset?path=example.png";
    await writeFile(join(app.root, "example.png"), Buffer.from([137, 80, 78, 71, 0, 255]));
    expect((await fetch(asset)).status).toBe(401);
    expect((await fetch(asset + `&token=${app.token}`)).status).toBe(401);
    expect(
      (
        await fetch(asset, {
          headers: { authorization: `Bearer ${app.token}`, origin: "https://untrusted.example" },
        })
      ).status,
    ).toBe(403);
    const downloaded = await fetch(asset, { headers: { authorization: `Bearer ${app.token}` } });
    expect(downloaded.headers.get("cache-control")).toBe("no-store");
    expect(downloaded.headers.get("content-disposition")).toBe("attachment");
    expect(downloaded.headers.get("x-content-type-options")).toBe("nosniff");
    expect([...new Uint8Array(await downloaded.arrayBuffer())]).toEqual([137, 80, 78, 71, 0, 255]);
    expect(
      (await fetch(origin + "/api/workspace/files", { headers: { authorization: "Bearer wrong" } }))
        .status,
    ).toBe(401);
  } finally {
    await app.close();
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});

test("workspace APIs create isolated identities and preserve files when an entry is removed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "starter-workspace-api-"));
  for (const [key, value] of Object.entries({
    OPENAI_API_KEY: "provider-private-test",
    CPK_INTELLIGENCE_API_KEY: "backend-private-test",
    INTELLIGENCE_API_URL: "http://localhost:9",
    INTELLIGENCE_GATEWAY_WS_URL: "ws://localhost:9",
    CODING_WORKSPACE: join(directory, "original"),
  }))
    vi.stubEnv(key, value);
  const app = await startApp({ dataDirectory: join(directory, "data") });
  const origin = new URL(app.runtimeUrl).origin;
  const headers = { authorization: `Bearer ${app.token}`, "content-type": "application/json" };
  try {
    expect((await fetch(origin + "/api/workspaces")).status).toBe(401);
    const created = await fetch(origin + "/api/workspaces", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Second project", mode: "create" }),
    });
    expect(created.status).toBe(201);
    const workspace = await created.json();
    const config = await (await fetch(origin + `/api/config?workspace=${workspace.id}`)).json();
    expect(config.workspaceId).toBe(workspace.id);
    expect(config.agentId).toBe(`coder-${workspace.id}`);
    expect(config.workspace).toBe(workspace.path);
    expect(config.runtimeUrl).toBe(`/api/workspaces/${workspace.id}/copilotkit`);
    const renamed = await fetch(origin + `/api/workspaces/${workspace.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name: "Renamed project" }),
    });
    expect((await renamed.json()).name).toBe("Renamed project");
    const files = await fetch(origin + `/api/workspace/files?workspace=${workspace.id}`, {
      headers,
    });
    expect(await files.json()).toEqual({
      files: [],
      truncated: false,
      git: { available: true, entries: {} },
    });
    expect(
      (await fetch(origin + `/api/workspaces/${workspace.id}`, { method: "DELETE", headers }))
        .status,
    ).toBe(200);
    expect((await fetch(origin + `/api/config?workspace=${workspace.id}`)).status).toBe(404);
    expect(
      (await fetch(origin + "/api/workspaces/default", { method: "DELETE", headers })).status,
    ).toBe(400);
  } finally {
    await app.close();
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});
