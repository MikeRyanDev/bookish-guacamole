# Verification record

Latest backend architecture and Hono delivery: [backend verification](BACKEND-VERIFICATION.md).

> Historical implementation and validation record. Named models describe those runs, not starter requirements.
> For current provider-neutral setup, use [model configuration](MODELS.md) and the [README](../README.md).

Latest provider configuration and composer evidence: [model delivery](MODEL-VERIFICATION.md).

## Lazy file discovery — 2026-10-23

Implemented in `feat/lazy-files`, based on main `9bdbe42`. [API contract and performance limits](FILE-DISCOVERY.md).
Directory pages contain at most 100 immediate children. Whole-workspace path search has no total file or traversal cutoff.
The browser no longer requests a flat workspace listing. The compatibility endpoint also no longer truncates its response.

| Command                                                                                                                                                                                                            | Result                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                                                                                                                                                       | Passed lint, design source checks, types, 134 tests, and builds; 49 declared unsupported-store skips. The existing large-chunk warning remains.                            |
| `node --test example/greet.test.js`                                                                                                                                                                                | One passed.                                                                                                                                                                |
| `CI=1 FILE_VIEWER_APP_URL=http://127.0.0.1:4195 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4216 pnpm test:e2e`                                                                                                       | 65 passed, eight opt-in checks skipped, two failed. One failure came from missing sample files in the isolated checkout. The other caught changed empty-workspace wording. |
| `CI=1 FILE_VIEWER_APP_URL=http://127.0.0.1:4195 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4216 pnpm test:e2e e2e/lazy-files.spec.ts e2e/html-tree-integration.spec.ts e2e/workspace.spec.ts e2e/workspaces.spec.ts` | Seven passed after restoring the empty-state wording and preparing the ignored sample workspace. Includes both previous failures and the final API implementation.         |
| `.agents/skills/impeccable/scripts/impeccable detect --json web/src/components/workspace-file-browser.tsx web/src/components/file-tree.tsx web/src/components/inspector.tsx`                                       | No findings. The full browser run also passed the rendered design matrix.                                                                                                  |
| `git diff --check`                                                                                                                                                                                                 | Passed.                                                                                                                                                                    |

Integration onto main `26a3154` preserved the newer composer. `pnpm check` passed again with 134 tests and 49 declared skips.
The following combined browser run passed all 14 tests:

```sh
CI=1 FILE_VIEWER_APP_URL=http://127.0.0.1:4195 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4216 pnpm test:e2e e2e/lazy-files.spec.ts e2e/composer.spec.ts e2e/html-tree.spec.ts e2e/html-tree-integration.spec.ts e2e/workspaces.spec.ts
```

