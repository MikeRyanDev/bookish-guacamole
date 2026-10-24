# Backend design

Research date: 2026-10-24. This is a local, single-developer coding workspace.
The starter is one application with a browser client and a Node server. Keep one
package manifest and one development command. This application does not need
a monorepo for independent deployments.

## Requirements inventory

| Capability    | Required contract                                                                                                                          | Existing evidence to preserve                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Local access  | Loopback binding; Host and Origin checks before bootstrap, assets, and APIs; ephemeral bearer for all APIs except bootstrap                | `tests/app.test.ts`                                          |
| Configuration | Server-only provider keys; public model catalog; separate coding and Learning configuration; local Intelligence URLs                       | `tests/model.test.ts`, `tests/learning-config.test.ts`       |
| Workspaces    | Canonical stable folder identity; separate agents, roots, logs; remove registry entry without deleting files or conversations              | `tests/workspaces.test.ts`, `tests/workspace-bridge.test.ts` |
| Files         | Private-path and symlink exclusion, bounded descriptor reads, UTF-8 checks; 256 KiB text / 20 MiB asset limits                             | `tests/workspace-api.test.ts`                                |
| Discovery     | 100-entry pages; whole-workspace search; scoped cursors; Git status; cancellation; no silent total-file cutoff                             | `tests/workspace-browse.test.ts`                             |
| Models        | Pinned native adapters and compatible endpoints; persisted per-thread selection; goals use selected model                                  | `tests/model-settings.test.ts`                               |
| Permissions   | Native enforcement; planning separate from preference; per-thread settings; saved workspace rules; atomic metadata revisions               | `tests/permissions.test.ts`, `tests/log-store.test.ts`       |
| Streaming     | CopilotKit v2 owns browser transcript and Intelligence transport; retain outer IDs, one start/terminal, cancellation and approval resume   | `tests/bridge.test.ts`, `tests/coding.test.ts`               |
| Goals         | Native TanStack continuation/judging; persisted state; explicit stop/resume; approval boundaries                                           | `tests/goals.test.ts`                                        |
| Learning      | CLI-installed Intelligence owns durable conversations and Learning; fresh verified Skill snapshot each turn; fail closed on stale snapshot | `tests/skills.test.ts`                                       |
| Lifecycle     | Lazy per-workspace runtimes; release HTTP connections, harness hosts and databases on shutdown; isolated test construction                 | `tests/app.test.ts`, production startup smoke                |
| Browser/build | Vite development and static production assets on one origin; React v2, Router, Query ownership unchanged                                   | `pnpm check`, affected Playwright suite                      |

These are verification targets, not claims that a historical result proves this refactor.
SQLite remains private execution state and workspace metadata. It must not become a second conversation database.
The shell is not a sandbox. Hosted multi-user auth, distributed locking, queues and hosted deployment remain outside this starter's current contract.

## Tooling decision

Use **Hono** for application routes and middleware, **@hono/node-server** for the
Node transport, **@hono/zod-validator** with the pinned Zod for request validation,
and CopilotKit's **createCopilotHonoHandler** for its protocol routes.

Hono's route composition keeps endpoints next to their validation. Its Fetch API
also permits HTTP contract tests without a listening socket. Use ordinary feature
route factories with explicit dependencies. Avoid a controller/service/repository
class for every operation. [Hono guidance](https://hono.dev/docs/guides/best-practices),
[validation](https://hono.dev/docs/guides/validation), and
[testing](https://hono.dev/docs/guides/testing).

The installed SDK exports `@copilotkit/runtime/v2/hono`. Its adapter delegates to
the same Fetch runtime as the Node adapter. Keep that handler responsible for SSE,
stop/connect and protocol errors. Do not parse its bodies through management API
validators or buffer its streams. The adapter has a lazy managed-channel lifecycle;
this starter declares no managed Channels. If adding them, explicitly activate and
close the adapter's channel control on this long-running host.
[CopilotKit adapters](https://docs.copilotkit.ai/a2a/runtime-server-adapter).

Alternatives considered:

- Fastify provides schema validation, serialization and encapsulated plugins. It
  is a strong Node service choice, but Hono matches CopilotKit's shipped adapter
  directly and keeps this small service's handlers Fetch-native.
  [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).
- Bare Node HTTP minimizes dependencies but leaves method dispatch, middleware,
  validation ordering and error conventions to application code. That maintenance
  burden grows with every API. It is not the chosen extension pattern.
- Keep Vite, tsdown, Oxlint, Oxfmt, Vitest and Playwright. This existing
  build pipeline already supports the backend workflow.
- Keep native SQLite adapters. An ORM and migrations framework add another
  persistence abstraction without replacing the harness's storage contracts.

## Source map

- `src/server/main.ts`: process entry, development/static browser serving, signals.
- `src/server/app.ts`: service composition, workspace runtime lifetime, HTTP binding.
- `src/server/http/`: Hono middleware, route composition and API errors.
- `src/server/agent/`: harness, bridge, goals, model and permission settings, Learning.
- `src/server/workspaces/`: registry, discovery, file reads and Git parsing.
- `src/server/storage/`: SQLite execution and metadata adapters.
- `src/client/`: browser entry, components, Query requests, Router and viewers.
- `src/shared/`: browser-safe wire contracts. No filesystem, credentials or service imports.

Use capability names for new files. Extract a service when it owns policy,
state or reusable work. Keep small HTTP translations in the route. Prefer direct
imports over barrel exports. Tests remain under `tests/` and browser scenarios
under `e2e/` so a new contributor can find verification without learning two conventions.

## API conventions

Authenticate before parsing protected input or opening a workspace runtime.
Resolve workspace identifiers through the registry. Validate management JSON with
strict schemas and a 16 KiB transport limit. Keep streaming and binary endpoints
separate. Apply limits to actual bytes, not only Content-Length.
[OWASP resource consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/).

Retain existing URLs and successful response shapes. Errors retain the `error`
field used by the browser; a future externally consumed API can adopt RFC 9457
with an explicit migration. Do not silently switch media type and break clients.
Use meaningful status codes, no-store on local API data, and generic unexpected
errors. Never put credentials, filesystem contents or full request bodies in logs.
[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html).

Keep schemas as executable source. Zod can export JSON Schema if an external
OpenAPI consumer becomes a requirement; do not maintain a second hand-written
schema catalog now. [Zod JSON Schema](https://zod.dev/json-schema).
