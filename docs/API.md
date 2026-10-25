# Local HTTP API

The server binds to loopback. All requests require a local Host and same-origin
Origin when supplied. `GET /api/config` bootstraps the ephemeral bearer; cross-site
bootstrap requests are refused. Every other `/api/` route requires
`Authorization: Bearer <token>`. Restart invalidates the token. Never put it in URLs.
All API responses use `Cache-Control: no-store`.

`workspace` query parameters select a registered workspace. Omitting it selects
the first active workspace for management/file routes. Runtime URLs are returned
by bootstrap; the legacy `/api/copilotkit` is always the default workspace.
`thread` is required for thread settings. Workspace paths are not authorization IDs.

| Method and path                        | Input                                                                                                       | Success                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| GET `/api/config`                      | Optional `workspace`                                                                                        | Token, runtime URL, agent/workspace identity, public models, default model, Learning container |
| GET `/api/workspaces`                  | None                                                                                                        | Workspace entry array                                                                          |
| POST `/api/workspaces`                 | JSON `{ name, mode: "create" \| "open", path? }`                                                            | 201 workspace entry; open requires an absolute existing path                                   |
| PATCH `/api/workspaces/:id`            | JSON `{ name }`                                                                                             | Renamed workspace entry                                                                        |
| DELETE `/api/workspaces/:id`           | None                                                                                                        | `{ removed: true, filesKept: true }`                                                           |
| GET `/api/model`                       | `workspace`, `thread`                                                                                       | Current model selection                                                                        |
| PUT `/api/model`                       | Same query; JSON `{ modelId }`                                                                              | Persisted configured selection                                                                 |
| GET `/api/approval-mode`               | `workspace`, `thread`                                                                                       | Native mode, permission preference and plan state                                              |
| PUT `/api/approval-mode`               | Same query; one of `{ permissions: "acceptEdits" \| "bypass" }`, `{ planOnly: boolean }`, legacy `{ mode }` | Updated settings; applies at the native next-turn boundary                                     |
| GET `/api/permissions`                 | `workspace`                                                                                                 | Native saved workspace permission rules                                                        |
| DELETE `/api/permissions`              | `workspace`; JSON `{ tool, decision: "allow", resource?, kind? }`                                           | Remaining rules after reload boundary                                                          |
| GET `/api/workspace/directory`         | `workspace`, optional `path`, `cursor`                                                                      | Up to 100 entries, optional next cursor, Git metadata                                          |
| GET `/api/workspace/search`            | `workspace`, `q`, optional `cursor`                                                                         | Matching file paths, optional next cursor, Git metadata                                        |
| GET `/api/workspace/files`             | `workspace`                                                                                                 | Legacy complete file listing                                                                   |
| GET `/api/workspace/file`              | `workspace`, `path`                                                                                         | Text preview, limited to 256 KiB                                                               |
| GET `/api/workspace/asset`             | `workspace`, `path`                                                                                         | Exact bytes up to 20 MiB, attachment and nosniff                                               |
| GET `/api/skills`                      | None                                                                                                        | Published Skill catalog, revision and registry status                                          |
| ALL `/api/copilotkit/*`                | CopilotKit protocol                                                                                         | SDK-owned streaming/control responses                                                          |
| ALL `/api/workspaces/:id/copilotkit/*` | CopilotKit protocol                                                                                         | SDK-owned responses scoped to the registered workspace                                         |

Management JSON requires `application/json` (charset parameters accepted), is
limited to 16 KiB including chunked bodies, and rejects unknown properties.
Empty thread IDs, unknown models, invalid modes and invalid cursors return 400.
Invalid JSON/schema returns 400, invalid media type 415, oversized settings 413,
missing bearer 401, invalid Host/Origin 403, and unknown workspaces/routes 404.
Hono also serves HEAD for GET routes. HEAD requires the bearer, including bootstrap.
Other unsupported methods return 404.
Expected management failures return `{ error: string }`; unexpected failures return
a generic 500 without raw exception text. CopilotKit owns its protocol error format.

Read-only file protection includes dot/private paths, outside symlinks, bounded
opened-descriptor reads and UTF-8 checks. Discovery passes request cancellation
to filesystem/Git operations. See [file discovery](FILE-DISCOVERY.md) for cursor
scope and performance limits. Removing a workspace never deletes its files.

Add route contracts here when extending `src/server/http/`. Keep input schemas
executable and shared with a service when that service also accepts untrusted
input. Browser-safe output types belong under `src/shared/`.

## Conversation defaults

`GET /api/defaults?workspace=<id>` reads `{ modelId, permissions }` for the selected workspace.
`PATCH /api/defaults?workspace=<id>` updates one or both fields and returns the confirmed pair.
Both routes require the local bearer token and existing Host/Origin protections.
PATCH accepts a strict nonempty JSON object with `modelId` (a configured model ID)
and/or `permissions` (`acceptEdits` or `bypass`). Management bodies are limited to 16 KiB.
Errors retain `{ error: string }`: 400 invalid input or unknown model, 401 missing/invalid bearer,
403 untrusted Host/Origin, 404 unknown workspace, 413 oversized body, 415 non-JSON body.

