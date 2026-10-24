# Improvements acceptance

> Historical implementation and validation record. Named models describe those runs, not starter requirements.
> For current provider-neutral setup, use [model configuration](MODELS.md) and the [README](../README.md).

Checked against the unchanged `IMPROVEMENTS.md` on 2026-10-23 (SHA-256
`33e5db5726591088bae60885edd1e1e7cdec4787a90fc7a2e443491c3843c898`).

| Requirement                            | Implementation                                                                          | Evidence                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Automatic learned Skill ingestion      | Per-turn SDK SkillRegistry snapshot and catalog injection; load/read use that snapshot  | Unit regression plus installed Luna Learning, publication, and next-turn browser load without restart     |
| Browser frontend; remove terminal chat | Browser server and workspace; `src/cli.ts` removed                                      | Real browser tasks, reload, production build; no terminal chat entrypoint                                 |
| Modern fast tooling                    | Vite 8/Rolldown, tsdown, Oxlint/Oxfmt, Vitest                                           | Clean-copy install/check; final browser build 927 ms, server build 17 ms on existing install              |
| React and agent skills                 | Functional React, TanStack Intent map, React practices skill, three scoped local skills | Installed guidance catalog, documented primary sources, root AGENTS and architecture/source docs          |
| CopilotKit v2 and TanStack             | v2 provider/hooks, TanStack AI/Router/Query/Virtual                                     | Import and state-ownership audit; browser reload, route and workspace tests                               |
| Compact light/dark UI and imagegen     | Three-pane coding workspace, icons, five concept/component sheets                       | Inspected screenshots; mobile behavior, keyboard controls, axe in both themes                             |
| Permissions and generative UI          | `useInterrupt` and tool renderers                                                       | Real approval twice, rejection without write, cancellation with persisted partial answer                  |
| Inspector                              | SDK Inspector enabled                                                                   | Browser opens, navigates, and closes Inspector                                                            |
| Dynamic virtual scroll                 | Measured TanStack Virtual rows, end anchor and conditional follow                       | 1,000-row bounded-DOM test; streaming follow, scroll-up retention and jump control                        |
| Bash, patch, read-file display         | Exact commands/exit status, additions/deletions, numbered source                        | Payload tests, screenshots, light/dark axe                                                                |
| Full workspace management              | Create/open/search/switch/rename/remove; stable identity and scoped agents/logs         | Browser management; real Luna file/history isolation; archive/reopen identity; mismatched thread refused  |
| Temporary Intelligence fixes           | One branch/draft PR; Flue 2 upstream provider; explicit image script                    | Container startup, installed Learning run, real restoration and reapplication; documented retirement path |

Final starter checks: `pnpm check`, `pnpm format:check`, `pnpm test:e2e`, and
`node --test example/greet.test.js` pass. Unit coverage: 80 passed and 49 declared
unsupported-store skips. Browser coverage: eight passed and five opt-in skips;
the five real-model cases passed separately. The newly published Skill test ran
with `LIVE_MODEL=1 LIVE_LEARNING=1`.

[Verification record](VERIFICATION.md) contains IDs, commands, screenshots, and
limits. [Temporary image procedure](TEMPORARY-INTELLIGENCE.md) covers restoring
CLI images and removing the workaround. [Intelligence draft PR #2041](https://github.com/CopilotKit/Intelligence/pull/2041)
remains staged for review and release; the shared end-to-end smoke passed on head `1f8e6dc28`. Broader shared CI remains separate from the completed starter checks.
