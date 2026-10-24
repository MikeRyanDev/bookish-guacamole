# Provider configuration delivery

Worktree: `feat/model-providers`. This record separates deterministic checks from live provider evidence.

## Design and behavior

Task: choose a configured coding model for the next message while retaining the draft.
The existing composer disclosure and radio choices preserve the workspace's visual system.
The trigger is **Model: [configured label]**. Each choice shows its label, provider, and model ID.
Selection changes only this conversation. Escape returns focus to the trigger.
The menu stays open after selection so the confirmed radio state remains visible.
A failed save keeps the last confirmed choice. Runs and pending approvals disable switching.
No borders, dividers, or new enclosing cards were added.

An independent task-first agent review passed discovery, draft retention, keyboard selection, and dismissal.
The review used an isolated fixture at desktop and 390×844, in light and dark themes.
Mobile controls wrap but remain visible. Native mobile keyboard behavior was not tested.
The review made no provider calls and did not claim server persistence from the fixture.

Visual review inspected rendered mobile dark mode and the inherited composer layout.
Browser tests cover both themes and widths, radio state, Escape focus, overflow, and axe accessibility scans.
Backend tests separately cover durable thread selection and server enforcement.

## Deterministic evidence

Failing regressions preceded the catalog, native settings service, selector, and Learning helper changes.
The original tests showed missing catalog functions, a missing settings module, a missing selector, and the OpenAI-only Learning requirement.

Coverage includes:

- Native adapter construction for developer-selected OpenAI, Anthropic, Gemini, and Ollama IDs, plus compatible endpoints
- Catalog validation, duplicate IDs, unknown defaults, malformed endpoints, missing credentials, and secret-free public configuration
- Thread selection across SQLite restart and isolation from other conversations
- Selected-model goal checks and refusal to switch during active execution
- Authenticated model APIs, rejection of unconfigured IDs, and rejection of injected credential fields
- Independent Learning model/key input and mode-0600 generated configuration
- Real backend thread navigation, browser reload, and failed-save draft retention without model calls

## Live provider evidence

The local validation catalog contains two developer-available OpenAI models.
These are private test choices, not template defaults or recommendations.
No other provider credentials were available for this delivery.
Native constructor tests do not prove remote access to those other providers.

`LIVE_MODEL=1 FILE_VIEWER_APP_URL=http://127.0.0.1:4373 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4374 pnpm exec playwright test e2e/live-model-selection.spec.ts` passed.
Thread `550544b2-d395-4d81-ba9b-84da19cf4e84` contains 60 persisted Intelligence events and two approved `npm test` calls.
It switched from GPT-6 Luna to GPT-4.1 in the same conversation and reloaded after each turn.
Native execution metadata records both actual model sources. No duplicate bash calls appeared after reload.
Raw events and local configuration remain ignored.

Learning configuration generation passed its independent regression test.
This delivery did not change the installed Learning model, rerun its training pipeline, or claim a new Learning outcome.
The existing published Skill path remains part of the unchanged Intelligence integration.
CLI login JSON events, EULA refusal, model payload fields, and provider validation were checked against the pinned CLI help and installed source.
The setup skill was validated with `quick_validate.py`; this was not a fresh human authentication or EULA acceptance.

## Final worktree checks

- `pnpm install --frozen-lockfile`: passed after `node scripts/pin-alpha-integrity.mjs` restored preview integrity entries after dependency resolution.
- `pnpm skills:sync`: completed; the existing 34 generated mappings remain unchanged.
- `pnpm check`: passed lint, source design scan, both TypeScript checks, 166 tests, and production builds; 47 persistence-store checks are declared skips.
- `node --test example/greet.test.js`: one passed.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4373 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4374 pnpm test:e2e --output .data/models-full-browser`: 93 passed, 10 opt-in skips, one workspace failure while development servers shared an HMR port.
- After assigning `STARTER_HMR_PORT=24738`, the workspace and thread-model suite passed all five tests. The earlier affected composer, permission, and model suite passed 22 tests.
- The full browser run included the rendered design scan across both themes and widths. The separate `pnpm design:browser` run also passed its 28 scans.
- `quick_validate.py .agents/skills/setup`: passed.
- `pnpm format:check`: reports existing formatting in `MONDAY_CUTOVER_CHECKLIST.md` and `docs/design/permissions/STUDY.md`. Those unrelated files remain unchanged. Changed-file formatting and `git diff --check` pass.

A new API regression reproduced model selection before permission initialization. The fix initializes permissions before the first model write.
One live attempt reused prior test output instead of making a second tool call. The second-turn prompt now explicitly requests a new call.
The final live rerun passed with assertions on actual source-model metadata in persisted Intelligence events.
Final live thread: `ac7250d6-21b9-4f91-ad3d-35510edb088d`; persisted events: 59.

The build retains the existing large frontend chunk warning. No upstream PR, package preview, backend release, or shared deployment changed.
Merged-main verification follows the integration commit.