After integration, the new repository usability gate required a fresh task-first review. [Separate usability and visual verdicts](FILE-DISCOVERY.md#usability-verdict).
The review found mobile entry and search-clear issues. A pointer-hit regression failed with a long workspace name before the header fix.
Final corrections add a visible Files entry, clarify the prompt suggestion, and remove the delay when clearing search.

`pnpm check` passed again with 134 tests and 49 declared skips. `pnpm design:browser` passed the rendered matrix.
The final affected run passed 12 tests; one new keyboard test initially omitted the existing Back-to-files focus handoff.
After waiting for that visible focus state, the focused command passed all six tests:

```sh
CI=1 FILE_VIEWER_APP_URL=http://127.0.0.1:4195 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4216 pnpm test:e2e e2e/html-tree.spec.ts e2e/file-entry.spec.ts
```

The other affected command covered `e2e/file-entry.spec.ts`, `e2e/html-tree.spec.ts`, `e2e/file-viewer-integration.spec.ts`, `e2e/html-tree-integration.spec.ts`, `e2e/workspace.spec.ts`, and `e2e/lazy-files.spec.ts` with the same URL overrides.
Before the final entry-label correction, the merged main app also passed `e2e/lazy-files.spec.ts` at port 4173.
No backend deployment changed; only the local starter app was restarted to load the new endpoints.

Final merge: `e26a405` on main includes the later composer and placeholder changes. The main app on port 4173 passed all nine final checks:

```sh
CI=1 FILE_VIEWER_APP_URL=http://127.0.0.1:4173 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4216 pnpm test:e2e e2e/file-entry.spec.ts e2e/lazy-files.spec.ts e2e/composer.spec.ts
```

`pnpm check` passed at the merged source with 134 tests and 49 declared skips. `node --test example/greet.test.js` passed again.
The final screenshots use that main app. Unrelated worktree changes remained untouched.

The new API tests first failed because the requested discovery contract was absent. A later literal-path regression failed before the Git argument fix.
Current tests page through all 1,105 files in Git and plain folders. Plain-folder search also crosses more than 10,000 entries.
They cover private paths, symlinks, ignores, forced tracked files, deleted files, aggregate Git status, cursor scope, cancellation, and unusual filenames.
HTTP tests cover authentication, origin checks, workspace isolation, and invalid input.

The real browser test uses a disposable local workspace. It verifies lazy expansion, every directory and search page, unopened-folder matches, preview reload, and refresh after insertion.
Fixture tests cover keyboard navigation, local retries, obsolete searches, restored expansion, and bounded mounted rows.
The final captures load the actual fonts and show the visible inspector at both widths. The isolated test browser dismisses its SDK promotion before capture.
Axe passes in both themes at 1440px and 390px. Earlier capture attempts raced responsive visibility and animation; the final test opens the pane explicitly and uses reduced motion.

[Light desktop](proof/lazy-files-light-1440.png), [dark desktop](proof/lazy-files-dark-1440.png), [light mobile](proof/lazy-files-light-390.png), [dark mobile](proof/lazy-files-dark-390.png).

No new model or Learning run was started. Browser tests used the existing CLI-installed backend through the isolated app.
The full suite emitted existing ResizeObserver warnings in tool virtualization tests while their assertions passed.
Impeccable reported existing sidecar and build-path metadata drift; this delivery did not modify that metadata.

## Tool presentation polish — 2026-10-23

Implemented in `design/tool-polish`, based on main `2f37bcc`. [Study, rejected concept, and final captures](design/tool-polish/STUDY.md).
The user explicitly required unchanged stacking. `transcript-rows.ts`, `virtual-transcript.tsx`, and `tool-approval.tsx` have no changes. Group boundaries, open-state retention, spacing logic, default disclosure states, and interrupt resolution remain unchanged.

Commands ran from the worktree. The isolated fixture served that worktree on 4197; its Vite app on 4198 proxied `/api` to the existing local service on 4173. No runtime, dependency pin, or shared deployment changed; no new weekend preview publication was required.

| Command                                                                                                                                                                                                                                                                                                                 | Result                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                                                                                                                                                                                                                                                            | Passed lint, source design check, TypeScript, 129 tests (49 declared skips), and both builds. Existing large-chunk warning remains.                           |
| `node --test example/greet.test.js`                                                                                                                                                                                                                                                                                     | 1 passed.                                                                                                                                                     |
| `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4197 pnpm design:browser`                                                                                                                                                                                                                                                     | Passed rendered tools, activity, command and patch approvals in both themes at desktop/mobile widths.                                                         |
| `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4197 pnpm test:e2e e2e/tool-renderers.spec.ts e2e/tool-stack.spec.ts e2e/tool-polish.spec.ts`                                                                                                                                                                                 | 8 passed before adding the accent matrix. Covers exact evidence, outcome visibility, keyboard disclosure, virtual remounts, and expansion anchoring.          |
| `FILE_VIEWER_APP_URL=http://127.0.0.1:4198 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4197 pnpm test:e2e e2e/appearance.spec.ts e2e/tool-approvals.spec.ts e2e/tool-disclosure.spec.ts e2e/motion.spec.ts e2e/virtual-transcript.spec.ts`                                                                                 | 15 passed. Includes both themes/all accents in Settings, permission retry and mobile keyboard use, copy/error handling, reduced motion, and scroll following. |
| `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4197 pnpm test:e2e e2e/tool-polish.spec.ts e2e/tool-stack.spec.ts`                                                                                                                                                                                                            | 7 passed after final reveal timing/geometry.                                                                                                                  |
| `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4197 pnpm test:e2e e2e/tool-polish.spec.ts`                                                                                                                                                                                                                                   | 3 passed after adding approval contrast coverage for all 16 theme/accent combinations.                                                                        |
| `pnpm exec oxfmt --check DESIGN.md docs/VERIFICATION.md docs/design/tool-polish/STUDY.md docs/design/tool-polish/concept.png.json web/src/components/tool-call.tsx web/src/components/tool-disclosure.tsx web/src/components/transcript-messages.tsx web/src/styles.css e2e/tool-polish.spec.ts e2e/tool-stack.spec.ts` | Passed.                                                                                                                                                       |
| `git diff --check`                                                                                                                                                                                                                                                                                                      | Passed.                                                                                                                                                       |

Final preview correction: the first worktree setup linked `node_modules`, which caused Vite to refuse the font assets outside its allowed root. Those captures used fallback fonts. `pnpm install --frozen-lockfile` installed dependencies inside the worktree, and the fixture restarted with `pnpm exec vite --config e2e/fixtures/vite.config.ts --port 4197 --force`. A new test explicitly loads Manrope and IBM Plex Mono. The current captures replace the fallback-font captures.

After this correction, `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4197 pnpm test:e2e e2e/tool-polish.spec.ts e2e/tool-stack.spec.ts e2e/tool-renderers.spec.ts e2e/tool-approvals.spec.ts e2e/tool-disclosure.spec.ts e2e/motion.spec.ts e2e/virtual-transcript.spec.ts e2e/appearance.spec.ts e2e/design.spec.ts` passed **all 26 tests**. Appearance checks in this final command used the main app at 4173, now at the merged source; fixtures used the isolated worktree. `pnpm typecheck` and formatting also passed after adding the font check.

The reveal regression failed before implementation (no animation on user-opened activity). Early browser checks found transient contrast loss from opacity and theme background transitions. Both effects were removed; the subsequent checks above passed. The final reveal clips in place without fading text or animating layout height. Reduced motion skips it, and restored nested disclosures do not animate again.

The checkmark retains the accessible “Result received” text and tooltip. Exit codes, missing results, failures, running work, and approvals remain visible text. The existing completion test now asserts the retained tooltip instead of requiring redundant visible text.

This is deterministic browser/UI evidence, including the real shell appearance controls. No new model, Learning, backend cancellation, or runtime acceptance run was performed. Historical backend proof elsewhere in this file is not new evidence for this delivery. Existing screenshot records were preserved; current synthetic captures live in `docs/design/tool-polish/`.

## Tool activity redesign — 2026-10-23

Worktree: `design/tool-stack`, based on the user's requested design checkpoint `68940da` on main. [Study and before/after captures](design/tool-stack/STUDY.md); [independent review and verdict history](design/tool-stack/REVIEW.md).

| Command                                                                                                                                                              | Current evidence                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                                                                                                         | Passed after the final production change: lint, source design check, both TypeScript checks, 101 tests passed with 49 declared skips, and both builds. Existing large-chunk warning remains.                                                                                 |
| `node --test example/greet.test.js`                                                                                                                                  | 1 passed.                                                                                                                                                                                                                                                                    |
| `pnpm design:browser`                                                                                                                                                | Passed: tools, grouped activity and both approval types scanned at 1440px and 390px in light/dark.                                                                                                                                                                           |
| `pnpm test:e2e e2e/tool-stack.spec.ts e2e/tool-disclosure.spec.ts e2e/tool-renderers.spec.ts e2e/virtual-transcript.spec.ts`                                         | Initial focused run: one ambiguous text locator failed after adding command previews; updated to target the command body. Subsequent focused suite passed 11 tests.                                                                                                          |
| `pnpm test:e2e e2e/tool-stack.spec.ts e2e/tool-approvals.spec.ts e2e/design.spec.ts`                                                                                 | Approval and activity tests passed. Rendered detector initially flagged the synthetic fixture's header inset; corrected. Subsequent rendered check passed.                                                                                                                   |
| `pnpm test:e2e --config .data/playwright-preview.config.ts --grep-invert Impeccable`                                                                                 | Full worktree UI against the existing local backend: 30 passed, 7 skipped, 2 failed. The failures were a missing ignored worktree `.env` and an Inspector promotion intercepting a click. The environment was linked privately; both failed tests passed in the rerun below. |
| `pnpm test:e2e --config .data/playwright-preview.config.ts e2e/quiet-ui.spec.ts e2e/thread-navigation.spec.ts e2e/tool-stack.spec.ts e2e/virtual-transcript.spec.ts` | 10 passed, including both previous failures and disclosure position.                                                                                                                                                                                                         |
| `TOOL_REPLAY_URL=<existing local conversation> pnpm test:e2e e2e/tool-replay.spec.ts e2e/tool-stack.spec.ts e2e/virtual-transcript.spec.ts`                          | Final anchoring implementation: 8 passed. Replay asserts the real group header stays within 3px of its original position at 1512×741.                                                                                                                                        |
| `pnpm test:e2e e2e/tool-stack.spec.ts --grep 'accessible in both'`                                                                                                   | Final capture correction: passed all four theme/size combinations. A geometry assertion waits until the following narrative lies below the expanded activity before screenshots.                                                                                             |
| `git diff --check`                                                                                                                                                   | Passed.                                                                                                                                                                                                                                                                      |

Integration onto main `64d8f80`: `pnpm install --frozen-lockfile && pnpm check` passed with 107 tests and 49 declared skips. `FILE_VIEWER_APP_URL=http://127.0.0.1:4175 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4176 pnpm test:e2e` passed 51 tests with seven skips; the file-viewer integration timed out. The same command restricted to `e2e/file-viewer-integration.spec.ts` then passed (6.3s), without a code change. The activity tests use the shared fixture URL helper so isolated fixtures follow the integrated configuration. Reviewed screenshots are retained rather than replaced with repeat-run output.

The preview used the worktree Vite frontend on 4175 with `/api` proxied to the unchanged local service on 4173. Its ignored Playwright config only selects that frontend, the repository test directory, and a separate output directory. A separate Vite cache avoids conflicts with the fixture server. No production/shared backend configuration changed.

Regression evidence: the initial grouping assertion failed before implementation. The short-viewport expansion test reproduced an 82px jump before the anchoring fix. A two-frame suspension passed the fixture but failed the real replay; the final implementation retains inspection anchoring across asynchronous SDK tool mounting. Jump to latest and subsequent append following are tested. The generic virtual-scroll tests emitted ResizeObserver loop warnings while their geometry assertions passed; no claim of a warning-free browser is made.

The real replay restores an existing six-call local backend conversation and verifies expansion/reload without starting a model run. Its captures stay ignored under `.data/` because they contain workspace content. Synthetic captures cover eight tool calls, individual payloads, partial arguments, missing results, denial/failure, streaming completion, exact copy, keyboard use, and disclosure persistence through virtual remounts. No new live-model, Learning, cancellation, or backend runtime behavior was tested in this UI delivery; opt-in model tests remain skipped.

The independent reviewer scored header anchoring, design documentation, and detail-capture overlap resolved. The final ship verdict applies to those fixes. The imagegen state study was retrospective, not an approved pre-build comp; the study and DESIGN.md record that process deviation.

## Active checkout Learning update — 2026-10-23

The existing local stack now runs `0.15.1-validation.7cab78803075` through the published CLI
`4.30.0-pre.7cab788`. The SDK remains on preview `ba7b11d`. The app was restarted on port 4173.
The update preserved the stack identity and connection URLs. No backup or separate stack was created.

Before the update, the authenticated Inspector Learning endpoint returned HTTP 503.
After the update, it returned HTTP 200 with `configuration.state=configured` and both existing Skills.
A real browser check verified the enabled indicator, the Learning view, and the dashboard link popup
on `http://cpk.localhost:61995`. The first post-update check used a link selector for an empty registry.
The corrected selector matches the existing registry and passed without a product code change.
No new model-driven Learning cycle was started during this update.

The installed schema identity and Kubernetes image matched the preview. The supported command
`pnpm exec copilotkit local update --json` completed with `step=ready` and no error.
This replaces the earlier candidate, whose `0.15.0-validation` version sorted before stable `0.15.0`.

Publication evidence:

- [Chart workflow](https://github.com/CopilotKit/Intelligence/actions/runs/40052200493): passed, with staging promotion skipped.
- [CLI workflow](https://github.com/CopilotKit/Intelligence/actions/runs/40052975511): passed at Intelligence commit `7cab78803075816a27f7ccaa8a753ce828b51628`.
- The downloaded CLI embeds the exact chart pin and SDK commit. Its checksum is in `alpha-artifacts/cli-archive.json`.
- Normal Helm selection still returned stable `0.15.0`. The npm `latest` tag still returned CLI `4.30.0`.

Validation commands:

```sh
pnpm install
node scripts/pin-alpha-integrity.mjs
pnpm install --frozen-lockfile
pnpm check
node --test example/greet.test.js
pnpm exec playwright test e2e/learning-status.spec.ts
pnpm exec playwright test --config .data/learning-update/playwright.config.ts
git diff --check
```

The lockfile contains all 16 archive integrities. The required checks and both browser checks passed.
The live browser check failed on HTTP 503 before the backend update, then passed after it.
Private browser evidence remains under ignored `.data/learning-update/`.
No shared or production deployment changed.

## TanStack Skill loader migration — 2026-10-23

The runtime now uses `@tanstack/ai-skills@1.0.0` through an Intelligence `SkillSource` adapter. The SDK still verifies each archive. The coding harness requests refresh before each turn and rejects the SDK's stale fallback. See [the architecture](ARCHITECTURE.md) for ownership and failure behavior.

Before implementation, `pnpm test tests/skills.test.ts` failed two regressions: the native tools were absent, and three turns made only one snapshot request. After implementation, the focused suite passed:

```sh
pnpm test tests/skills.test.ts tests/coding.test.ts tests/bridge.test.ts
pnpm check
node --test example/greet.test.js
```

The full check passed lint, both TypeScript checks, 85 tests, and production builds. The 49 persistence tests for unsupported stores remain declared skips. The sample test passed. The focused tests cover raw instruction loading, supporting files, unsafe and missing resources, refresh between turns, network and corrupt-archive fallback, recovery, and permission approval/denial across restart after skill loading.

Live proof used an isolated worktree app at `http://127.0.0.1:4183`, the existing CLI-installed local Intelligence backend, and GPT-6 Luna. The ignored `.data/live.config.ts` imports the normal Playwright configuration and overrides only the app URL and test/output paths. Both commands passed:

```sh
LIVE_MODEL=1 pnpm exec playwright test e2e/live-model.spec.ts --config .data/live.config.ts
LIVE_LEARNING=1 LIVE_MODEL=1 pnpm exec playwright test e2e/live-learning.spec.ts --config .data/live.config.ts
```

The coding thread `0225057a-5e31-4940-b540-ef8d03534101` loaded a published Skill through `load_skill`, completed two approved `npm test` calls, and restored after browser reload without duplicate calls. Intelligence persisted 11 distinct tool calls with no event decode errors or truncation. The Learning thread `599441d8-cae8-4f77-bcbc-76e43d37add4` loaded `regression-only-coverage`, answered without commands or edits, and restored after reload.

These live checks consumed existing published Learning output. They did not generate or publish a new Skill, test automatic Learning scheduling, or claim new Learning quality evidence. Restart and denial coverage used the deterministic real-harness tests. Private events and current screenshots remain in ignored worktree `.data/`. No shared or production environment changed.

## Quiet UI refinement — 2026-10-23

The latest pass replaces green-tinted dark surfaces with deeper charcoal and a trace of blue.
It removes persistent branding/runtime metadata, repeated status/headings, pane and dialog rules, control outlines, and the enclosing approval panel.
The composer keeps one shared focus ring. Accessible names, active status, errors, approval scope, and decision controls remain.
`AGENTS.md`, the starter React skill, `PRODUCT.md`, and the design system now require a concrete usability reason for any border or divider.

The new `e2e/quiet-ui.spec.ts` checks first failed against the previous UI. Both themes now pass: no idle metadata or decorative shell borders, a visible shared focus indicator, all appearance choices, and documentation access through the command menu.

| Command                                             | Result                                                                                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                        | Passed lint, design checks, both TypeScript projects, 91 tests, and builds; 49 declared store checks skipped.                                                     |
| `node --test example/greet.test.js`                 | One passed.                                                                                                                                                       |
| `pnpm test:e2e`                                     | 26 passed, six model tests skipped; includes all 16 appearance combinations, axe, mobile panels, workspace management, tool approvals, and rendered design scans. |
| `pnpm test:e2e e2e/quiet-ui.spec.ts`                | Two passed after the final shared-focus refinement.                                                                                                               |
| `LIVE_MODEL=1 pnpm test:e2e e2e/live-patch.spec.ts` | One passed against real Luna: exact patch preview, approval, persisted result, and reload.                                                                        |
| `pnpm format:check` and `git diff --check`          | Passed.                                                                                                                                                           |

Live patch thread: `6e6ee2ad-0db0-457d-bf7a-ad088726338b`, 40 persisted events, no decode errors or truncation.
Only local test files were changed by that model run. No backend, production, or shared-environment configuration changed.
The existing large-chunk build warning remains.

Current captures: [dark workspace](proof/quiet-workspace-dark.png), [light workspace](proof/quiet-workspace-light.png), [dark approval](proof/approval-patch-dark.png), and [mobile Settings](proof/appearance-mobile.png).
A fresh finish review returned **ship** with no material fixes for this refinement, covering palette, text, framing, functional clarity, and responsive captures.
Earlier sections record historical verification and do not override this visual direction.

## Redesign verification — 2026-10-23

The [design study](DESIGN-STUDY.md) records public harness research, generated concepts, and the selected direction.
`DESIGN.md` and `.impeccable/design.json` record the implemented typography, themes, eight accents, and component rules.

| Command                                                                       | Observed result                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                  | Lint, design gate, both TypeScript projects, 91 tests, and builds passed; 49 declared persistence-store checks skipped.                                                                                         |
| `node --test example/greet.test.js`                                           | One test passed.                                                                                                                                                                                                |
| `pnpm test:e2e`                                                               | 24 passed; six live-model checks skipped in this command. Includes all 16 mode/accent combinations, persistence, keyboard controls, mobile, axe, tool disclosure/copy/error states, and rendered design checks. |
| `LIVE_MODEL=1 pnpm test:e2e e2e/live-patch.spec.ts e2e/live-controls.spec.ts` | Three real Luna tests passed: patch approval, rejected write, and cancellation; persisted outcomes checked after reload.                                                                                        |
| `pnpm format:check` and `git diff --check`                                    | Passed.                                                                                                                                                                                                         |
| `pnpm exec impeccable embed-prompt --scan docs/design/redesign`               | Three generated studies; no missing provenance.                                                                                                                                                                 |

Regression checks first reproduced two patch previews for one pending call and stale copy feedback after a streaming command changed.
The pending call now appears only in its permission surface. Its completed result remains in the SDK transcript after resolution and reload.
Copy feedback refers to the exact payload copied. The misleading inert Settings preview was removed.

Latest live patch thread: `ad4d09a5-7d2d-4dc4-8297-7b83ddfc75f8`, with 43 persisted events, no decode errors, and no truncation.
The file stayed unchanged before approval, changed after approval, and remained correct after reload. One patch call was persisted.
Raw logs, model-created files, and traces remain ignored. No production or shared environment was changed.

Rendered evidence: [live approval](proof/live-patch-approval.png), [light tools](proof/tool-cards-light.png), [dark tools](proof/tool-cards-dark.png), [light settings](proof/appearance-light.png), [dark settings](proof/appearance-dark.png), and [mobile settings](proof/appearance-mobile.png).
The finish reviewer returned **ship** for the three scored fixes: duplicate approval rendering, misleading Settings preview, and stale design documentation.
The final build retains the existing large-chunk warning. The design gate has no failures; two advisories identify legacy workspace-dialog radii outside the core scale.

For Impeccable installation, detector regressions, and typography checks, see [Impeccable verification](IMPECCABLE.md#verification-on-2026-10-23).

For the latest approval, routing, motion, README, and React guidance checks, see [NEW improvements proof](NEW-IMPROVEMENTS-VERIFICATION.md). The records below describe earlier runtime validation.

## Current browser delivery checks

The older terminal/GPT-4.1 evidence below is historical. It does not prove the new browser or Luna Learning path.

Browser checks on 2026-10-22, with final checks and installed Learning proof on 2026-10-23:

| Command                                                                                          | Observed result                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                                     | Lint and both TypeScript projects passed; 80 tests passed, 49 declared store checks skipped; browser built in 813 ms and server in 15 ms on the existing install |
| `pnpm test:e2e e2e/workspaces.spec.ts e2e/tool-renderers.spec.ts e2e/virtual-transcript.spec.ts` | Three browser tests passed: workspace management/reload/empty state; tool cards and axe in both themes; bounded virtual DOM and scroll-follow behavior           |
| `LIVE_MODEL=1 pnpm test:e2e e2e/live-model.spec.ts`                                              | Passed in 15.2 seconds against the real local backend and `gpt-6-luna`                                                                                           |
| `git diff --check`                                                                               | Passed                                                                                                                                                           |

Live browser thread: `61273bab-6138-42f9-9e5c-508c39231950`. The agent loaded `greet-blank-trim-validation` from the published Skill registry and executed two separately approved `npm test` calls. Both reported 14 passing workspace tests. The SDK returned ten unique tool calls, one Skill load, two bash calls, no message snapshots, no decode errors, and no truncation. Reload restored the final response and the same persisted tool-call count.

Screenshots: [light](proof/luna-light.png), [dark](proof/luna-dark.png), [tool cards light](proof/tool-cards-light.png), [tool cards dark](proof/tool-cards-dark.png). The dark live screenshot was visually inspected after the test. Raw events and logs remain ignored under `.data/`.

The file-list regression first failed on a folder without Git. The bounded fallback now passes alongside checks for private paths, symlinks, a 1,001-file folder, and missing folders. The empty-workspace browser assertion also failed before its UI state was added.

`LIVE_MODEL=1 pnpm test:e2e e2e/live-workspaces.spec.ts` passed in 11 seconds. Two real Luna sessions read different files in separate named workspaces. Switching isolated the file list and session history. A deliberately mixed workspace/thread URL returned Intelligence's `THREAD_AGENT_MISMATCH` and no foreign transcript. Removing and reopening the first folder restored its original workspace ID and saved conversation. [Workspace screenshot](proof/workspace-isolation.png).

Proof threads: alpha `74cd3cde-3ef7-4c46-8aac-dbbc33bcca95`; beta `e16a8920-a93b-4ab4-837c-2fac188200f4`. IDs and folder paths are recorded privately in `.data/workspace-isolation-proof.json`.

Two regressions were reproduced and fixed: an explicitly opened folder ignored by its parent Git repository no longer appears empty, and image restoration handles an interrupted apply that never changed the deployment. The interruption regression substitutes Docker; actual image restoration and reapplication also passed on 2026-10-23.

`LIVE_MODEL=1 pnpm test:e2e e2e/live-controls.spec.ts` passed both live controls in 14.7 seconds. Rejection thread `953c2500-3567-475e-8503-46ef441d91df` recorded the denied tool result; the requested file stayed absent and reload retained the refusal. Cancellation thread `f1bb5e72-9cc7-450d-86a5-fe94766acfab` persisted a `cancelled` outcome after stopping active text streaming; reload restored the partial response without restarting the run.

`pnpm test:e2e` passed eight browser tests in 11.1 seconds, including mobile panels, light/dark axe checks, and opening/navigating/closing the CopilotKit Inspector. Four model tests skip without `LIVE_MODEL=1`; their explicit live commands above passed separately. [Inspector screenshot](proof/copilotkit-inspector.png) was visually inspected.

A clean copy of this browser revision, without `.env`, `.data`, `.copilotkit`, `workspace`, or `node_modules`, passed `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm workspace:create`, and `node --test workspace/greet.test.js`. Installation took 5.1 seconds with the shared pnpm cache; browser build took 1.11 seconds and server build 14 ms. The copy passed 80 tests with 49 declared store skips. This verifies app setup, not a second backend installation. pnpm reported four ignored dependency build scripts; all checks still passed.

`pnpm format:check` passes with explicit exclusions for vendored skills, generated guidance, user-owned requirements, and private/generated outputs. Browser fixtures and E2E tests are included in TypeScript checks. The deprecated tsdown option was replaced; large frontend chunks remain a build warning.

`PORT=4175 pnpm start` also served the built HTML and JavaScript bundle with HTTP 200 and the correct JavaScript content type. That production check was stopped afterward; the development browser remains available at port 4173.

## Installed Luna Learning and automatic refresh

The installed CLI stack ran native `openai/gpt-6-luna` using Intelligence branch
image `cpki-luna-app-api:34918f9e1`, revision
`34918f9e1952d06c0c9ab0e21d0f4ff4bebddfc0`, image ID
`sha256:b0d72c8dc52b3d5961879d94a2713456e1f493b574366e94e5384f6174a47338`.
Its read-only, non-root runtime startup smoke passed, including deferred model setup.

Run `01a1690a-beaf-7c59-961f-b37e9328670c` succeeded over 16 evidence threads,
producing one Insight and one Skill candidate. Review approved
`regression-only-coverage` as Skill `01a1690c-42c5-7ea6-b3a2-169705cdfc0e`, registry
revision 2. The candidate contains a baseline/test-only-change/retest procedure.

`LIVE_MODEL=1 LIVE_LEARNING=1 pnpm exec playwright test e2e/live-learning.spec.ts`
passed in 11.8 seconds. Without a server restart or naming the Skill in the user
prompt, the next browser turn loaded the new Skill, explained its procedure, and
restored the response after reload. Thread `629301b7-bbf5-43f9-8a09-2412ea7adf07`.
[Inspected screenshot](proof/learned-skill-refresh.png).

Both branch images were restored to the captured CLI digest
`sha256:6de1be3ea286385b9eac7f929aee6ff44476d7662965672381eeec380e77795f`
and `IfNotPresent` policy with readiness confirmed. The tested branch image was
then reapplied for continued starter use. Recovery remains
`pnpm intelligence:image:restore`; normal startup never applies an override.
[Removal procedure](TEMPORARY-INTELLIGENCE.md).

Intelligence changes are staged in [draft PR #2041](https://github.com/CopilotKit/Intelligence/pull/2041).
The app-api image smoke passes. A pinned shared smoke fixture needed a Flue 2
result-tool/prompt-role update; its ten tests and all five actual runtime phases pass locally. The updated
shared end-to-end smoke passed on PR head `1f8e6dc28`. This is a temporary branch image, not a released Intelligence version.

## Verified on 2026-10-22

| Check              | Evidence                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Published packages | npm reports TanStack AI 1.0.0, harness 0.1.0, CopilotKit 1.79.1, CLI 4.29.0                             |
| Event bridge       | Real harness with a deterministic provider; public AG-UI runner accepts the event sequence              |
| Run identity       | Provider IDs cannot replace the outer Intelligence thread and run IDs                                   |
| Tool evidence      | Tool arguments and results survive the bridge; one final event closes the whole turn                    |
| Errors             | Provider failure produces an error, not successful completion                                           |
| Approval           | The public agent API pauses before execution and resumes the tool exactly once                          |
| Cancellation       | Unsubscription cancels the underlying model through the harness control API                             |
| Restart            | A new SQLite connection and new host restore the previous model context                                 |
| Coding permissions | Official write_file plugin resumes across a host restart; once writes the file, reject leaves it absent |
| SQLite contract    | 56 applicable official persistence checks pass; 49 checks for absent stores skip                        |
| Sample workspace   | Node's built-in test runner passes the greeting test                                                    |

## Local installation evidence

`copilotkit local list --json` returned no stacks. Docker was stopped. Docker Desktop now runs with Engine 29.3.0.

The first `local setup --defer-model --json` failed after the Helm pull timeout. Process inspection found Helm waiting on `docker-credential-desktop get`.

A read of the public GHCR tags endpoint succeeded. Retrying the CLI with a temporary empty Docker configuration passed release download and reached `authentication_required`.

The diagnostic command was:

```sh
DOCKER_CONFIG=/private/tmp/tanstack-public-registry \
DOCKER_HOST=unix:///Users/mikeryan/.docker/run/docker.sock \
pnpm intelligence local setup --defer-model --json
```

The temporary directory contains only `config.json` with `{"auths":{}}`. This path and socket are specific to this machine. The diagnostic deliberately deferred Learning configuration; final setup must configure its model.

CLI sign-in is complete. The OpenAI key was copied from the developer-authorized local source into ignored configuration without printing it. A real OpenAI chat completion returned HTTP 200, model `gpt-4.1-2025-04-14`, and the requested `MODEL_OK` response. This verifies model access only; it does not verify the coding harness or Learning.

Before personal acceptance, local setup with `--model-config .data/learning-model.json` exited with `eula_acceptance_required` for agreement `developer-edition-2026-10-01-web`. No license was requested. The CLI required the developer to run `pnpm intelligence local accept-terms` personally; agents cannot submit that acceptance.

## Real end-to-end evidence

Verified on 2026-10-22 (America/Los_Angeles), using local release **0.15.0** and real OpenAI GPT-4.1 for both coding and Learning.

| Check            | Recorded evidence                                                                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI installation | `local setup --model-config .data/learning-model.json --json` completed; app-api, gateway, frontend, Learning agent and reconciler pods ready                                                                                            |
| Connection       | `local connect --json` preview followed by `local connect --approve-connection --json`; local project 1                                                                                                                                  |
| Container        | `learning containers create --id coding-lessons --name "Coding lessons" --json` succeeded                                                                                                                                                |
| Coding + restart | Thread `f68e6556-41b2-491b-b82a-197d0bc5edbf`: real file/shell approvals, failing regression tests, process restart, replay, continuation, and 4 passing tests                                                                           |
| Persisted events | SDK `getThreadEvents` returned 151 events for that thread, no decode errors, no truncation                                                                                                                                               |
| Learning         | Manual run `01a166d9-4246-7c61-9092-d69265abc900` succeeded with one evidence thread, one Insight, and one Skill candidate                                                                                                               |
| Insight          | `01a166d9-9c49-7c85-936f-ade8947e6fca`; cites the actual coding thread and eight transcript message references                                                                                                                           |
| Published Skill  | Reviewed candidate `01a166d9-9c49-71f1-b211-9e7a50b2f48a`; approved Skill `01a166d9-f59a-77c1-857b-5fa252a69237`, registry revision 1                                                                                                    |
| Later Skill use  | Thread `e00fdd3d-81af-480d-804d-23e448760c2b`: `copilotkit_load_skill` returned the full published `greet-blank-trim-validation` instructions, followed by real file edits and test execution; 86 events, no decode errors or truncation |
| Workspace result | Independent `npm test --prefix workspace`: all 12 tests passed, including four new tab/newline cases                                                                                                                                     |
| Cancellation     | Thread `3deba503-4657-4657-b43e-a0e422e553a4`, run `ce678445-fc6d-4a25-810a-56a777f009fe`: client aborted after text began; backend persisted `RUN_FINISHED` with `outcome.type: cancelled`                                              |
| Rejection        | Thread `36435dfa-3ece-4712-a667-85c8c7631277`: refused write returned `The user denied this tool call`; no farewell file was written by that call                                                                                        |
| Dashboard        | Browser sign-in completed; Coding lessons showed 1 Insight, 1 Skill, and the finished manual analysis                                                                                                                                    |

The manual run used the local API's `POST /api/learning/projects/1/containers/coding-lessons/runs`, with the CLI-owned local service credential read privately. Users can invoke the same operation through **Start manual run now** in the dashboard. No credential or raw private configuration is tracked.

Automatic scheduling reported a 15-thread threshold and was disabled. That threshold does not prevent a manual run with one thread. Automatic scheduling itself was not tested.

Raw event snapshots and run details remain in ignored `.data/`. These are local test conversations, not evidence of production reliability or long-term Learning quality.

## Regressions found and fixed

1. The SDK catalog names `copilotkit_load_skill` and `copilotkit_read_skill_file`. The original custom name did not match. A failing real-harness regression test now verifies both advertised tools execute against a snapshot.
2. The parent Git repository ignores `workspace/`, so official file discovery returned no files. The workspace creation script now initializes a separate Git repository. A regression test first reproduced empty discovery, then passed with the fix. Existing-folder replacement remains refused.

## Latest local checks

`pnpm check` passed: lint, TypeScript, 68 tests, 49 declared persistence-store skips, and build. `node --test example/greet.test.js` passed. `npm test --prefix workspace` passed all 12 model-created tests. `git diff --check` passed.

A fresh copy with no `.env`, `.data`, `.copilotkit`, workspace, or node_modules passed:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm workspace:create
node --test workspace/greet.test.js
```

The fresh install reused the local pnpm package store. pnpm reported skipped dependency build scripts; checks and sample creation still passed. This was a clean app setup check, not a second backend installation.

The guide's dashboard controls were checked in the installed 0.15.0 browser UI. Relative Markdown links and `git diff --check` passed. This standalone repository has no `docs:check` script or Nx targets. No hosted deployment, automatic-scheduler run, multi-user concurrency test, or long-term Learning-quality benchmark was performed.

## Approval modes and saved permissions

Implementation worktree: `feat/approval-modes`. The [design study](design/permissions/STUDY.md) records two concepts, the prototype, behavior contract, and usability findings.

The initial native tests failed before the settings service and metadata adapter existed. Native tests now cover all modes, command and sensitive-file approval, concurrent-turn mode changes, multiple approvals, exact saved scope, restart, and duplicate resolution.
A patch fixture initially selected the wrong native edit style. Selecting the native patch style made the test exercise the actual patch tool.

The isolated prototype passed a fresh task-first agent review at desktop and 390px widths. A second review found focus loss in the confirmation flow.
The correction focuses Save and allow on entry and restores Remember this permission on Cancel. A browser regression covers the sequence.
This is agent-based usability evidence, not a human participant study.

Real model evidence: `LIVE_MODEL=1 FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm exec playwright test e2e/live-permissions.spec.ts` passed in 21.8 seconds.
It used the configured Luna model and CLI-installed local Intelligence with an isolated sample workspace. Thread `5d39db74-4564-448e-ac06-866968fe8d91` contains 71 persisted events and exactly three shell calls.
The test saved `npm test`, reused that permission, ran `printf permissions-yolo` in YOLO, restored Review changes, removed the rule, and reloaded without duplicate calls.
Raw evidence and private settings remain ignored in `.data/` and `.env`.

Pre-integration checks: `pnpm check` passed 152 tests with 47 declared skips, lint, design scan, type checks, and build. `node --test example/greet.test.js` passed.
The affected permission, composer, tool approval, and motion browser suite passed 20 tests.
A broader run found an old mobile inspector overlap and one transient patch retry failure during UI edits. The focused patch retry passed afterward.
Main advanced during this work with composer and mobile file-entry changes. Final integrated results follow this record.

Final integrated checks include main through `2b8caa3`:

- `pnpm check`: passed lint, design checks, TypeScript, 152 tests, and build. The persistence suite declared 47 skips.
- `node --test example/greet.test.js`: one test passed.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm test:e2e`: 86 passed, 9 opt-in tests skipped.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm design:browser`: passed 28 rendered scans across seven surfaces, two themes, and two widths.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm exec playwright test e2e/permissions.spec.ts`: eight tests passed. These include focus recovery, axe, long commands, long patches, and transcript position.
- `git diff --check`: passed. Design-study artifact links resolve.

The expanded visual scan found insufficient control padding. The final controls use eight pixels of horizontal padding.
The scan also exposed an invalid fixture theme switch that retained light accent colors. Each permission scenario now loads its actual theme.
The final independent keyboard review passed save, cancel, and removal. Human participant feedback remains pending.
No dependency versions, SDK code, Intelligence code, or shared deployments changed. The local main checklist edit remains outside this feature.

## Simpler permissions and separate planning

The user's UI feedback replaces the four-mode design. The composer has Require permissions, YOLO, and a separate Plan only toggle.
Saved permissions moved into Settings. Interrupts use Reject, Approve Once, and Always Approve, with two positive approval actions.

A failing native regression first showed that independent planning controls did not exist. It now covers planning, saved permission preference, restart, and return to execution.
API tests cover independent permission changes during planning. Existing native tests cover read-only enforcement and active-turn boundaries.
A browser position assertion initially sampled before patch layout settled. It now waits for fonts and two layout frames before measuring.

Current validation in `feat/simpler-permissions`:

- `pnpm check`: passed lint, design checks, TypeScript, 153 tests, and build; 47 declared persistence skips.
- `node --test example/greet.test.js`: one passed.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm test:e2e`: 87 passed, 9 opt-in tests skipped.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm design:browser`: passed 28 scans in both themes and widths.
- `LIVE_MODEL=1 FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm exec playwright test e2e/live-permissions.spec.ts`: one passed in 18 seconds.
- `git diff --check`: passed.

The live test used the isolated workspace and CLI-installed Intelligence. Thread `a1e4ff9a-0e16-492e-b225-e583d3260f2c` contains 70 events and three shell calls.
It saved and reused a permission, entered planning with YOLO selected, reloaded, left planning, ran the YOLO command, and removed the permission.
An independent agent review passed discovery, keyboard recovery, and mobile layout. It did not claim backend enforcement from the fixture.
The user's direct critique drove this revision. The [study](design/permissions/STUDY.md) records the revised behavior and screenshots.

## Stable Plan toolbar

Removed the transient Saving text. The toolbar now orders Create goal, Plan, then Require permissions.
Plan has the accessible name Plan mode and exposes its busy state without extra visible text.
A failing regression first reproduced the wrong order. The final delayed-save test verifies unchanged labels and toolbar dimensions.

- `pnpm check`: passed lint, design checks, TypeScript, 153 tests, and build; 47 declared skips.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm exec playwright test e2e/permissions.spec.ts e2e/composer.spec.ts`: 17 passed.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm design:browser`: passed 28 rendered scans.
- `node --test example/greet.test.js`: one passed.
- `git diff --check`: passed.

No backend behavior changed. This revision did not run another model request.
A fresh task-first agent review passed keyboard toggling, delayed-save layout stability, permission selection, and mobile recovery.
The disabled control briefly loses visible focus during saving; the next Tab advances correctly. No task blocker remained.

## Control copy audit

Removed permanent permission timing guidance and repeated workspace explanations. Permission choices now show labels, with explanations on hover.
The approval scope appears once beside the exact rules. Goal creation states automatic continuation and its 20-turn limit.
Approve Once keeps its label during submission. A failing regression reproduced the old label flash before this change.

- `pnpm check`: passed lint, design checks, TypeScript, 153 tests, and build; 47 declared skips.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm exec playwright test e2e/permissions.spec.ts e2e/composer.spec.ts e2e/composer-discovery.spec.ts e2e/goals.spec.ts e2e/tool-approvals.spec.ts --output .data/control-copy-browser-results`: 28 passed, one opt-in model test skipped.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm design:browser`: 28 rendered scans passed.
- `node --test example/greet.test.js`: one passed.
- `git diff --check`: passed.

An initial concurrent browser run lost a trace artifact. The rerun used an isolated output directory and passed.
An independent fixed-data usability review passed command approval, saved scope, Settings discovery, and mobile readability. No new model calls were required.

## Thread-specific plan and permission selectors

The audit found that both selectors already use the selected thread. No global-setting leak reproduced, and no runtime behavior changed.
Native session settings use the thread's execution log. The planning preference uses the thread ID as its metadata key.
The UI query key includes workspace and thread IDs, and the conversation remounts for a different thread.

New deterministic tests cover three independent threads across restart. A shell-side-effect test uses the same command in all three:
YOLO runs it once, Plan denies it, and Require permissions pauses for approval. Neither other thread repeats the side effect.
The browser test creates three real backend threads without model calls. It covers selector changes, sidebar navigation, reloads, delayed saves during navigation, and new-thread defaults.

- `pnpm check`: passed lint, design checks, TypeScript, 155 tests, and build; 47 declared persistence skips.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274 pnpm exec playwright test e2e/thread-permissions.spec.ts e2e/thread-navigation.spec.ts e2e/permissions.spec.ts --output .data/thread-scope-results`: 12 passed.
- `node --test example/greet.test.js`: one passed.
- `git diff --check`: passed.

The initial browser test used Playwright's immediate `check()` assertion on a server-confirmed radio. It now clicks and waits for the confirmed selection.
Saved approval rules remain workspace-scoped; that does not make the conversation's Plan or permission selector global.

## Goal popover copy removal

Removed the automatic resume note and the repeated status/round line from the goal popover. Goal text, result/reason, and action buttons remain.
`pnpm check` passed (155 tests, 47 declared skips). `node --test example/greet.test.js` passed.
With `FILE_VIEWER_APP_URL=http://127.0.0.1:4273 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4274`, `pnpm exec playwright test e2e/composer.spec.ts e2e/goals.spec.ts --output .data/goal-copy-results` passed nine tests with one opt-in skip, and `pnpm design:browser --output .data/goal-copy-design-results` passed.
A direct mobile preview check confirmed that the removed text is absent and pending-approval buttons remain disabled. `git diff --check` passed.

## Composer model labels and popover anchors

Model choices show the configured label followed by a muted parenthesized provider on the same line.
The toolbar omits the Model prefix. Goal, permission, and model disclosures open eight pixels above
their own controls, with viewport edge clamping. Existing selection and dismissal behavior remains.

The model-label regression failed before the fix. Browser geometry assertions cover all three
disclosures at 1440px and 390px. Keyboard selection, Escape focus return, outside dismissal,
transcript position, and axe checks pass. Light desktop and dark mobile captures were visually
reviewed; this is a small presentation fix, not an independently reviewed workflow redesign.

Validation in the isolated worktree:

- `pnpm check`: passed lint, design check, TypeScript, 171 tests, and build; 47 declared skips.
- `node --test example/greet.test.js`: one passed.
- `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4374 pnpm exec playwright test e2e/models.spec.ts e2e/composer.spec.ts e2e/composer-discovery.spec.ts e2e/permissions.spec.ts --output .data/composer-final`: 27 passed.
- `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4474 pnpm design:browser`: passed all 28 rendered scans.
- `git diff --check`: passed.

The initial concurrent browser runs shared an output directory and lost a trace artifact; the
isolated rerun passed. The outside-dismissal test now clicks the gutter because the corrected
popover overlaps the textarea. Fixture runs emitted ResizeObserver loop warnings.
No backend, model execution, dependency preview, or shared deployment changed; live-model and
backend persistence tests were not rerun for this presentation change.

## Undo conflict reporting — 2026-10-24

A regression reproduced a later file edit turning an undo refusal into `RUN_ERROR`.
The bridge now returns an expected command rejection to the existing dialog.
File conflict protection remains enforced, and ordinary model failures remain errors.

Validation in `fix/history-conflict-result`:

- `pnpm test tests/undo.test.ts tests/bridge.test.ts`: 10 passed. The conflict regression failed before the fix.
- `pnpm check`: passed lint, design source checks, both type checks, 205 tests, and builds; 47 declared skips.
- `node --test example/greet.test.js`: one passed.
- `LIVE_MODEL=1 CAPABILITIES_WORKSPACE=/tmp/starter-history-conflict/workspace FILE_VIEWER_APP_URL=http://127.0.0.1:4277 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4278 pnpm exec playwright test e2e/live-capabilities.spec.ts --output .data/history-live`: one passed.

The live browser used the configured model and CLI-installed Intelligence in an isolated workspace.
It verified a human edit survived refused undo without a console error, then successful undo, redo,
transcript reload, and further model turns. It also exercised compaction and usage admission.
No SDK packages, backend releases, or shared deployments changed. No new Learning run was required.

- `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4279 pnpm exec playwright test e2e/conversation-capabilities.spec.ts e2e/capabilities-design.spec.ts --output .data/history-fixtures`: seven passed, including both themes and 1440px, 390px, and 320px widths.

- `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4279 pnpm design:browser --output .data/history-design`: passed rendered scans; existing ResizeObserver warnings appeared.
- After merging `eb9ebaa` into local `main`, `pnpm check` passed again (205 passed, 47 declared skips); `node --test example/greet.test.js` and `git diff --check` passed.
- Restarted the app on port 4173 and verified its process directory, browser composer, and served rejection handler match the main checkout. The unrelated checklist edit remains untouched.

## Workspace Learning delivery — 2026-10-24

The workspace UI now saves a Learning space, starts Learning, reviews candidate instructions and evidence, and reads published Skills.
Existing conversations retain their backend Learning membership when the workspace choice changes. New conversations use the saved choice.

Public preview inputs:

- Intelligence `4a801b8a843b5fcb6e171b99a1d3269774ad0580`, draft PR #2068 in native stack #2064.
- SDK `31af02d9455bd0bd78f4da40a68661bfa9fceb63`, draft PR #7977 in native stack #7978.
- Chart `0.15.2-validation.4a801b8a843b`, workflow `40153678137` passed; anonymous chart checksum and eight AMD64/ARM64 image indexes verified.
- CLI `4.30.0-pre.4a801b8`, workflow `40154623137` passed; embedded commits, chart pin, SHA-256, and lockfile SHA-512 verified.

The earlier `cdbc41f` candidate installed but failed container discovery because the route validated PostgreSQL Date values before serialization.
A regression reproduced HTTP 500, then passed for container list and detail. Its artifact records remain in `docs/alpha-artifacts/workspace-learning-cdbc41f/`.

| Validation                                                                                                                                                                                  | Result                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                                                            | Passed in the worktree and isolated public starter clone with 16 verified public preview archives                                                       |
| `pnpm check`                                                                                                                                                                                | Passed lint, design checks, both TypeScript checks, 42 test files / 212 tests, and production builds; 47 optional live tests skipped                    |
| `node --test example/greet.test.js`                                                                                                                                                         | 1 passed                                                                                                                                                |
| `FILE_VIEWER_APP_URL=http://127.0.0.1:4197 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4195 pnpm exec playwright test e2e/workspace.spec.ts --output=.data/workspace-learning/header-verified` | 6 passed: production navigation, mobile panels, both-theme axe, header label fit and click outcomes                                                     |
| `pnpm exec playwright test e2e/learning.spec.ts`                                                                                                                                            | 8 passed: fixture assignment, isolation, run completion, delayed proposals, evidence, review failure/recovery, keyboard, mobile, themes, reduced motion |
| `pnpm exec playwright test e2e/file-viewer.spec.ts`                                                                                                                                         | 10 passed; development-only file-entry test also passed                                                                                                 |
| `pnpm design:browser --output=.data/workspace-learning/header-design`                                                                                                                       | 1 passed across both themes and sizes; fixture logged non-failing ResizeObserver notifications                                                          |
| `git diff --check`                                                                                                                                                                          | Passed                                                                                                                                                  |

Real installed proof used a fresh public starter clone with the reviewed source overlay, public SDK/CLI archives, and normal setup/connection/update commands.
It used macOS ARM64, Node 22.22.0, pnpm 10.9.0, and real GPT-6 Luna coding and Learning models.
No private SDK links, backend source build, or manual image patch supplied installed acceptance.

| Installed check                    | Evidence                                                                                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Setup and compatible update        | Normal setup installed the prior candidate; `pnpm intelligence local update --json` completed on the corrected candidate and preserved all three containers                                                        |
| Workspace choice and isolation     | UI saved `workspace-learning-review`; a second workspace retained Off independently                                                                                                                                |
| Coding and replay                  | Conversation `cebc2151-f65e-4fd0-bd30-5dbb3ba9191c`; one approved `npm test`, one passing test, no edits; browser reload preserved answers                                                                         |
| Learn and review                   | UI run `01a170ea-d0c8-7a11-8657-d8333e6cf9a8` succeeded; candidate `01a170eb-4054-713d-a4de-7b30c246ca99` cited three saved messages through Insight `01a170eb-4053-72a8-86f3-aa6b4c6625d5`                        |
| Publication and immediate delivery | UI approval published `evidence-first-regression-testing`; the next turn called `load_skill` and received its instructions in the same app process, PID 20552                                                      |
| Conversation scope                 | Changing the workspace choice preserved the old conversation's membership and Skill access; new conversation `b3b6d777-c221-427b-9525-6c2401737eba` used `workspace-learning-other`                                |
| App and stack restart              | `local stop --json` and `local start --json` completed; app restart restored transcript and assignment; another turn loaded the Skill; 155 events decoded without truncation, with exactly one original shell call |
| Learning service recycling         | Deployment restart changed the Learning pod UID and reached readiness; UI run `01a170ef-8259-7cf2-9051-4f09cb7207d6` then succeeded with no new proposals                                                          |

Usability and visual reviews passed independently. A later full-app check found header label overlap missed by the panel-only visual review.
A failing browser regression preceded its CSS correction. A fresh reviewer passed the actual header at 390px and 1440px in both themes.
The generated Skill description repeats “when”; its supported procedure and successful tool delivery were verified without claiming broader Learning quality.
Raw events, screenshots, private model configuration, and workspace edits remain ignored.

This is local preview acceptance. Hosted deployments, Windows, Linux, AMD64 runtime installation, automatic scheduling, and multi-user concurrency were not tested.
Upstream PRs remain open; no stable release or shared deployment changed.
The final local-main merge and active-app verification are recorded below after completion.

### Merged main and active app

Implementation commit `5da6095` fast-forwarded into local `main`. Autostash restored the user's existing Monday checklist edit; its added/removed lines matched the saved pre-merge patch exactly.
`pnpm install --frozen-lockfile`, `pnpm check` (212 passed, 47 optional skips), and `node --test example/greet.test.js` passed on the merged tree.
`FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4198 pnpm exec playwright test e2e/learning.spec.ts e2e/file-viewer.spec.ts --output=.data/workspace-learning/main-browser-fixtures` passed 18 tests.
`FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4198 pnpm exec playwright test e2e/workspace.spec.ts --output=.data/workspace-learning/main-workspace-browser` passed six tests against port 4173.
The file-viewer suite's generated proof PNG changes were restored; unrelated screenshots were not delivered.

Main's normal `pnpm intelligence local update --json` completed at `step=ready` on `0.15.2-validation.4a801b8a843b`, preserving its existing local stack.
The production app on port 4173 runs from the main checkout, verified through its process working directory.
The user's existing Chrome tab was refreshed after confirming its composer was empty. It retained the CPK Intelligence workspace and Repo Overview conversation.
Its Learning panel showed Coding lessons, Learn, Review skills, and the existing published Skills without an error. No new model turn or Learning run was started against the user's main workspace during this final UI check.

## Workspace Learning dialog — 2026-10-24

Implemented in `feat/workspace-learning-dialog`, based on local main `6c73b79`.
Learning opens beside the workspace name in a large native dialog.
The file inspector no longer contains Learning. Long Markdown and published Skills use the wider reader.
Mobile gives the document the full width. Decisions remain visible while the document scrolls.

[Design study and captures](design/learning-dialog/STUDY.md), [usability](design/learning-dialog/USABILITY.md), and [visual review](design/learning-dialog/VISUAL-REVIEW.md) record separate verdicts.
The fresh usability review passed after fixes for assignment-draft scope and initial focus.
The visual verdict pass marked misleading empty guidance and moving pending controls resolved.
The documenter updated the Learning-specific section of DESIGN.md without replacing global tokens.

| Command                                                                                                                                                                                                                                                                           | Result                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                                                                                  | Passed in the isolated worktree; package and lockfile pins unchanged                                                     |
| `pnpm check`                                                                                                                                                                                                                                                                      | Passed lint, source design checks, both type checks, 42 test files / 212 tests, and production builds; 47 declared skips |
| `node --test example/greet.test.js`                                                                                                                                                                                                                                               | One passed                                                                                                               |
| `FILE_VIEWER_APP_URL=http://127.0.0.1:4197 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4196 pnpm exec playwright test e2e/learning-dialog.spec.ts e2e/learning.spec.ts e2e/workspace.spec.ts e2e/file-viewer.spec.ts e2e/file-entry.spec.ts --output=.data/learning-dialog-delivery` | All 48 passed                                                                                                            |
| `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4196 pnpm design:browser --output=.data/learning-dialog-design`                                                                                                                                                                         | Passed the rendered tools and approvals matrix in both themes and widths                                                 |
| `.agents/skills/impeccable/scripts/impeccable detect --json src/client/components/learning-panel.tsx src/client/components/learning-dialog.tsx src/client/components/inspector.tsx src/client/workspace.tsx src/client/styles.css`                                                | No blocking findings; local reader dimensions and pre-existing controls produced advisories                              |
| `git diff --check`                                                                                                                                                                                                                                                                | Passed                                                                                                                   |

The browser suite covers workspace entry, native dialog focus, Escape and Close restoration, legacy URL handling, and unsent composer preservation.
It covers long Markdown, code, tables, metadata, evidence, publication, rejection, removal, assignment isolation, reload, and cancellation.
State checks include loading, empty data, failed reads, failed saves, retries, pending writes, uncertain review results, failed runs, and unavailable evidence.
Pending decision geometry stays fixed at 390px and 1440px. Both themes pass axe checks.
Actual shell captures also use the user's 1512px desktop width.

Four regressions failed before their fixes: missing modal, unsaved-space action scope, false empty-reader guidance, and moving pending decisions.
An initial fixture ignored cancelled requests during StrictMode remounts and consumed injected failures too early.
It now honors AbortSignal before returning simulated results. A status assertion now targets the specific saved message.
The full-app preview initially proxied `api.ts` by mistake. Its ignored proxy now matches only `/api/` routes.
The shell test dismisses SDK promotion overlays through their visible control and treats Files as an independent toggle.
Generated file-viewer proof changes were restored after the checks.

The fixture simulates Learning writes. The application preview uses the existing CLI-installed backend for real reads.
No new model call, Learning run, or Skill approval was made against the user's main workspace for this redesign.
No server, SDK, dependency preview, upstream PR, or shared deployment changed.
The existing build chunk warning and pre-existing Impeccable sidecar drift remain.
Merged-main and active-app verification follow after integration.
