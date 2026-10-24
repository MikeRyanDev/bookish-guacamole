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
