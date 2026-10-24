---
name: starter-api
description: Add or review this starter's Hono HTTP APIs, request validation, local authentication, error handling, and server lifecycle.
---

Read `docs/BACKEND-DESIGN.md` for requirements and tooling decisions. Start from
`src/server/http/` for routes and `src/server/app.ts` for service ownership.
Use Hono route factories with explicit dependencies and inline typed handlers.
Use `@hono/zod-validator` and strict Zod input schemas; avoid handwritten dispatch
chains, generic CRUD frameworks, and duplicated controller classes.

Keep the local Host/Origin boundary before bootstrap, static assets and API work.
Only `/api/config` may return bootstrap credentials without bearer auth. Resolve
workspace IDs through the registry; never trust a client-supplied root or agent ID.
The fixed local user is not a hosted authorization model.

Bound management bodies to 16 KiB before validation, including chunked requests.
Keep CopilotKit protocol bodies and SSE outside management parsers. Delegate those
routes to `createCopilotHonoHandler` from `@copilotkit/runtime/v2/hono`. Preserve
abort signals, outer event identities, stop/resume, and backpressure. Do not wrap
SSE in JSON or replace protocol errors after response headers have been sent.

Preserve existing successful wire shapes and the browser's `{ error: string }`
contract. Send expected errors with their documented status; redact unexpected
failures. Keep responses no-store and binary downloads attachment/nosniff. Never
log tokens, keys, bodies, workspace contents, or raw provider errors.

Put browser-safe wire types in `src/shared/`. The client must not import server
modules, even for types. Keep domain policy in the owning workspace or agent
service; HTTP handlers translate validated input and service results.

For a new endpoint, document its method, path, auth scope, input, output and error
statuses in `docs/API.md`. Cover authorization, malformed input, size limits and
cross-workspace access where relevant. Write a failing regression before changing
behavior. Use Hono request tests for transport policy and a real Node socket for
adapter/disconnect behavior. Run `pnpm check`, the greeting test and affected
browser tests. Model and Learning proof must remain distinct from mocked tests.

Adding a resource means assigning its startup, partial-startup cleanup and shutdown
owner. Do not open databases or start listeners at module import time. Follow the
runtime skill when changing the harness or Intelligence integration.
