import { once } from "node:events";
import { expect, test } from "vitest";
import { Hono } from "hono";
import { z } from "zod";
import { managementJson, handleApiError } from "../src/server/http/validation.js";

function fixture() {
  const app = new Hono();
  app.onError(handleApiError);
  app.post("/settings", ...managementJson(z.object({ name: z.string() }).strict()), (c) =>
    c.json(c.req.valid("json")),
  );
  return app;
}

test("management requests validate media type, malformed JSON, and unknown fields", async () => {
  const app = fixture();
  const send = (body: string, type = "application/json") =>
    app.request("/settings", { method: "POST", headers: { "content-type": type }, body });
  expect((await send('{"name":"ok"}', "application/json; charset=utf-8")).status).toBe(200);
  expect((await send('{"name":"ok"}', "application/json-invalid")).status).toBe(415);
  expect((await send('{"name":')).status).toBe(400);
  const invalid = await send('{"name":"ok","extra":true}');
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({ error: expect.any(String) });
});

test("management bodies are bounded even without Content-Length", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"name":"'));
      controller.enqueue(new TextEncoder().encode("x".repeat(16385)));
      controller.enqueue(new TextEncoder().encode('"}'));
      controller.close();
    },
  });
  const request = new Request("http://localhost/settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    duplex: "half",
  } as RequestInit);
  const result = await fixture().fetch(request);
  expect(result.status).toBe(413);
  expect(await result.json()).toEqual({ error: expect.any(String) });
});

test("the Node adapter propagates a disconnected streaming client to its Fetch signal", async () => {
  const { createServer, request } = await import("node:http");
  const { getRequestListener } = await import("@hono/node-server");
  let disconnected!: () => void;
  const aborted = new Promise<void>((resolve) => {
    disconnected = resolve;
  });
  const app = new Hono();
  app.get(
    "/stream",
    (c) =>
      new Response(
        new ReadableStream({
          start(controller) {
            c.req.raw.signal.addEventListener(
              "abort",
              () => {
                disconnected();
                controller.close();
              },
              { once: true },
            );
            controller.enqueue(new TextEncoder().encode("data: ready\n\n"));
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      ),
  );
  const server = createServer(getRequestListener(app.fetch));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test port");
  try {
    const client = request(`http://127.0.0.1:${address.port}/stream`);
    const response = once(client, "response");
    client.end();
    const [incoming] = await response;
    await once(incoming, "data");
    incoming.destroy();
    await aborted;
  } finally {
    const closed = once(server, "close");
    server.close();
    server.closeAllConnections();
    await closed;
  }
});
