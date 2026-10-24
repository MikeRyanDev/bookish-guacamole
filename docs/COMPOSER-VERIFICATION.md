# Integrated composer verification

Date: 2026-10-23. Worktree: `design/integrated-goal-composer`.
Base: `2f37bcc`; integrated concurrent tool changes through `9bdbe42` before final checks.

The old goal region reduced the transcript height by 87 pixels when a goal appeared.
The new regression failed before the fix. Goal state now occupies the composer toolbar.
Details open above the composer without changing transcript geometry.
The draft grows to a limit, then scrolls internally.

## Commands and results

- `pnpm check`: passed lint, design detection, TypeScript, 129 tests, and both builds. The suite skipped 49 opt-in tests.
- `node --test example/greet.test.js`: passed one test.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4203 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4204 pnpm test:e2e e2e/composer.spec.ts e2e/goals.spec.ts e2e/virtual-transcript.spec.ts e2e/tool-stack.spec.ts e2e/tool-polish.spec.ts`: 20 passed; one live-model test skipped.
- `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4206 pnpm design:browser`: passed the rendered tool and approval scan.
- The Impeccable detector returned no findings for the changed components and stylesheet.

Browser checks cover both themes, desktop, mobile, and a short mobile viewport.
They cover empty and restoring sessions, active/paused/completed/stopped goals, approvals,
errors, long objectives, long drafts, keyboard access, and dismissal.
They verify stable transcript geometry, preserved reading position, streaming follow,
and Jump to latest. Axe checks cover the goal details and actual app composer.

The composer fixture uses production components with synthetic transcript data.
Actual app checks use the local server without sending model requests.
No new live-model or backend persistence claim is made here.
The existing Goal implementation and its backend evidence remain unchanged.

The first combined browser attempt had an artifact collision because two Playwright
commands shared an output directory. Sequential reruns passed.
Existing virtual-transcript fixtures still emit ResizeObserver delivery warnings.
Their scroll and disclosure assertions pass; this change does not alter the virtualizer.

Screenshots remain in the worktree's ignored `.impeccable/review/` directory.
They include the actual app, goal details, goal help, approvals, and long content.

The independent Impeccable finish reviewer returned `ship` with no material fixes.
The review covered all 17 captures against the existing design system and composer contract.
It did not independently execute tests or claim live persistence proof.
The documenter confirmed that the existing design system covers this extension.
Pre-existing sidecar tool/activity font-weight drift remains outside this change.
