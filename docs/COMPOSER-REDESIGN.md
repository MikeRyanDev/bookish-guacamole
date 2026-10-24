# Clear goal creation

The user rejected the previous composer because Message hid goal creation and
20 rounds looked editable but opened help. This redesign replaces those interactions.
It preserves the existing visual system and backend Goal contract.

## Interaction contract

The user task is to give the agent a persistent objective, understand continuation,
and inspect or control the work while retaining a normal message draft.

| Starting state   | Control                 | Result                                                      | Exit                               |
| ---------------- | ----------------------- | ----------------------------------------------------------- | ---------------------------------- |
| Message composer | Create goal             | Opens a New goal form with a separate objective draft       | Cancel restores the message draft  |
| New goal form    | Start goal              | Starts the objective and returns focus to the message field | Stop run pauses active work        |
| Goal exists      | View goal               | Shows objective, status, progress, and named actions        | Escape, Close, or outside click    |
| Goal details     | Stop goal / Resume goal | Stops or resumes the same objective                         | Status reports the resulting state |

Continuation and the fixed limit appear as explanatory text before submission.
There is no clickable Message label or numeric help control.
Unsubmitted objective drafts survive cancellation. Submitted objectives clear only their own draft.

Opening creation intentionally expands the composer. Persisted state changes and
opening goal details preserve transcript geometry. Viewport resizing follows the
latest output only when the reader was already at the end.

This is a local interaction correction within the existing Operate surface.
It uses existing typography, colors, controls, and layout rather than a new visual identity.
The concrete controls and click sequence were presented before implementation.
The quality bar is discoverability, truthful affordances, preserved drafts, keyboard continuity,
reachable actions, and stable reading position.

## Usability evidence

A fresh reviewer received only the task, reviewer instructions, and an isolated
preview URL. It recorded predictions before interacting or reading implementation.
The reviewer completed creation, cancellation, inspection, stopping, and resuming
at 390px width. Labels matched its predictions, and the continuation explanation
was understandable before submission. Desktop layout and keyboard details were also inspected.

The reviewer returned `usability: pass` for the simulated component workflow.
It identified a minor focus loss after submission. A regression test reproduced it.
After the fix, the reviewer verified focus returned to the message field, with
View goal next in the tab order. No focus issue remained in that path.
The preview uses production components and a simulated agent; this review alone
makes no claim about backend continuation or persistence.

## Technical evidence

- Discovery regression: failed on the old UI because Create goal was absent; passed after replacement.
- Resize regression: failed when opening creation left an 87px gap below the transcript; passed after correcting end-following.
- Focus regression: failed before focus restoration; passed afterward.
- `pnpm check`: passed lint, source design checks, both TypeScript projects, 134 tests, and both builds. The suite skipped 49 declared opt-in tests.
- `node --test example/greet.test.js`: one passed.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4213 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4214 pnpm test:e2e e2e/composer-discovery.spec.ts e2e/composer.spec.ts e2e/goals.spec.ts e2e/virtual-transcript.spec.ts e2e/tool-stack.spec.ts e2e/tool-polish.spec.ts`: 22 passed, one live test skipped.
- After focus restoration, the composer discovery, composer, and app Goal suites passed again: 11 passed, one live test skipped.
- `FILE_VIEWER_APP_URL=http://127.0.0.1:4213 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4214 LIVE_MODEL=1 pnpm test:e2e e2e/goals.spec.ts`: three passed, including real goal execution, approval, resume, completion, reload, and saved Intelligence events.

The live run used a disposable local copy of the example workspace and requested no file edits.
No packages, shared deployment, or runtime Goal policy changed.
The existing virtualizer fixtures still emit ResizeObserver delivery warnings;
scrolling and disclosure assertions pass. Source detection returned no findings.
Private captures and backend event evidence remain ignored in the worktree.
