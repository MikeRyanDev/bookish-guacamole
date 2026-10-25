# Execute TypeScript inspection

Implemented in `design/execute-typescript` from local main `c10d813`.
The task is to inspect the submitted TypeScript and returned output without changing transcript ownership or established call rendering.

## Discovery and direction

The main checkout used the generic fallback for `execute_typescript`. The concurrent capabilities worktree supplies Code Mode. Its installed `@tanstack/ai-code-mode` source defines `typescriptCode` input and a `{ success, result?, logs?, error? }` result envelope. This change supports that contract without enabling or changing execution.

This is an Operate component extension of the established workspace, using a code-led process. The [pre-implementation image study](concept-study.png) was generated with the built-in image tool from [this prompt](concept-study.prompt.txt). It explores stacked source/output across themes and states. It is not an approved pixel specification. The generated borders, extra completion text, and invented example API were not adopted. Existing flat rows, typography, icons, neutral surfaces, and status conventions remain authoritative.

A stacked view exposes both sides of execution in one disclosure. Tabs would hide one side during comparison; a separate modal would interrupt the conversation. The optional user preference probe received no answer, so the stated stacked assumption proceeded. No new visual system or concept seed applies to this local extension.

| Task               | Visible control               | Click result                                                  | Exit/recovery                           |
| ------------------ | ----------------------------- | ------------------------------------------------------------- | --------------------------------------- |
| Inspect execution  | Execute TypeScript            | Opens source above output                                     | Collapse the same row                   |
| Copy source        | Copy TypeScript icon          | Copies exact source, including whitespace                     | Select text if clipboard access fails   |
| Copy response      | Copy output icon              | Copies original decoded response, without display indentation | Visible copy failure and text selection |
| Inspect arguments  | Raw details                   | Shows original argument JSON                                  | Collapse disclosure                     |
| Read long evidence | Focusable source/output areas | Keyboard or pointer scrolls bounded content                   | Tab moves to the next action            |

## States and invariants

- Completed calls retain collapsed defaults and existing completed-activity grouping.
- Running, approval and failed calls retain existing open defaults. Explicit reader choices remain owned by `useToolDisclosure`.
- Partial arguments show Receiving TypeScript and original raw arguments. Missing or malformed source shows an explicit explanation; an empty source string has its own state.
- Running output says Waiting for output. Pending approval says Awaiting approval. Missing terminal output says No result received; the renderer does not invent cancellation or success.
- Empty response says No output. Structured responses retain every field. Display-only JSON indentation preserves numeric literals and escape sequences; copy preserves the original response text.
- Native `success: false` is classified only for `execute_typescript`. This preserves the existing invariant that failures stay outside completed activity groups. Other tool outcome contracts and the grouping algorithm are unchanged.
- Denials, timeout/syntax/runtime error payloads, scalar output, malformed output, HTML-like text, long source/output, copy success/failure, keyboard focus, reduced motion, and narrow layouts are considered. Cancellation without a supplied result remains a missing result.
- No retry/run control, transcript store, renderer registration, approval transport, runtime change, dependency change, or new permission behavior is introduced.

## Review evidence

Usability: independent fresh reviewer passed the inspection/copy task using the runnable fixture, keyboard, clipboard, state selector, and 390 × 844 viewport. Initial prediction was to expand Execute TypeScript, then inspect source and output. Controls matched that prediction. The reviewer found compact JSON harder to scan on mobile. After display indentation, a scoped follow-up confirmed the error message and line number were easy to scan and exact-output copying met expectations.

Visual: independent finish reviewer returned **ship** with no material fixes. All seven required captures matched the incumbent system and the direction contract. Current captures use production fonts and disabled motion, in both themes at 1440px and 390px. The generated study is not fidelity evidence.

Technical evidence is deterministic. The fixture never executes code. No new model, Learning, live backend, or publication acceptance is claimed. The runtime is not enabled on the starting main checkout; integration with concurrent capabilities remains separate.

## Validation

- Regression-first: the one-disclosure browser test failed because the source preview did not exist. The native failure test failed because `success: false` was treated as completed activity.
- `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4207 pnpm test:e2e e2e/typescript-tool.spec.ts`: 5 passed. Covers exact source/copy, all fixture states, safe text rendering, bounded scrolling, keyboard, both themes/widths with axe, stream identity/disclosure choice, and large numeric literals/escaped JSON.
- `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4207 pnpm test:e2e e2e/tool-renderers.spec.ts e2e/tool-stack.spec.ts e2e/tool-polish.spec.ts e2e/tool-approvals.spec.ts e2e/tool-disclosure.spec.ts e2e/motion.spec.ts e2e/virtual-transcript.spec.ts`: 23 passed. Existing grouping, remount retention, inspection anchoring, approvals, retry, copy, fonts, reduced motion, and scroll following passed.
- `node --test example/greet.test.js`: 1 passed.
- `pnpm check`: passed lint, source design check, typechecks, 179 tests (47 declared skips), and browser/server builds. Existing palette/radius advisories and large-chunk warning remain.
- `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4207 pnpm design:browser`: passed tool/approval surfaces, including TypeScript, in both themes and widths. An earlier run collided with another Playwright run sharing its output directory; sequential rerun passed.
- Formatting and merged-tree checks are recorded below after integration.

Historical screenshot files rewritten by existing tests were restored in the isolated worktree. New automated screenshots go to ignored Playwright output. Curated final captures in this study use synthetic data only.

Final synthetic captures: [light desktop](light-desktop.png), [dark mobile](dark-mobile.png), [error mobile](error-mobile.png). These are browser captures, not generated assets.
