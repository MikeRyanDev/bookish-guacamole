# Browser starter delivery

Source: `../IMPROVEMENTS.md`. Latest reviewed SHA-256: `33e5db5726591088bae60885edd1e1e7cdec4787a90fc7a2e443491c3843c898`.

Re-read the source after each implementation phase and before final verification. Preserve user edits to it. The historical terminal proof does not prove this browser delivery.

## Requirements and proof

| Requirement                     | Implementation                                                | Required proof                                                                                                            |
| ------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Automatic learned Skill catalog | SDK SkillRegistry plus per-turn TanStack plugin               | Model receives catalog before any tool; refresh/failure tests; real task loads a relevant Skill without a catalog request |
| Remove terminal frontend        | Browser server entry and React workspace                      | No terminal prompt entry remains; one dev command serves working browser                                                  |
| Modern tooling                  | Vite 8/Rolldown, tsdown, Oxlint, Oxfmt, Vitest                | Clean install, lint, types, tests, build; measured build timings                                                          |
| React v2 only                   | @copilotkit/react-core/v2 hooks/provider                      | Import audit and real browser request path                                                                                |
| TanStack conventions            | Router URL state, Query server data, AI harness               | Route/reload tests, no duplicate conversation store                                                                       |
| Agent readiness                 | TanStack Intent plus focused repository skills and local docs | Skill discovery/load checks and documented ownership/commands                                                             |
| Crafted UI                      | Imagegen concept and individual component/state studies       | Desktop/mobile, light/dark screenshots; keyboard and axe checks                                                           |
| Generative UI                   | useInterrupt permission UI and tool-result rendering          | Real approval/rejection, persisted tool output, restart/replay and cancellation                                           |

| Inspector | CopilotKit Inspector enabled in local development | Open and interact with SDK Inspector in the real browser |
| Virtual transcript | TanStack Virtual, measured rows, end anchoring | Bounded DOM with 1,000 messages; streaming/append follow; scroll-up holds position; jump to latest |
| Tool cards | Bash command/output, patch additions/removals, numbered read-file source | Actual tool payloads, failure output, light/dark screenshots and axe |
| Named workspaces | Persistent registry, picker, create/open/rename/remove, distinct agent/log per workspace | Browser management, reload, file/thread isolation, retained files after removal |

## Component inventory

1. Workspace header, icon button/tooltip, session sidebar/search/row, command palette.
2. Conversation/message, markdown/code block/copy, tool-call details, empty/loading/error states.
3. Composer/send/stop, permission request/decision, run status.
4. Inspector/tabs, workspace file list/preview, learned Skill list/details, settings/theme.

Design references: `design/workspace-concept.png`, `design/navigation.png`, `design/conversation.png`, `design/inspector.png`, `design/workspaces-and-tools.png`. All were generated with the built-in imagegen tool. The first prompt requested a compact Linear-inspired three-pane light/dark coding workspace and moodboard. The component prompts requested each inventory family separately with idle, hover, focus, disabled, loading and error states. Generated text and sample data are visual references only. Real UI values must come from the backend.

The explicit compact, minimal, light/dark request takes precedence over spacious marketing-style defaults. Icons have accessible names and tooltips; permission decisions retain text labels. No decorative gradients or fabricated status data.

## Progress

- Research: current package versions verified through npm; official Vite, VoidZero, CopilotKit v2, and TanStack Intent guidance consulted.
- Design: concept plus four component sheets saved.
- Automatic injection: regression first failed because the model's initial prompts lacked the catalog; now passes with per-turn SDK snapshot injection.
- Browser and agent scaffolding implemented. Virtual transcript and tool-card browser regressions pass, including axe in both themes.
- Named workspace registry, APIs, and picker implemented. Create/rename/remove/reload browser test passed. Real Luna tasks prove separate files/history, restored identity after reopening, and rejection of mismatched workspace/thread URLs.
- Plain folders now have bounded discovery without Git. `pnpm check` passed with 80 tests and 49 declared persistence-store skips.
- The isolated real Luna browser test now passes: published Skill load, two approved test commands, saved events without duplicate tool calls, and reload. Thread `61273bab-6138-42f9-9e5c-508c39231950`.
- Installed Luna Learning, publication, automatic browser ingestion, and temporary-image restore/reapply now pass; see VERIFICATION.md.
- Browser rejection/cancellation, Inspector interaction, full non-model browser suite, formatting, and clean-copy install/check/sample creation now pass.
- Intelligence now uses Flue 2.3 upstream providers. The local stack uses tested branch image 34918f9e1; restoration to its CLI image has been proven.

## Intelligence upgrade evidence

Released Flue 2.3 passed a real Luna tool-call and structured-output probe with no custom provider registration. [The migration boundary](FLUE-UPGRADE.md) maps the six HTTP workflows, auth, run inspection, cancellation, build, and storage requirements that must survive the upgrade. The deployed Learning pod has no persistent Flue volume; existing developer databases must not be reset.

The Flue 2 migration passes 324 Learning tests, live native Luna workflows, developer command and metrics checks, CLI model compatibility, and production packaging. Installed run 01a1690a-beaf-7c59-961f-b37e9328670c published a new Skill that the browser consumed without restart. Image restoration and reapplication passed. Final starter delivery review and the updated shared end-to-end smoke both passed.
