import { request as httpRequest } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { createModelCatalog } from "../src/model.js";
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
  const app = await startApp({
    models: createModelCatalog({
      defaultModel: "test",
      models: [
        {
          id: "test",
          label: "Test",
          provider: "openai",
          model: "test-model",
          apiKeyEnv: "OPENAI_API_KEY",
        },
      ],
    }),
    dataDirectory: join(directory, "data"),
  });
  const origin = new URL(app.runtimeUrl).origin;
  try {
    const response = await fetch(origin + "/api/config");
    const config = await response.json();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(config.defaultModel).toBe("test");
    expect(config.model).toBe("test-model");
    expect(config.models).toEqual([
      { id: "test", label: "Test", provider: "openai", model: "test-model" },
    ]);
    expect(JSON.stringify(config)).not.toContain("private-test");
    const newThreadHeaders = {
      authorization: `Bearer ${app.token}`,
      "content-type": "application/json",
    };
    await fetch(origin + "/api/model?thread=model-first", {
      method: "PUT",
      headers: newThreadHeaders,
      body: JSON.stringify({ modelId: "test" }),
    });
    expect(
      await (
        await fetch(origin + "/api/approval-mode?thread=model-first", { headers: newThreadHeaders })
      ).json(),
    ).toMatchObject({ mode: "acceptEdits" });
    const modelUrl = origin + "/api/model?thread=model-api-test";
    expect((await fetch(modelUrl)).status).toBe(401);
    const modelHeaders = {
      authorization: `Bearer ${app.token}`,
      "content-type": "application/json",
    };
    expect(await (await fetch(modelUrl, { headers: modelHeaders })).json()).toMatchObject({
      modelId: "test",
    });
    expect(
      await (
        await fetch(origin + "/api/approval-mode?thread=model-api-test", { headers: modelHeaders })
      ).json(),
    ).toMatchObject({ mode: "acceptEdits" });
    expect(
      (
        await fetch(modelUrl, {
          method: "PUT",
          headers: modelHeaders,
          body: JSON.stringify({ modelId: "not-configured" }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await fetch(modelUrl, {
          method: "PUT",
          headers: modelHeaders,
          body: JSON.stringify({ modelId: "test", apiKey: "injected" }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await fetch(modelUrl, {
          method: "PUT",
          headers: modelHeaders,
          body: JSON.stringify({ modelId: "test" }),
        })
      ).status,
    ).toBe(200);

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
    for (const path of ["directory?path=", "search?q=example"]) {
      expect((await fetch(origin + "/api/workspace/" + path)).status).toBe(401);
      expect(
        (
          await fetch(origin + "/api/workspace/" + path, {
            headers: { authorization: `Bearer ${app.token}`, origin: "https://untrusted.example" },
          })
        ).status,
      ).toBe(403);
    }
    for (const path of [
      "directory?path=../",
      "directory?path=.git",
      "directory?cursor=invalid",
      "search?q=x&cursor=invalid",
    ]) {
      expect(
        (
          await fetch(origin + "/api/workspace/" + path, {
            headers: { authorization: `Bearer ${app.token}` },
          })
        ).status,
      ).toBe(400);
    }
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
  const app = await startApp({
    models: createModelCatalog({
      defaultModel: "test",
      models: [
        {
          id: "test",
          label: "Test",
          provider: "openai",
          model: "test-model",
          apiKeyEnv: "OPENAI_API_KEY",
        },
      ],
    }),
    dataDirectory: join(directory, "data"),
  });
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
    await writeFile(join(workspace.path, "unique.ts"), "scoped");
    const directoryPage = await (
      await fetch(origin + `/api/workspace/directory?workspace=${workspace.id}`, { headers })
    ).json();
    expect(directoryPage.entries).toContainEqual({ path: "unique.ts", kind: "file" });
    const searchPage = await (
      await fetch(origin + `/api/workspace/search?workspace=${workspace.id}&q=unique`, { headers })
    ).json();
    expect(searchPage.files).toEqual(["unique.ts"]);
    expect(
      (
        await (
          await fetch(origin + "/api/workspace/search?workspace=default&q=unique", { headers })
        ).json()
      ).files,
    ).toEqual([]);
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

test("approval settings require local authentication and preserve conversation scope", async () => {
  const directory = await mkdtemp(join(tmpdir(), "approval-http-"));
  for (const [key, value] of Object.entries({
    OPENAI_API_KEY: "test",
    CPK_INTELLIGENCE_API_KEY: "test",
    INTELLIGENCE_API_URL: "http://localhost:9",
    INTELLIGENCE_GATEWAY_WS_URL: "ws://localhost:9",
    CODING_WORKSPACE: join(directory, "workspace"),
  }))
    vi.stubEnv(key, value);
  const app = await startApp({
    models: createModelCatalog({
      defaultModel: "test",
      models: [
        {
          id: "test",
          label: "Test",
          provider: "openai",
          model: "test-model",
          apiKeyEnv: "OPENAI_API_KEY",
        },
      ],
    }),
    dataDirectory: join(directory, "data"),
  });
  const origin = new URL(app.runtimeUrl).origin;
  const headers = { authorization: `Bearer ${app.token}`, "content-type": "application/json" };
  try {
    for (const path of ["/api/approval-mode?thread=one", "/api/permissions"])
      expect((await fetch(origin + path)).status).toBe(401);
    const url = origin + "/api/approval-mode?workspace=default&thread=one";
    expect(await (await fetch(url, { headers })).json()).toMatchObject({ mode: "acceptEdits" });
    expect(
      (
        await fetch(url, {
          method: "PUT",
          headers: { ...headers, origin: "https://other.example" },
          body: JSON.stringify({ mode: "bypass" }),
        })
      ).status,
    ).toBe(403);
    expect(
      (await fetch(url, { method: "PUT", headers, body: JSON.stringify({ mode: "anything" }) }))
        .status,
    ).toBe(400);
    expect(
      await (
        await fetch(url, { method: "PUT", headers, body: JSON.stringify({ mode: "bypass" }) })
      ).json(),
    ).toMatchObject({ mode: "bypass" });
    for (const [body, expected] of [
      [{ planOnly: true }, { mode: "plan", permissionMode: "bypass", planOnly: true }],
      [
        { permissions: "acceptEdits" },
        { mode: "plan", permissionMode: "acceptEdits", planOnly: true },
      ],
      [{ planOnly: false }, { mode: "acceptEdits", planOnly: false }],
    ]) {
      expect(
        await (await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) })).json(),
      ).toMatchObject(expected!);
    }
    expect(
      await (await fetch(origin + "/api/approval-mode?thread=two", { headers })).json(),
    ).toMatchObject({ mode: "acceptEdits" });
    expect(
      (await fetch(origin + "/api/approval-mode?workspace=missing&thread=one", { headers })).status,
    ).toBe(404);
    expect(
      (
        await fetch(origin + "/api/permissions", {
          method: "DELETE",
          headers,
          body: JSON.stringify({ tool: "bash", decision: "deny" }),
        })
      ).status,
    ).toBe(400);
  } finally {
    await app.close();
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});
