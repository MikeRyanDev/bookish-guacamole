import { expect, test } from "vitest";
import { Hono } from "hono";
import { identityRoutes } from "../src/server/http/worktree-identity.js";

test("identity is absent unless enabled and exposes only startup identity", async () => {
  const disabled = new Hono().route("/", identityRoutes(undefined));
  expect((await disabled.request("/worktree-identity")).status).toBe(404);
  const identity = { root: "/checkout", commit: "abc", instance: "one", kind: "app" as const };
  const enabled = new Hono().route("/", identityRoutes(identity));
  const response = await enabled.request("/worktree-identity");
  expect(await response.json()).toEqual(identity);
  expect(response.headers.get("cache-control")).toBe("no-store");
});

test("production and unmanaged launches do not create an identity", async () => {
  const { vi } = await import("vitest");
  const { readWorktreeIdentity } = await import("../src/server/worktree-identity.js");
  try {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STARTER_WORKTREE_INSTANCE", "managed");
    expect(readWorktreeIdentity("app")).toBeUndefined();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STARTER_WORKTREE_INSTANCE", "");
    expect(readWorktreeIdentity("app")).toBeUndefined();
  } finally {
    vi.unstubAllEnvs();
  }
});
