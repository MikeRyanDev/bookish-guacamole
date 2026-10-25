import { PlatformRequestError } from "@copilotkit/runtime/v2";
import { zValidator } from "@hono/zod-validator";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import type { Context, MiddlewareHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { z } from "zod";
import { WorkspaceError } from "../workspaces/registry.js";
import { FileDiscoveryError } from "../workspaces/discovery.js";

/** Validates bounded management JSON. Never apply this parser to CopilotKit streams. */
export function managementJson<T extends z.ZodType>(schema: T) {
  const mediaType: MiddlewareHandler = async (c, next) => {
    if (c.req.header("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json")
      return c.json({ error: "Send JSON settings." }, 415);
    await next();
  };
  return [
    mediaType,
    bodyLimit({
      maxSize: 16384,
      onError: (c) => c.json({ error: "Settings are too large." }, 413),
    }),
    zValidator("json", schema, (result, c) => {
      if (!result.success) return c.json({ error: "Invalid settings." }, 400);
    }),
  ] as const;
}

/** Keeps expected status codes and prevents unexpected service errors leaking to clients. */
export function handleApiError(error: Error, c: Context) {
  if (error instanceof PlatformRequestError) {
    const messages: Record<number, string> = {
      401: "Intelligence authentication failed. Check the local connection.",
      403: "Learning is unavailable for this project. Check its access and Learning configuration.",
      404: "This Learning space or item is no longer available. Refresh the list.",
      409: "Learning changed or a run is already active. Refresh before trying again.",
      429: "Learning is busy. Wait before trying again.",
    };
    const status = error.status in messages ? error.status : 502;
    return c.json(
      {
        error:
          messages[status] ??
          "Intelligence could not complete this request. Refresh to check its current state.",
      },
      status as ContentfulStatusCode,
    );
  }
  if (error instanceof WorkspaceError || error instanceof FileDiscoveryError)
    return c.json({ error: error.message }, error.status as ContentfulStatusCode);
  if (error instanceof HTTPException)
    return c.json(
      { error: error.status === 400 ? "Settings must be valid JSON." : "Request failed." },
      error.status,
    );
  console.error("Local request failed", { name: error.name });
  return c.json({ error: "Request failed. Check the local server log." }, 500);
}
