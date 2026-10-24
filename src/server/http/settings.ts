import { Hono } from "hono";
import { z } from "zod";
import type { ApiDependencies } from "./context.js";
import { managementJson } from "./validation.js";

/** Per-thread settings and workspace permission rules; services enforce native policy. */
export function settingsRoutes({ runtimeFor, selectedWorkspace }: ApiDependencies) {
  const app = new Hono();
  app.get("/defaults", async (c) =>
    c.json(await runtimeFor(selectedWorkspace(new URL(c.req.url))).defaults.read()),
  );
  app.patch(
    "/defaults",
    ...managementJson(
      z
        .object({
          modelId: z.string().min(1).optional(),
          permissions: z.enum(["acceptEdits", "bypass"]).optional(),
        })
        .strict()
        .refine((value) => Object.keys(value).length > 0),
    ),
    async (c) =>
      c.json(
        await runtimeFor(selectedWorkspace(new URL(c.req.url))).defaults.set(c.req.valid("json")),
      ),
  );
  app.get("/model", async (c) => {
    const selected = runtimeFor(selectedWorkspace(new URL(c.req.url)));
    return c.json(await selected.modelSettings.read(c.req.query("thread") ?? ""));
  });
  app.put("/model", ...managementJson(z.object({ modelId: z.string() }).strict()), async (c) => {
    const selected = runtimeFor(selectedWorkspace(new URL(c.req.url)));
    const thread = c.req.query("thread") ?? "";
    await selected.approvalSettings.initialize(thread);
    return c.json(await selected.modelSettings.set(thread, c.req.valid("json").modelId));
  });
  app.get("/approval-mode", async (c) => {
    const settings = runtimeFor(selectedWorkspace(new URL(c.req.url))).approvalSettings;
    return c.json(await settings.read(c.req.query("thread") ?? ""));
  });
  app.put(
    "/approval-mode",
    ...managementJson(
      z.union([
        z.object({ mode: z.string() }).strict(),
        z.object({ permissions: z.enum(["acceptEdits", "bypass"]) }).strict(),
        z.object({ planOnly: z.boolean() }).strict(),
      ]),
    ),
    async (c) => {
      const settings = runtimeFor(selectedWorkspace(new URL(c.req.url))).approvalSettings;
      const thread = c.req.query("thread") ?? "";
      const input = c.req.valid("json");
      return c.json(
        "planOnly" in input
          ? await settings.setPlanOnly(thread, input.planOnly)
          : "permissions" in input
            ? await settings.setPermissions(thread, input.permissions)
            : await settings.set(thread, input.mode),
      );
    },
  );
  app.get("/permissions", async (c) =>
    c.json(await runtimeFor(selectedWorkspace(new URL(c.req.url))).approvalSettings.list()),
  );
  app.delete(
    "/permissions",
    ...managementJson(
      z
        .object({
          tool: z.string().min(1),
          resource: z.string().optional(),
          decision: z.literal("allow"),
          kind: z.enum(["read", "edit", "execute"]).optional(),
        })
        .strict(),
    ),
    async (c) =>
      c.json(
        await runtimeFor(selectedWorkspace(new URL(c.req.url))).approvalSettings.remove(
          c.req.valid("json"),
        ),
      ),
  );
  return app;
}