Defaults use workspace metadata and persist across restarts. Concurrent field updates
are serialized and merged. New conversation initialization copies the current defaults
into native thread settings once; existing logs, planning state and pending approvals remain unchanged.
If a saved default model is no longer configured, reads use the configured default.
The initial values are the configured model and `acceptEdits`.

## Execution, connections, and recovery

All routes below require the local bearer token and accept the workspace selector.
Thread routes also require a nonempty `thread`. Existing Host/Origin and 16 KiB JSON limits apply.

| Method and path                        | Input                                           | Success                                                                          |
| -------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| GET `/api/execution`                   | Workspace                                       | `{ revision, settings }`                                                         |
| PUT `/api/execution`                   | `{ revision, settings }` from the read contract | Saved settings and new revision                                                  |
| GET `/api/execution/status`            | Workspace and thread                            | `{ usage, context, recovery, status, pending }`                                  |
| POST `/api/execution/compact`          | Workspace and thread; `{}`                      | Scheduled summary acknowledgement                                                |
| GET `/api/connections`                 | Workspace                                       | `{ revision, connections }` without secret values                                |
| PUT `/api/connections`                 | `{ revision, connections }`                     | Saved configuration; application status is separate                              |
| GET `/api/connections/status`          | Workspace                                       | Connection states, tool counts, sign-in state, applying flag, sanitized error    |
| POST `/api/connections/retry`          | `{}`                                            | `{ accepted: true }`                                                             |
| POST `/api/connections/sign-in`        | `{ connectionId }`                              | `{ accepted: true }`; poll status for the sign-in URL                            |
| POST `/api/connections/cancel-sign-in` | `{}`                                            | `{ cancelled: true }`                                                            |
| POST `/api/connections/sign-out`       | `{ connectionId }`                              | `{ accepted: true }`; poll status for completion                                 |
| GET `/api/history`                     | Workspace and thread                            | Undo and Redo previews with availability, revision, files, conflicts, and reason |

Execution settings use the browser-safe contract in `src/shared/execution.ts` and the strict server schema in `execution-settings.ts`.
Connection configuration uses `src/shared/connections.ts` and the strict schema in `connections.ts`.
Revisions provide compare-and-set writes. Stale writes and conflicting operations return 409; invalid settings return 400.
Execution and connection settings persist in workspace metadata. OAuth credentials do not persist across process restarts.

Undo and Redo run through CopilotKit with `forwardedProps.starterHistory = { action, revision }`.
The bridge checks the preview again and emits a deliberate outer `MESSAGES_SNAPSHOT` after native restoration.
Normal harness snapshots remain private. The browser must not mutate its own message array to simulate recovery.
See [execution behavior and limits](EXECUTION.md).

## Workspace Learning

These routes require the local bearer and existing Host/Origin protections.
The server retains the Intelligence project key. Browser input cannot select another project.
The `workspace` query selects a registered workspace.

| Method and path                            | Input                                                         | Result                                           |
| ------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------ |
| GET `/api/learning/spaces`                 | Optional `cursor`                                             | Named spaces and `nextCursor`                    |
| GET `/api/learning`                        | `workspace`                                                   | `{ containerId, inherited, space }`              |
| PUT `/api/learning`                        | `workspace`, `{ containerId: string \| null }`                | Verified, saved assignment                       |
| GET `/api/learning/runs`                   | `workspace`                                                   | Recent run summaries                             |
| POST `/api/learning/runs`                  | `workspace`, `{ containerId }`                                | 202 with the admitted run                        |
| GET `/api/learning/candidates`             | `workspace`                                                   | Proposal summaries                               |
| GET `/api/learning/candidates/:id`         | `workspace`, candidate UUID                                   | Instructions, files, and supporting insights     |
| POST `/api/learning/candidates/:id/review` | `workspace`, `{ containerId, action: "approve" \| "reject" }` | Review outcome                                   |
| GET `/api/learning/insights/:id/evidence`  | `workspace`, insight UUID                                     | Source availability and cited evidence           |
| GET `/api/skills`                          | `workspace`                                                   | Verified published Skills for the assigned space |

Assignment writes verify that the space exists before saving it. Null disables Learning for new conversations.
An absent assignment inherits the application default. Existing conversations retain their backend assignment.
Run and review writes reject a changed workspace assignment with 409 before calling Intelligence.
Bodies are strict JSON objects. Unknown fields, invalid IDs, and invalid cursors return 400.
Intelligence enforces project scope, entitlements, run admission, and candidate review transitions.

Learn starts a run over saved conversations in the selected shared space.
It does not scan workspace files or start a coding session.
Approval publishes the proposal to that space. Rejection leaves it unpublished.
Responses exclude internal job names and project credentials. Evidence remains private to authenticated local users.
Published Skill reads reject stale snapshots. Disabled Learning returns an empty Skill list.
