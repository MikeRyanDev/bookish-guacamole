# Workspace Learning delivery

Status: implementation in progress. No UI, upstream preview, or installed acceptance is complete. The API draft is open.

## Scope

Assign a Learning space to each workspace, start Learning from the UI, and review proposed and published Skills.
Merge the verified starter work into local main with matching public preview builds.
Keep upstream weekend PRs open. Follow `docs/WEEKEND-DELIVERY.md` from the alpha delivery branch and its candidate ledger.
The current main tree lacks that runbook; do not treat its absence as permission to bypass the preview gates.

## Current evidence — 2026-10-24

The starter base is `6f57039`. Work continues in `feat/workspace-learning`, at `../tanstack-intelligence-workspace-learning`.
Main has an unrelated edit in `MONDAY_CUTOVER_CHECKLIST.md`; preserve it.

GitHub API inspection returned Intelligence stack #2064, ordered #2041 then #2063.
The current #2063 head is `7cab78803075816a27f7ccaa8a753ce828b51628`.
CopilotKit #7966 remains open at `ba7b11d624915d75df8bf377f10be6f9bfeac84a`.
These identities are discovery evidence. Fetch and verify them again before branching or publishing.

The starter currently creates one global Skill inspector registry and assigns one environment-selected container to every workspace.
Each workspace already has a stable agent identity and isolated harness storage.
The SDK selector receives a verified user, agent ID, and run input.
The SDK documents immutable Learning assignment after a conversation's first assignment.

Intelligence already has container CRUD, runs, insights, candidate review, and published Skill management.
Its `learning-control-routes.ts` reuses the Learning control store and run admission service.
Those project-scoped management routes require dashboard authorization or a verified local evaluation service token.
The runtime project key has separate delivery endpoints in `learned-skill-delivery-routes.ts`.
The SDK client exposes verified Skill delivery and Inspector Learning, but no management methods.
Do not forward runtime keys to dashboard endpoints or invent browser-side project authority.

## Proposed interactions

Mode: Operate. Extend the existing compact workspace design.
Preserve neutral surfaces, typography, focus treatment, and mobile panel behavior.
Use space names where the user must choose a destination. Avoid decorative container identifiers.

| Task                     | Entry and visible controls              | Outcome                                                     | Recovery                                                             |
| ------------------------ | --------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Assign a space           | Learning, Learning space selector, Save | Save the workspace choice for new conversations             | Cancel preserves the confirmed choice; failed saves retain the draft |
| Start Learning           | Learn                                   | Start a run in the selected space and display real progress | Show admission failures locally; Retry only after a known failure    |
| Review proposed Skills   | Review skills, candidate name           | Display instructions and evidence, then Approve or Reject   | Preserve pending state on errors; refresh server-confirmed outcomes  |
| Inspect published Skills | Published skills, skill name            | Display verified published instructions                     | Show unavailable or stale data truthfully; offer Retry               |

A shared space can include other workspaces' evidence. State that scope before starting a run.
Changing the workspace choice must not silently move old conversations.
The implementation must reconcile Skill delivery with existing conversation assignments.
Avoid a mismatch between the space that receives evidence and the Skills the same conversation consumes.

The user was asked whether Learn uses saved conversation evidence or also starts a file-inspection session.
Until answered, saved conversation evidence is the working assumption; no new model session was started.

## Foundation implemented

The workspace registry now stores an independent Learning choice in `workspace_learning`.
An absent row inherits the application default; null explicitly disables assignment.
A saved choice survives restart, removal, and reopening of the same workspace.
The setter validates stable container IDs. Its caller must verify container existence through Intelligence before saving.
This metadata does not store transcripts or change backend thread assignments.
The new methods are not yet connected to HTTP, runtime selection, or the browser.

Two regression tests failed before implementation because the assignment methods were absent.
After implementation, all three workspace registry tests passed.
A full check found and then prompted correction of a test variable type; the rerun is recorded separately.

## Remaining delivery gates

