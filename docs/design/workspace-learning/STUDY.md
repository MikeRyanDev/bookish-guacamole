# Workspace Learning delivery

Status: Complete. UI reviews, deterministic checks, corrected preview publication, real installed Learning acceptance, local-main merge, and active-app verification passed.

## Scope

Assign a Learning space to each workspace, start Learning from the UI, and review proposed and published Skills.
Merge the verified starter work into local main with matching public preview builds.
Keep upstream weekend PRs open. Follow `docs/WEEKEND-DELIVERY.md` from the alpha delivery branch and its candidate ledger.
The runbook is available in the main checkout. It governs exact preview publication and installed acceptance.

## Initial discovery evidence — 2026-10-24

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
The starter worktree now includes main `93467d9` through a clean merge. Its new execution-output UI and tests are preserved.
The user's uncommitted main checklist edit remains untouched.

Candidate workflow: https://github.com/CopilotKit/Intelligence/actions/runs/40148976596
GitHub confirmed the exact head `985175b7747fc3c0fe61573b0e8a6b9102eb49c8`; publication is in progress.

## Current implementation and verification — 2026-10-24

The UI and local API implementation are present. Installed preview acceptance and final merge remain pending.
The SDK head is `31af02d9455bd0bd78f4da40a68661bfa9fceb63`.
Its successful publication run is `40149647070`. All 15 public SDK archives have recorded SHA-256 and SHA-512 checksums.
The starter uses these archives and passed a frozen install.

A strict starter consumer exposed optional fields and missing nulls in the previous SDK declaration output.
Explicit public wire interfaces corrected this issue. A strict consumer fixture now checks built declarations and source schema compatibility.
The new SDK pin required a new Intelligence candidate identity before CLI publication.
The frozen Intelligence head is `cdbc41f2e28e8d38b01558e2779d7115291a2a2f`.
Candidate run `40149932728` uses chart `0.15.1-validation.cdbc41f2e28e` and CLI `4.30.0-pre.cdbc41f`.
The earlier `985175b` candidate is superseded. Its CLI was not published for this delivery.

The local UI assigns a verified space, starts Learning, displays run progress, and reviews instructions and cited evidence.
It separates proposed and published Skills. The server resolves established conversation memberships before assignment and Skill delivery.
Failed refreshes do not reuse stale instructions. Failed review writes require a successful state refresh before another decision.
A failing browser regression exposed stale proposals after delayed run completion. The completed run identity now refreshes the proposal query.

`pnpm check` passed: 42 test files, 212 tests passed, and 47 optional live tests skipped.
`node --test example/greet.test.js` passed one test.
The affected file-viewer browser tests passed 10 tests.
The Learning browser suite passed four tests after fixes, including mobile axe checks and review recovery.
The full browser design scan and installed acceptance remain separate gates.

The fresh usability reviewer completed assignment, learning, evidence review, approval, published inspection, and mobile rejection.
Workspace choices survived switching and reload. A fixture anomaly shared decisions across spaces and is corrected.
A repeat desktop review checks the corrected incumbent inspector width and independent space decisions.
The ImageGen study remains a design reference, not a pixel contract. No generated raster ships inside the product UI.

## Impeccable documentation handoff — 2026-10-24

Documentation disposition: complete for this ordinary code-led Operate extension.
The implementation preserves the incumbent Manrope typography, configurable accents,
charcoal dark surfaces, flat rows, borderless controls, and inspector layout.
Assignment, shared-space scope, progress, evidence, and explicit review decisions remain task-specific UI.
No design-system change or redesign was approved; `DESIGN.md` and `.impeccable/design.json` remain unchanged.

The documenter inspected `learning-panel.tsx`, `inspector.tsx`, `src/client/workspace.tsx`,
and the Learning styles against `PRODUCT.md`, `DESIGN.md`, and the surface direction contract.
All seven `.impeccable/review/learning-*.png` captures were inspected:
`desktop`, `desktop-review`, `desktop-decision`, `mobile-error`, `mobile-running`,
`mobile-review`, and `mobile-decision`. They show the incumbent 290px desktop inspector
and full-width mobile panel, including scrolled evidence and decision controls.
The visual reviewer reported **ship** for all seven captures.
The fresh usability review reported passed desktop and mobile tasks and independent decisions across two spaces.
These are separate review verdicts; this documentation pass did not rerun browser interactions or technical checks.
Fixture screenshots and usability results do not prove installed backend acceptance or real Learning.

Pre-existing documentation drift remains: the sidecar activity-summary snippet uses
weight 600, while the incumbent source and `DESIGN.md` specify 550 for the activity count.
The source value is also present in the committed baseline. This extension does not repair that drift
or turn its local spacing and heading choices into new global tokens.

The `states.png.json` sidecar records `image_gen.imagegen`, the study prompt, its reference
capture, and its illustrative role. The raster is a component/state study, not an approved pixel contract.
No reference to that raster exists in product source; no generated raster ships in this UI.
The generated outlines and illustrative data remain excluded from the implementation.

