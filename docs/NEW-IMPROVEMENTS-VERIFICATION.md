# NEW improvements proof

Verified locally on 2026-10-23 with GPT-6 Luna and the CLI-installed Intelligence stack using the temporary branch image documented in [the recovery guide](TEMPORARY-INTELLIGENCE.md). This record covers the NEW section of the user-owned `IMPROVEMENTS.md`, including its added React guidance replacement.

## What changed

| Request                    | Implementation                                                                                                                                | Evidence                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Better approvals           | Approval cards reuse the existing Bash, Patch, and file renderers; decisions stay scoped to one interrupt and recover from submission failure | Five fixture tests cover themes, mobile, keyboard, retry, and axe; real Bash and Patch runs below                       |
| Stable thread navigation   | Router links, workspace-only provider subscription, stable saved rows; removed the temporary new-session row that moved history               | Browser test retains the original DOM nodes, checks row position, selection, and Back navigation                        |
| Thoughtful motion          | Short entrances for approvals, dialogs, and panels; control feedback; no virtual-row entrances                                                | Normal and reduced-motion browser checks, immediate approval interaction, [motion recording](proof/motion-preview.webm) |
| Circular jump control      | Inner button keeps a 50% radius during hover and focus                                                                                        | Virtual transcript regression checks hover, keyboard focus, and Enter to return to the bottom                           |
| Developer README           | Purpose, prerequisites, ordered setup, sample task, approvals, Learning, extension points, checks, troubleshooting                            | [README](../README.md), source research below, local links and sample command checked                                   |
| React guidance replacement | Locally authored skill based on official React docs; removed the old vendored collection; wired root and starter skill instructions           | [Guidance sources](AGENT-SKILLS.md); skill-sync regression and actual regeneration pass                                 |

## View the UI

- [Real Luna Bash approval](proof/live-bash-approval.png)
- [Real Luna Patch approval](proof/live-patch-approval.png)
- [Dark Bash approval](proof/approval-bash-dark.png) and [dark Patch approval](proof/approval-patch-dark.png)
- [Mobile Patch approval](proof/approval-patch-mobile.png)
- [Motion recording](proof/motion-preview.webm): real workspace command dialog and panel toggles, followed by a fixture Patch card. No model execution is claimed for the fixture segment.

The guidance replacement does not alter the required CopilotKit runtime dependency tree. Its upstream OIDC package remains in the lockfile; starter-owned guidance and source references to the removed vendor collection are gone.

The screenshots were inspected for legibility, consistent tool previews, visible decisions, and mobile overflow. Axe passed in both themes. Automated checks are not a full accessibility audit.

## Real model and backend proof

| Interaction                   | Persisted thread                       | Result                                                                                                                                                                               |
| ----------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bash approvals and Skill load | `78f5033c-546c-439d-b472-0ad62c022e58` | Luna loaded a learned Skill, ran `npm test` twice with separate approvals, and restored the final response without duplicate tool calls                                              |
| Patch approval                | `784f815e-905c-4129-84c9-b787d081e85c` | File stayed unchanged while approval was pending, changed after approval, and remained correct after reload; 41 saved events, exactly one patch call, no decode errors or truncation |
| Rejected write                | `9fd7f4cf-4a1c-4437-abca-5dfb1641b7fa` | Rejection prevented file creation; backend recorded denial and reload restored the response                                                                                          |
| Cancellation                  | `2c21b1b2-fa56-4f71-b7e6-ffe8edc0d91b` | Stopped streamed output; Intelligence recorded cancelled completion and reload retained the partial response                                                                         |

The live workspace test also created two separate folders, read each one's unique contents, rejected cross-workspace thread access, and restored identity/history after removal and reopening. These runs used the real local backend and model, not transcript fixtures. Raw logs and event snapshots remain ignored under `.data/`.

## Regression evidence

The routing test first reproduced a 38-pixel shift: the first saved row moved from y=175 to y=137 when the temporary new-session row disappeared. After the fix, selection and Back navigation preserve row position and DOM identity. This does not claim that React never renders a row again.

The jump test failed on the inner button's square hover radius before the CSS fix. The motion test failed because normal-motion approval duration was zero before the entrance animation. The skill-map test failed before normalization, then passed while preserving command IDs and local guidance.

The first live Bash rerun failed because its old selector read collapsed JSON as empty text. The test now asserts the exact visible command before approving; the subsequent run passed. No application workaround was added for that test failure.

## Commands and results

```sh
pnpm check
pnpm test:e2e
LIVE_MODEL=1 pnpm test:e2e e2e/live-model.spec.ts e2e/live-controls.spec.ts e2e/live-workspaces.spec.ts
LIVE_MODEL=1 pnpm test:e2e e2e/live-model.spec.ts e2e/live-patch.spec.ts
pnpm skills:sync
pnpm test tests/skill-map.test.ts
pnpm format:check
node --test example/greet.test.js
git diff --check
```

`pnpm check` passed lint, both TypeScript checks, 81 tests, and browser/server builds. The 49 persistence-store contract skips are declared unsupported cases. The browser suite passed 17 tests and skipped six opt-in model cases. In the first live command, rejection, cancellation, and workspaces passed; Bash failed on the obsolete selector described above. The second live command passed both Bash and Patch. Thus all five affected live cases passed across those runs. The separate opt-in Learning refresh test was not rerun for these UI changes; its prior evidence remains in [the original acceptance record](IMPROVEMENTS-ACCEPTANCE.md).

Browser prerequisites: start `pnpm dev` with the local backend available. The history test seeds two empty local sessions through the SDK, without a model call; the live Bash test requires a published relevant Skill and the greeting workspace. Live tests spend model credits and create local test conversations/folders. Fixture tests run on port 4174.

The CSS motion audit passed with a warning for the existing 1000ms loading spinner. The production build still warns about large frontend chunks. Neither warning was introduced by this work. No backend reinstallation, production deployment, or new automatic Learning scheduler test was needed for these changes. During recording, the existing floating CopilotKit Inspector intercepted clicks over the right panel toggle at desktop size; the recording uses the left panel toggle. This overlay placement remains a known limitation.

## README and skill research

The previous README led with setup before explaining the product, mixed implementation history with onboarding, scattered temporary setup requirements, and lacked a compact troubleshooting table. The rewrite uses a short purpose statement, capabilities, first-run commands, one sample task, and links to deeper guides. It retains the local trust boundary and temporary-image recovery instructions.

Primary README examples reviewed: [Vite's package README](https://github.com/vitejs/vite/blob/main/packages/vite/README.md) and [TanStack Router's example README](https://github.com/TanStack/router/blob/main/examples/react/router-monorepo-simple/README.md). The new React skill draws from [Thinking in React](https://react.dev/learn/thinking-in-react), [effect guidance](https://react.dev/learn/you-might-not-need-an-effect), and [Rules of React](https://react.dev/reference/rules). It is locally authored, not an official React skill distribution.
