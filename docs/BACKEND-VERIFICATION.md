# Backend refactor verification

Worktree: `refactor/backend-architecture`, based on local main `aa4f9f7`.
The remote was fetched before implementation. Remote main was `a248492` and did
not include the current local starter features. This work preserves those features.
The unrelated main-worktree edit to `MONDAY_CUTOVER_CHECKLIST.md` remains untouched.

## Scope

The implementation replaces manual API dispatch with Hono feature routes and the
shipped CopilotKit v2 Hono adapter. It separates client, server and shared source.
It adds bounded schema validation, explicit service ownership, shutdown cleanup,
API documentation, a requirements/research record and the repository API skill.
AGENTS.md now requires dedicated worktrees and verification after merging to main.

No SDK or Intelligence source, preview pins, installed backend release, shared
deployment or stable publication changed. This starter-only change needs no new
SDK/CLI/chart candidate. Existing preview archive integrity records remain intact.
No upstream PR or weekend stack was merged. No history rewrite was performed.

## Current evidence

Environment: macOS ARM64, Node 22.22.0, pnpm 10.9.0. The frozen install reused the
local package store. The installed CLI backend and configured model supplied live evidence.
Private configuration and raw model events remain ignored.

| Command                                                                                                                                                                                                                  | Result                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                         | Passed after the existing preview-integrity generator restored pnpm's removed archive fields                                                                                   |
| `pnpm skills:sync`                                                                                                                                                                                                       | Passed; generated Intent mappings unchanged                                                                                                                                    |
| `pnpm check`                                                                                                                                                                                                             | Passed lint, design source scan, server/client TypeScript, 171 tests and both builds; 47 existing unsupported persistence-store skips                                          |
| `node --test example/greet.test.js`                                                                                                                                                                                      | Passed                                                                                                                                                                         |
| `FILE_VIEWER_APP_URL=http://127.0.0.1:4293 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4294 pnpm test:e2e`                                                                                                                  | 94 passed, 10 opt-in skips                                                                                                                                                     |
| `PORT=4295 pnpm start`                                                                                                                                                                                                   | Production startup passed; HTML, compiled JavaScript, bootstrap, workspace API, runtime info and text preview returned 200                                                     |
| `LIVE_MODEL=1 FILE_VIEWER_APP_URL=http://127.0.0.1:4295 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4296 pnpm exec playwright test e2e/live-model.spec.ts e2e/live-permissions.spec.ts --output .data/backend-live-results` | Both passed against production output; published Skill load, approvals, saved permission reuse/removal, planning, YOLO and reload without duplicate calls                      |
| `python "$HOME/.codex/skills/.system/skill-creator/scripts/quick_validate.py" .agents/skills/starter-api`                                                                                                                | Passed                                                                                                                                                                         |
| `pnpm format:check`                                                                                                                                                                                                      | Reports two unchanged pre-existing files: `MONDAY_CUTOVER_CHECKLIST.md` and `docs/design/permissions/STUDY.md`. All changed source and documentation pass focused Oxfmt checks |
| `git diff --check`                                                                                                                                                                                                       | Passed                                                                                                                                                                         |

The HTTP regression suite covers JSON media types, malformed JSON, strict input
schemas and oversized bodies without Content-Length. A real Node socket test
proves disconnect propagation to the Fetch request signal. The lifecycle regression
first failed on repeated shutdown with `database is not open`; it now passes.
An import-boundary test found a remaining client import of a server permission
type. The type now lives in `src/shared`, and the boundary checks pass.

Existing runtime tests cover approval resume, cancellation, goals, workspace
isolation and private persistence. Live tests use actual backend conversations and
a previously published Skill. This delivery did not start a new Learning analysis
or test hosted multi-user deployment. It does not claim either result.

The existing large frontend chunk warning and fixture ResizeObserver warnings
remain. Browser assertions passed. Generated screenshots were copied to ignored
`.data/backend-browser-captures` and excluded from this source change.

`FILE_VIEWER_APP_URL=http://127.0.0.1:4293 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4294 pnpm design:browser`
also passed the 28 rendered tool/approval scans across themes and widths.

Final review found that malformed absolute request targets could throw before Hono
received the request. A real HTTP regression reproduced the uncaught URL error.
The Node boundary now returns 400 and continues to serve valid requests.

Final merge results follow after verification.