## Publication retry and final fixture checks

Candidate run `40149932728` attempt 1 hit the ARM64 composite job's 15-minute timeout.
The log stopped at `mix compile && mix release` after the Node builds passed.
The failed job and dependent jobs were retried at the same frozen commit and workflow inputs.
No matching CLI was published before candidate verification.

Local main advanced to `fb3f21d` with an undo conflict fix. That work merged cleanly into this isolated branch.
The subsequent `pnpm check` passed with 42 files and 212 tests, plus 47 skipped optional live tests.
The expanded Learning browser suite passed eight tests across both themes and desktop/mobile sizes.
It includes keyboard Save, reduced motion, published Skill reading, axe checks, and uncertain review recovery.
`pnpm design:browser --output=.data/workspace-learning/design-results` passed.
The first design scan lost its trace files because concurrent Playwright runs shared an output directory.
The isolated retry resolved that infrastructure failure.

`pnpm format:check` reports existing formatting in the Monday checklist, `docs/VERIFICATION.md`, and `docs/design/permissions/STUDY.md`.
These unrelated files remain unchanged by this implementation. Changed files were formatted, and `git diff --check` passed.
A fresh public clone at `a2484923abef9c7f8e49d07d273a6f1bfd9cae4d` is prepared for installed acceptance.
It contains the reviewed starter source overlay, without private SDK links, backend state, or copied dependencies.

## Published preview and installation recovery

Candidate workflow `40149932728` attempt 2 and CLI workflow `40151464135` passed.
Independent anonymous downloads verified the chart checksum and all eight AMD64/ARM64 image indexes.
The candidate record SHA-256 is `f93826a7969332c961e4dd4033b994a2a799bf7a18a014c8533775e288019b80`.
The CLI archive SHA-256 is `581472c3fc6c7cd66ce107e10c7c11094215eaec0e442ec3e60d16935b32e779`.
The CLI embeds Intelligence `cdbc41f2e28e8d38b01558e2779d7115291a2a2f`, SDK `31af02d9455bd0bd78f4da40a68661bfa9fceb63`, and chart `0.15.1-validation.cdbc41f2e28e`.
All 16 preview archives have SHA-512 lockfile integrity. Frozen installs and `pnpm check` passed in both checkouts.
The isolated clone authenticated through the existing CLI session and started normal setup with the configured Learning model.

The host exhausted disk space during installation. Setup stopped before service readiness.
Completed API/SDK worktree dependency installations were removed, without changing their source or commits.
Standard `pnpm store prune` removed unreferenced cached packages and recovered about 10 GiB.
Docker reported that it could not start. The stalled Docker control process was restarted after the VM stopped. The engine recovered, and both existing stacks returned to running service readiness.
Normal setup resumed with the saved isolated stack and model configuration.
No container, volume, source work, or unrelated checkout was deleted.
Installed Learning proof and final starter merge remain pending.

Full-app production navigation passed four tests, including mobile panels and both-theme WCAG AA scans.
The accessibility test now waits for the existing panel entrance animation before measuring contrast.
The development-only file-entry test passed with the development Inspector present.
The initial development navigation test reported a WebSocket error while the HMR port was occupied.
Production navigation passed without that error.

## Installed timestamp regression and corrected candidate

A second fresh public clone completed normal setup and connection with candidate `cdbc41f`.
Its object-storage executable matched the working stacks. The first failed stack retained different executable bytes after the disk failure; it was stopped and preserved.
The clean installation created three Learning containers through the published CLI.
The new runtime container endpoint returned HTTP 500: PostgreSQL supplied `Date` values, while the route validated string timestamps before JSON serialization.
No real model turn ran before this failure.

Intelligence commit `4a801b8a843b5fcb6e171b99a1d3269774ad0580` normalizes container dates before response validation.
The regression uses real store functions with PostgreSQL-shaped query rows. It failed with HTTP 500 before the fix, then passed for list and detail responses.
The other new routes already use Express JSON serialization for date values.
The focused runtime, control, candidate-review, and evidence suites passed 70 tests across four files.
`NX_DAEMON=false pnpm nx run-many -t typecheck,lint,build -p @cpki/app-api` passed; lint reported 201 existing warnings and no errors.
The full test TypeScript configuration reports unrelated existing errors. A temporary config extending the application config checked the changed test and its imports successfully.
Local API checks reused the main checkout's installed dependency tree after confirming identical lockfile hashes. Installed acceptance continues to use public archives only.

Candidate workflow `40153678137` targets exact Intelligence commit `4a801b8a843b5fcb6e171b99a1d3269774ad0580` with chart base `0.15.2`.
The higher base sorts after the already-installed `0.15.1-validation.cdbc41f2e28e`.
SDK commit `31af02d9455bd0bd78f4da40a68661bfa9fceb63` remains unchanged.
Publication, installed acceptance, and the final starter merge remain pending.