1. Resolve management authorization and reuse existing backend services through an explicit supported API.
2. Design SDK methods and response types against those contracts; test authorization, errors, cancellation, and bounded responses.
3. Add focused upstream draft PRs above the current remote tips and register native stack membership.
4. Complete workspace assignment and conversation-consistent Skill delivery without disrupting active turns.
5. Produce the required UI concept and state study before UI implementation.
6. Build an isolated browser fixture and implement assignment, Learn progress, and Skill review.
7. Run a fresh task-first reviewer, then the Impeccable visual reviewer; record separate usability, visual, and technical verdicts.
8. Publish exact-commit SDK, chart, image, and CLI previews under the weekend runbook.
9. Pin public artifacts, verify checksums and frozen installation, and update the candidate ledger.
10. Prove real Learning, candidate evidence and publication, next-turn Skill delivery, restart, and workspace isolation.
11. Run required checks and affected browser tests, merge into local main, then verify the active merged checkout.

No fixture or unit result proves real Learning. No source edit proves a published preview or installed acceptance.

## Foundation verification

- `pnpm test tests/workspaces.test.ts`: 3 passed after the two expected pre-fix failures.
- `pnpm check`: passed; 37 test files, 202 passed tests, 47 skipped tests, and production builds.
- `node --test example/greet.test.js`: 1 passed.
- `git diff --check`: passed.

Browser tests did not run because this foundation changes no visible behavior.
The skipped tests and these deterministic results do not establish live backend or model acceptance.

## Intelligence API layer — 2026-10-24

