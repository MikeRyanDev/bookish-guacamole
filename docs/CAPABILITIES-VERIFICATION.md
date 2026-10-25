# Execution capability verification

Verified on 2026-10-24 in the isolated `feat/agent-capabilities` worktree, based on local `c10d813`.
The original worktree and its user-owned checklist edits were preserved.

## Delivered behavior

Execution settings control durable context summaries, per-model windows and prices, conversation limits, bounded retries, and opt-in code mode.
Connections supports optional native MCP over stdio or HTTP, environment references, OAuth, and a bundled read-only guide.
Usage and one-level Undo/Redo sit beside the conversation. Tracing and Diagnostics are excluded at the user's request.
See [usage and boundaries](EXECUTION.md), [API contracts](API.md), and [design review](design/capabilities/DESIGN-REVIEW.md).

## Deterministic evidence

| Command                                                                                                                                                                                                                                                                                                                                             | Result                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                                                                                                                                                    | Passed; existing reviewed preview integrity pins retained                                                                               |
| `pnpm check`                                                                                                                                                                                                                                                                                                                                        | Passed: lint, source design checks, both TypeScript projects, 200 tests, production builds; 47 declared unsupported-store cases skipped |
| `node --test example/greet.test.js`                                                                                                                                                                                                                                                                                                                 | 1 passed                                                                                                                                |
| `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4254 pnpm test:e2e e2e/capabilities-settings.spec.ts e2e/conversation-capabilities.spec.ts e2e/settings.spec.ts e2e/settings-navigation.spec.ts e2e/composer-discovery.spec.ts e2e/composer.spec.ts e2e/tool-renderers.spec.ts e2e/permissions.spec.ts e2e/goals.spec.ts e2e/capabilities-design.spec.ts` | 42 passed, 2 opt-in tests skipped; includes draft retention, saved focus, stale-connection recovery, and the visual/axe matrix          |
| `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4254 pnpm test:e2e e2e/capabilities-design.spec.ts`                                                                                                                                                                                                                                                       | 6 passed; 36 captures across light/dark and 1440, 390, 320 widths; no axe WCAG AA violations or document overflow                       |
| `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4254 pnpm design:browser`                                                                                                                                                                                                                                                                                 | 1 passed; rendered tools and approvals in both themes and sizes                                                                         |
| `git diff --check`                                                                                                                                                                                                                                                                                                                                  | Passed                                                                                                                                  |

The native tests exercise real harness execution, QuickJS, Git snapshots, stdio MCP, and loopback OAuth with scripted model responses.
They cover stale settings, selected-model price aliases, missing usage, historic accounting, Goal judge budgets, durable context reopen, and policy changes.
They also cover after-turn summary completion, OAuth cancellation while waiting, credential invalidation, external MCP approve/deny, and retry approval continuity.
Undo tests cover human-file conflicts, outer message IDs, failed prompt boundaries, and private recovery-buffer filtering.
Browser tests cover draft retention, save errors, cancellation, keyboard focus, explicit connection activation, unknown cost, and history confirmation.

The code-mode dependent-read benchmark uses real tools and a real isolate with a scripted adapter.
It measures three model calls for direct tools versus two for a program, including the final answer.
It does not measure provider latency or establish universal savings. Independent reads can already be batched directly.

## Live backend and model evidence

The isolated app ran at `127.0.0.1:4253` with the developer's configured model and the existing CLI-installed Intelligence backend.
Only `.data/live-workspace` was used for file changes. Saved execution and connection policies were restored after tests.
No production or shared deployment was changed.

```sh
LIVE_MODEL=1 FILE_VIEWER_APP_URL=http://127.0.0.1:4253 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4254 pnpm test:e2e e2e/live-model.spec.ts
LIVE_MODEL=1 CAPABILITIES_WORKSPACE=.data/live-workspace FILE_VIEWER_APP_URL=http://127.0.0.1:4253 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4254 pnpm test:e2e e2e/live-capabilities.spec.ts
```

Both passed. The first loaded an actual published Learned Skill, completed two separately approved `npm test` calls, and restored without duplicate tools.
The capability test changed a fixture file, rejected Undo after a later human edit, retained the error dialog, then completed Undo and Redo.
Files and the Intelligence transcript matched after browser reloads.
It also ran the local MCP guide and isolated read program, completed a durable summary, and blocked a subsequent model call at the token limit.
The final conversation reported six calls, six usage reports, 50,477 tokens, and one successful summary. Cost correctly remained unknown.
These counts describe this run, not a benchmark or expected bill.

The app process was then stopped and restarted. Authenticated reads retained token totals and summary state; the browser restored the Intelligence transcript.
Native deterministic tests separately prove that compact model context survives harness-host reconstruction.
Raw model events, server logs, browser traces, credentials, configuration, and workspace edits remain ignored under local data paths.

## Usability and visual verdicts

An independent task-first usability reviewer passed Execution, Connections, Usage, and Undo/Redo on desktop and 390×844 mobile.
That review included failed reads/saves, keyboard operation, confirmation consequences, and restored focus.
A follow-up passed price-draft preservation across toggles and keyboard focus after saving.
The review used deterministic fixtures and did not substitute for live backend tests.

A fresh visual reviewer returned **ship** for all 36 component captures. A final capture refresh was pixel-identical. The reviewer also returned ship for the supplemental stale-connection error state.
The verdict covers the supplied surfaces, not every full-workspace or third-party OAuth state.
The documentation handoff preserved the incumbent tokens and recorded existing design-document drift.

## Limits and publication state

OAuth was verified against a local protocol fixture, not a third-party provider account. Tokens intentionally expire with the app process.
This delivery did not generate or publish a new Learned Skill. Existing published Skill delivery was verified; the broader weekend Learning release gate remains separate.
Goal continuation Undo is unavailable, and file restoration is not a transaction against concurrent host edits or process failure.
Limits stop later model calls; they cannot cap an in-flight provider bill. Older incomplete accounting fails closed when limits are enabled.

The source design check has zero blocking findings and nine existing advisory palette/radius notes.
Production builds retain the existing large-chunk advisory. Neither advisory is treated as a passing result for an untested behavior.

Remote discovery found `origin/main` at `a2484923abef9c7f8e49d07d273a6f1bfd9cae4d` and no open starter PRs.
The local parent includes unpublished settings and Hono work. The weekend runbook forbids pushing an unrelated parent branch.
This delivery is being integrated into local main at the user’s request. It is not a published preview, native-stack registration, or clean-history release.
No upstream PR was merged and no history was rewritten. Publication requires a reviewed matching parent and the weekend installed-acceptance gate.