## Full-header layout correction

A screenshot from the real installed app exposed overlap between the header's Learning and Files labels.
The earlier visual review covered the panel and did not assess these surrounding header controls.
Both labels inherited the icon-only 32px button width. The header now sizes text buttons to their content with existing compact padding.
New browser regressions failed at 390px and 1440px before the CSS change, then passed after rebuilding and restarting the production app.
All six production workspace navigation/accessibility tests passed, including both label-fit and click-outcome regressions.
The first post-build run used a process with stale asset paths and rendered blank pages; restarting the production process resolved that setup error.
A fresh visual reviewer assessed the actual header at both widths in light and dark themes and returned `ship`.
Its four captures remain ignored under `.impeccable/review/header-*`.
`pnpm check` passed again: 42 files, 212 tests, 47 optional live skips. `node --test example/greet.test.js` passed one test.

Corrected candidate workflow `40153678137` passed at exact commit `4a801b8a843b5fcb6e171b99a1d3269774ad0580`.
Independent anonymous downloads verified the chart and all eight image indexes for AMD64 and ARM64.
Candidate SHA-256: `2af865aff80fe3d05f2b70047502c7d9fbc5a4408703d2626f5aaef996c0af46`.
Chart SHA-256: `cb67fe3f18108901be14fac80ecaca7526f8ccd6a05665d4ea3f43ac7c6581c6`.
Matching CLI workflow `40154623137` is running at the same source commit with template `31af02d9455bd0bd78f4da40a68661bfa9fceb63`.
The rendered design scan passed after the header correction; its fixture logged non-failing ResizeObserver notifications.

Matching CLI workflow `40154623137` passed. Its public archive SHA-256 is `d77b9df7e7f5b9f73697f1a3ee0d6fe2efaa977130bdd5f27833e6d5428f3c45`.
The archive embeds the expected Intelligence and SDK commits and chart `0.15.2-validation.4a801b8a843b`.
All 16 preview integrities were pinned again. Frozen installs passed in the worktree and isolated public clone.
The published CLI's normal `local update --json` is running against the isolated stack.

## Real installed Learning and conversation scope

The normal update completed on the isolated macOS ARM64 stack. The three existing Learning containers remained available.
The public SDK now lists them with string timestamps; the prior HTTP 500 is resolved.
Two real GPT-6 Luna turns saved conversation `cebc2151-f65e-4fd0-bd30-5dbb3ba9191c` in `workspace-learning-review`.
The first turn ran one explicitly approved `npm test`: one test passed and no file edits occurred.
Browser reload preserved the answer. A second workspace retained an independent Off assignment.

The UI's Learn action started run `01a170ea-d0c8-7a11-8657-d8333e6cf9a8`, which succeeded with one candidate.
Candidate `01a170eb-4054-713d-a4de-7b30c246ca99` proposes `evidence-first-regression-testing`.
Its Insight `01a170eb-4053-72a8-86f3-aa6b4c6625d5` cites three messages from the real saved conversation.
The instructions match the explicit user procedure: focused failing test, minimal change, same-test verification, and separate Baseline/Change/Verification reporting.
The generated description repeats “when”; that wording flaw does not change the supported instructions.
The review UI displayed the evidence and approved the candidate. Published skills then displayed the saved Skill.

The next turn called `load_skill` and received the published instructions. No app restart occurred: PID 20552 served approval and delivery.
The conversation's 111 persisted events had no decode errors or truncation after that turn.
Changing the workspace to `workspace-learning-other` preserved the original conversation's membership and another successful Skill load.
New conversation `b3b6d777-c221-427b-9525-6c2401737eba` used `workspace-learning-other`.
The second workspace remained Off. The default workspace was restored to `workspace-learning-review` after this check.
App/stack restart recovery and Learning runtime recycling are the remaining installed checks.

App and stack restart recovery passed. A further turn loaded the published Skill; all 155 events decoded with no truncation and the original shell call count remained one.
Learning pod UID changed from `3e5809c0-a034-4169-9c6e-cd88e2a99600` to `fb6352ef-58d5-43f5-bd64-3d444fb9f29b` after deployment recycling.
The subsequent UI Learning run `01a170ef-8259-7cf2-9051-4f09cb7207d6` succeeded with no new proposals.
Installed acceptance is complete. See `docs/VERIFICATION.md` for exact artifacts, commands, proof, and untested platforms.

Implementation commit `5da6095` merged into local main. The merged check passed 212 tests with 47 optional skips; 24 affected browser tests passed.
Main's existing stack updated normally to the corrected candidate. The active port 4173 process points to the main checkout.
The user's existing browser tab retained its workspace and conversation and displayed the Learning controls and published Skills without errors.
The user's uncommitted Monday checklist additions were preserved exactly. Upstream PRs remain open; stable publication gates remain separate.