[Draft PR #2068](https://github.com/CopilotKit/Intelligence/pull/2068) is registered in native stack #2064 at position 3.
The ordered stack is #2041, #2063, #2068. GitHub confirmed the new head as `985175b7747fc3c0fe61573b0e8a6b9102eb49c8`.
The worktree is `../Intelligence-workspace-learning`, branch `feat/workspace-learning`.
The parent remained `7cab78803075816a27f7ccaa8a753ce828b51628` when the PR was opened.

The API adds project-key container discovery, container detail, run reads/start, candidate reads/review, and Insight evidence reads.
It reuses the existing scoped stores, entitlement gates, manual run admission, queue recovery, and publication transactions.
Scope comes only from the verified key. Reviews identify the calling key as `api-key:<id>`.
Runtime keys now have documented Learning review authority. Application servers must authorize their own browser users.
The browser must never receive that key.

The API design and task review are in the upstream `docs/contracts/runtime-learning.md`.
Container pages retain the existing 500-item cursor pagination. Candidate lists retain 500 entries; run lists retain 100.
No new transcript ingress, Thread reassignment, or shared deployment change is included.

Validation:

- Focused Vitest suite: 94 passed across seven files, including existing candidate publication and run start behavior.
- `NX_DAEMON=false pnpm nx run @cpki/app-api:typecheck`: passed.
- `NX_DAEMON=false pnpm nx run @cpki/app-api:lint`: passed with existing project warnings; changed-file ESLint passed without warnings.
- `NX_DAEMON=false pnpm nx build @cpki/app-api`: passed.
- `pnpm docs:check` and `git diff --check`: passed.

The full `tsc -p apps/app-api/tsconfig.spec.json --noEmit` command failed because its project references are incomplete.
It also identified a fixture type mismatch, which was fixed.
A temporary configuration based on `tsconfig.app.json` references then typechecked the new runtime Learning and authentication tests.
The temporary configuration was removed from the worktree; its copy is `/tmp/workspace-learning-api-test-type-config.json`.
Logs use `/tmp/workspace-learning-api-*` and are not release evidence artifacts.

Regression stages observed missing-route 404s before discovery, reads, run start, and review implementation.
A production pre-authentication test caught missing browser-credential refusal; the new routes now reject those credentials before session handling.
The production route-registration test now verifies that the runtime API-key guard reaches this API alongside the existing product guard.

Next: implement typed management methods in the CopilotKit runtime SDK above #7966, cross-link the companion PRs, then build the UI.
The user has not answered the optional evidence-source question. Continue with saved conversations as the stated assumption.

## SDK and UI study — 2026-10-24

[CopilotKit draft #7977](https://github.com/CopilotKit/CopilotKit/pull/7977) is in native stack #7978,
ordered #7966 then #7977. GitHub confirmed head `ac77c6e91eba024dcdd47c4602846b1f4c487c39`.
The companion PRs cross-link each other. Both upstream worktrees are clean.
The SDK adds typed management methods, bounded validated responses, cancellation through body reads,
a 30-second deadline, and safe platform errors. Writes have no automatic retries.
It also exposes the existing backend Thread membership fields without changing wire behavior.

Validation: 227 Intelligence platform tests passed before the additive Thread type fix;
all seven management tests and runtime typecheck passed afterward.
Runtime build/declaration validation passed, including Express 4/5 fixtures.
Both commits passed the required affected-package test/publint/attw hook.
The first hook ran 2,983 runtime tests in 203 files. Changed-file lint and formatting passed.
The backend's full CI and delivery acceptance workflows now report success.
These checks do not replace installed starter acceptance.
SDK preview runs for the superseded `2037477` head were cancelled.
Current exact-head push preview: https://github.com/CopilotKit/CopilotKit/actions/runs/40148666525
Current exact-head PR preview: https://github.com/CopilotKit/CopilotKit/actions/runs/40148670586
Both were still building when recorded. No new chart/CLI candidate was dispatched yet.

The required ImageGen [component/state study](states.png) was produced from a fresh capture
of the running incumbent workspace. Its prompt sidecar and embedded provenance are present.
It covers assignment, the Skill list, review/evidence, and mobile running/error states.
This is a code-led local extension under the current Impeccable Operate guidance.
It is not a new-world comp round or an approved pixel contract.
The generated outlines, invented progress counts, dates, and evidence counts must not be copied.
The existing borderless controls and real API data take precedence.
The concrete control sequence and a spatial sketch were shown in the conversation.
The six-block direction contract is `.impeccable/surfaces/src-client-components-learning-panel-tsx.md`.
`IMPROVEMENTS.md` was rechecked and left unchanged.

Runtime integration design: select new conversation assignment from the workspace setting;
read existing memberships from Intelligence rather than inventing a local transcript mapping.
A per-session Skill source must use that conversation's confirmed membership on each turn,
with zero freshness window and stale-snapshot rejection. Multi-membership responses must
remain explicit, and a missing membership field must not be guessed from the new workspace choice.
The selector executes before the SDK gets or creates the Thread, as verified in the installed-source analogue.
No runtime, HTTP, or UI behavior for the new controls is implemented yet.

### Preview publication progress

The SDK push workflow `40148666525` succeeded at exact head `ac77c6e91eba024dcdd47c4602846b1f4c487c39`.
All 15 public SDK archives downloaded through anonymous curl; package names, versions,
SHA-256/SHA-512 checksums, and matching preview dependency commits were verified.
Private download staging and the new archive record are under `.data/workspace-learning/sdk-ac77c6e/`.
Python urllib received HTTP 403; curl succeeded. No credentials were needed.

The live main checkout has advanced to `93467d9` and now includes `docs/WEEKEND-DELIVERY.md`.
Its runbook explicitly requires a candidate version newer than the installed local release.
The current ledger records installed chart `0.15.1-validation.7cab78803075`.
The new candidate therefore uses base `0.15.1`, yielding `0.15.1-validation.985175b7747f`.
CLI version is `4.30.0-pre.985175b`; planned template pin is the verified SDK full SHA.
The API commit has no migration or support-input differences from `7cab788`.
The reviewed schema identity and compatibility declaration remain unchanged.
`release-chart.yml` was dispatched with `mode=validate_release`, `publish_local_candidate=true`,
`local_candidate_support=scripts/local-evaluation-support.json`, and the exact CLI version.
Shared promotions, upstream merges, and stable package publication remain outside this delivery.
Do not dispatch the matching CLI until the candidate chart and images pass verification.

Main still has the user's unrelated Monday checklist edit. Preserve it and the newer merged work.
The starter worktree remains based on `6f57039`; integrate current main before final delivery checks.
