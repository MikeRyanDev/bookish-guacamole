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
