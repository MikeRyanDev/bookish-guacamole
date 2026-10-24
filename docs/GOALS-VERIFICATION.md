# Goal delivery verification

Verified 2026-10-23 in the `feat/goal-composer` worktree, integrated with local
main `7891bf5`. The existing native TanStack Goal plugin supplies continuation;
no package upgrades or backend deployment changes were required.

## Deterministic checks

- `pnpm check`: passed after integration. 18 test files, 123 passing tests,
  49 declared persistence-store skips; lint, source design checks, TypeScript,
  and production builds passed. Existing large-chunk warnings remain.
- `pnpm test tests/goals.test.ts tests/bridge.test.ts`: 24 passing tests.
  The initial continuation regression first failed (one turn instead of two).
  The ordinary-follow-up state regression also failed before its bridge fix.
- `node --test example/greet.test.js`: passed.
- `git diff --check`: passed.
- `pnpm format:check`: failed on the unchanged baseline formatting in
  `docs/AGENT-SKILLS.md`. A comparison against `git show HEAD:docs/AGENT-SKILLS.md`
  confirmed it predates this feature. All Goal delivery files pass an explicit
  `pnpm exec oxfmt --check` invocation. The unrelated generated guide was preserved.

Goal tests use the real harness and scripted providers. They cover multiple
queued rounds, outer event identity, state publication, completion, round limits,
judge/provider failure, cancellation, approval resolution exactly once, pending
interrupt guards, restart with SQLite, duplicate command IDs, concurrent admission,
thread isolation, and refusal to replace an unfinished objective.

## Browser and rendered checks

Production app: `PORT=4183 pnpm start` after `pnpm check` built the integrated tree.
These environment variables selected isolated app and fixture ports:

```sh
FILE_VIEWER_APP_URL=http://127.0.0.1:4183
FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4194
```

With both variables exported, these commands passed:

```sh
pnpm test:e2e e2e/goals.spec.ts e2e/workspace.spec.ts e2e/tool-stack.spec.ts \
  e2e/tool-replay.spec.ts e2e/tool-approvals.spec.ts \
  e2e/thread-navigation.spec.ts e2e/design.spec.ts
pnpm design:browser
```

The combined suite passed 20 tests, with two explicit live-model skips.
The rendered design command separately passed its full theme/viewport matrix.
Goal checks cover draft retention, mode switching, accessible names, disabled
empty submission, keyboard disclosure, long objectives, controls, mobile overflow,
and axe checks in both themes. Existing approval, navigation, workspace, and grouped
activity checks passed with the combined composer.

An initial fixture run accidentally reused another worktree's server at port 4184.
Port 4194 fixed that test setup. A dev HMR socket conflict caused an initial workspace
browser failure; testing the production build eliminated that conflict.

## Real model and Intelligence evidence

With the same app/fixture URL variables:

```sh
LIVE_MODEL=1 pnpm test:e2e e2e/goals.spec.ts -g 'live Goal'
LIVE_MODEL=1 LIVE_LEARNING=1 pnpm test:e2e e2e/live-learning.spec.ts
```

Both passed against the installed local backend. Goal thread
`482b29f7-f7b8-4f11-8e19-fef231074d53` read the greeting project, requested
approval for `npm test`, ran the approved command, resumed the Goal loop, and
persisted the judge's completed state. Reload restored the objective and response.
The test read backend events and confirmed no decode errors or truncation.
Earlier Goal thread `f4cce543-ae7d-448d-90c6-4ebe8b263712` also restored its completed
state after the app was stopped and the integrated production build was started.

Learning-consumption thread `3445fae6-cf3c-4f90-8408-14dea4595000` loaded the already
published `regression-only-coverage` Skill and restored its response after reload.
This proves continued consumption of real Learning output; this delivery did not
run a new Learning generation or publish another Skill.

Raw events, model output, and captures stay ignored under `.data/goals/` and
`.data/flue2-browser-learning-proof.json`. Test-generated changes to unrelated
committed screenshots were restored.

## Visual review and limits

Complete-goal and draft captures were inspected at 1440×960 and 390×844 in both
themes. The Impeccable finish reviewer returned `ship` for the complete surface;
a later draft contrast finding was resolved by correcting capture setup. The
actual theme control sets both the theme and accent. Captures now wait for its
computed colors and disable motion. Enabled Start goal contrast is 6.69:1 in
light mode and 9.76:1 in dark mode. The documenter confirmed existing tokens and
rules apply without a new design system or duplicate surface brief.

Paused/pending controls have deterministic and live interaction coverage, but
were not part of the reviewer's static screenshot verdict. Completion remains
model assessment of a bounded transcript excerpt, not an independent verifier.
Resume resets the native round count. A cancelled run can replay its last active
snapshot; when idle, the UI labels that state “Ready to resume” and the next
command reads authoritative native state. No hosted or multi-user guarantees,
new package release, or weekend candidate publication are claimed.
