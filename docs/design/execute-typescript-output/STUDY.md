# TypeScript execution output

The previous renderer displayed the full JSON envelope as output. This revision makes the native execution outcome and evidence readable directly.

## Direction and controls

This is a code-led extension of the existing tool surface. The exploratory image (`concept.png`, prompt embedded and saved alongside it) informed the state hierarchy. It is not an approved pixel specification. Existing typography, colors, borderless controls, grouping, and disclosure ownership remain in use.

The TypeScript block has 16px padding on all sides. Expand the call to see source, outcome, return value, and console output. Each evidence section has an exact-text copy action. Stack trace and Raw response disclosures expose additional diagnostics. Raw details retains the original tool arguments. No execution or retry control is added.

| State                                        | Presentation                                                     |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Native success                               | Completed; syntax-highlighted return value and console output    |
| Native failure                               | Execution failed; error name, line, and message before evidence  |
| Partial failure                              | Partial return value and preceding console output remain visible |
| Missing failure details                      | Explicit No error details returned                               |
| Success plus error                           | Conflicting outcome; both pieces of evidence remain visible      |
| False, zero, null, empty string/array/object | Display the actual JSON value                                    |
| Absent result or empty logs                  | No value returned / No console output                            |
| Running or approval                          | Waiting for output / Awaiting approval                           |
| Absent or empty terminal output              | No result received / No output                                   |
| Unknown or malformed envelope                | Unrecognized response with original text                         |
| Denied or legacy failure                     | Execution denied or Error output                                 |
| Long evidence                                | Bounded keyboard-focusable scrolling and wrapping                |
| Untrusted content                            | Text only; no HTML execution                                     |
| Clipboard failure                            | Visible error; source remains selectable                         |

JSON formatting preserves numeric literals and escape sequences. Full response copying preserves the original provider string, including fields not understood by the renderer. Timeout and cancellation messages use the failure evidence supplied by the provider; absence of output does not imply cancellation.

## Evidence

Regression tests first failed for insufficient inset and missing semantic outcome sections, then passed after implementation. The browser matrix checks eight states at 320, 390, and 1440 pixels in both themes, including axe WCAG checks, actual source inset, and page overflow.

A saved real runtime transcript was replayed through this checkout with no new model calls. Source (229 characters) and returned value (494 characters) remained identical after reload. This is real-response rendering evidence, not a new execution or Learning test.

The padding investigation also found different active checkouts: port 4253 served the earlier capabilities renderer with zero horizontal source padding, while port 4173 served local main. Use the merged main preview for this change.

Rendered examples: [success on desktop](success-desktop.png), [failure on mobile](failure-mobile.png).

## Review and validation

- Fresh task-first usability: pass; source, outcome, diagnostics, keyboard, and mobile tasks worked. Minor label distinction between Raw response and Raw details required exploration; both remained discoverable.
- Independent visual finish: ship, including the fallback heading correction to 12px.
- Documentation: preserve DESIGN.md and its sidecar. This extension adds no global primitives. Existing sidecar specimen weight/status drift was reported and left untouched.
- `pnpm check`: passed; 39 test files, 205 tests passed, 47 conditional tests skipped; lint, source design scan, typecheck, and build passed.
- `node --test example/greet.test.js`: 1 passed.
- `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4227 pnpm exec playwright test e2e/typescript-tool.spec.ts e2e/typescript-output.spec.ts e2e/tool-renderers.spec.ts e2e/tool-approvals.spec.ts e2e/tool-disclosure.spec.ts e2e/tool-polish.spec.ts e2e/tool-stack.spec.ts e2e/motion.spec.ts e2e/virtual-transcript.spec.ts e2e/design.spec.ts`: 34 behavior tests passed. The rendered design scan initially found an 11px fallback heading; that heading was corrected and the rendered scan rerun separately.
- Formatting and `git diff --check`: passed.
- `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4227 pnpm design:browser`: passed after the fallback heading correction, scanning rendered tools and approvals in both themes and sizes.

## Merged verification

Local main fast-forwarded to `9d878e2`. On that merged tree, `pnpm check` and `node --test example/greet.test.js` passed again. `CI=1 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4231 pnpm exec playwright test e2e/typescript-tool.spec.ts e2e/typescript-output.spec.ts e2e/design.spec.ts` passed all 12 tests. The main preview at port 4173 served the new TypeScript output component and padding rules. The unrelated Monday checklist retained its original checksum. No shared deployment or upstream PR changed.
