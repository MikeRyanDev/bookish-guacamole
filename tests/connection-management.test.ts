import { createServer } from "node:http";
import { once } from "node:events";
import { expect, test } from "vitest";
import { memoryPersistence } from "@tanstack/ai-persistence";
import { memoryCredentialStore } from "@tanstack/ai/byok/server";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { createConnections } from "../src/server/agent/connections.js";
import { createConnectionManagement } from "../src/server/agent/connection-management.js";
import { answer, scriptedAdapter } from "./provider.js";

function fixture() {
  const persistence = memoryPersistence();
  const credentials = memoryCredentialStore();
  const settings = createConnections(persistence.stores.metadata!, { root: process.cwd() });
  const harness = defineHarness({
    name: "connection-management-test",
    adapter: scriptedAdapter(answer),
    plugins: () => [settings.plugin()],
  });
  const host = createHarnessHost({ persistence, credentials });
  const controller = createConnectionManagement({ host, harness, credentials, settings });
  return { host, controller, credentials };
}

test("immediate sign-in cancellation does not open a late sign-in wait", async () => {
  const { host, controller } = fixture();
  try {
    const initial = await controller.read();
    await controller.save({
      ...initial,
      connections: [
        {
          id: "oauth",
          enabled: true,
          transport: { type: "http", url: "http://127.0.0.1:1/mcp", auth: "oauth" },
        },
      ],
    });
    await expect.poll(async () => (await controller.status()).applying).toBe(false);
    await controller.startSignIn("oauth");
    await controller.cancelSignIn();
    expect((await controller.status()).signIn).toBeNull();
  } finally {
    await host.close();
    await controller.close();
  }
});

test("OAuth uses native PKCE callback, keeps tokens private, and forgets tokens when the destination changes", async () => {
  let base = "";
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    const path = request.url!;
    if (path.includes("oauth-protected-resource"))
      return response.end(
        JSON.stringify({ resource: `${base}/mcp`, authorization_servers: [base] }),
      );
    if (path.includes("oauth-authorization-server") || path.includes("openid-configuration"))
      return response.end(
        JSON.stringify({
          issuer: base,
          authorization_endpoint: `${base}/authorize`,
          token_endpoint: `${base}/token`,
          registration_endpoint: `${base}/register`,
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["none"],
        }),
      );
    if (path === "/register") {
      response.statusCode = 201;
      return response.end(
        JSON.stringify({
          client_id: "fixture-client",
          redirect_uris: [],
          token_endpoint_auth_method: "none",
        }),
      );
    }
    if (path === "/token")
      return response.end(
        JSON.stringify({
          access_token: "private-fixture-token",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "private-refresh-token",
        }),
      );
    response.statusCode = 401;
    response.setHeader(
      "WWW-Authenticate",
      `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`,
    );
    response.end(JSON.stringify({ error: "unauthorized" }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No fixture port");
  base = `http://127.0.0.1:${address.port}`;
  const { host, controller, credentials } = fixture();
  try {
    const saved = await controller.save({
      ...(await controller.read()),
      connections: [
        {
          id: "docs",
          enabled: true,
          transport: { type: "http", url: `${base}/mcp`, auth: "oauth" },
        },
      ],
    });
    await expect.poll(async () => (await controller.status()).applying).toBe(false);
    await controller.startSignIn("docs");
    await expect.poll(async () => (await controller.status()).signIn?.status).toBe("waiting");
    await controller.cancelSignIn();
    expect((await controller.status()).signIn).toBeNull();
    expect(await credentials.get({ scope: {}, id: "docs" })).toBeNull();
    await controller.startSignIn("docs");
    await expect.poll(async () => (await controller.status()).signIn?.status).toBe("waiting");
    const url = new URL((await controller.status()).signIn!.url!);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const callback = new URL(url.searchParams.get("redirect_uri")!);
    callback.searchParams.set("code", "fixture-code");
    callback.searchParams.set("state", url.searchParams.get("state")!);
    callback.searchParams.set("iss", base);
    expect((await fetch(callback)).ok).toBe(true);
    await expect.poll(async () => (await controller.status()).signIn?.status).toBe("complete");
    expect(await credentials.get({ scope: {}, id: "docs" })).toMatchObject({
      accessToken: "private-fixture-token",
    });
    expect(JSON.stringify(await controller.status())).not.toContain("private-fixture-token");
    expect(JSON.stringify(await controller.read())).not.toContain("private-fixture-token");
    await controller.save({
      ...saved,
      connections: [
        {
          ...saved.connections[0]!,
          transport: { type: "http", url: `${base}/another`, auth: "oauth" },
        },
      ],
    });
    expect(await credentials.get({ scope: {}, id: "docs" })).toBeNull();
  } finally {
    await host.close();
    await controller.close();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}, 15000);
