# Impeccable in this starter

## Investigation

Reviewed on 2026-10-23. The project is [Paul Bakaus's Impeccable](https://github.com/pbakaus/impeccable), published at [impeccable.style](https://impeccable.style).
The current npm release is 4.7.0. It combines a design skill, command playbooks, a deterministic detector, edit hooks, and browser iteration tools.
Its detector does not require a model key. Design conversations and optional generated assets use the selected agent's tools.

The sibling repository's current checkout did not contain Impeccable. Its fetched branch `origin/tylerslaton/cpki/design-check-live` did.
Tyler Slaton added the integration on October 22. [PR #2038](https://github.com/CopilotKit/Intelligence/pull/2038) remains open.
The remote branch still matches the inspected head `b3a79b18847e9f18062053c2919f2356b3a264bc`.
The investigation used local history, a remote branch lookup, and the pull request metadata. The sibling worktree remains unchanged.

| Intelligence evidence    | What it adds                                                           | Starter decision                                                                     |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `85095ac29`              | Vendored Impeccable 4.7.0 skill and lock entry                         | Vendor the complete skill from an exact upstream commit, with license and provenance |
| `2b0490634`              | Replaces custom frontend-design guidance with Impeccable and DESIGN.md | Keep starter React ownership guidance and add product/design context                 |
| `b10ee8971`              | Scoped Codex/Claude edit hooks and source detector                     | Adapt the hook routing to `src/client/` and `src/client/index.html`                  |
| `52256b80b`, `488a35e2d` | Advisory baseline and lint-job gate                                    | Add the source gate to `pnpm check`; no findings baseline is needed here             |
| `bdb95366c`              | Rendered Storybook scans                                               | Use this starter's real tool/approval components in its existing Playwright fixture  |
| `45dbdd8a7`, `b3a79b188` | Live shell scans and engine caching                                    | Attach to a loaded browser through CDP; use the pinned npm platform binary           |

The sibling's default frontend skill specified a light palette, 2px controls, restrained typography, and screenshot validation.
Its animation and performance skills were custom repository guidance. Copying those files would import unrelated paths, commands, and product assumptions.
The starter already has React guidance, Vite 8, tsdown, Oxlint, Oxfmt, and TanStack libraries. Impeccable complements that toolchain.

## Installed pieces

- `.agents/skills/impeccable/` contains the complete upstream skill, command references, agents, scripts, license, and notice.
- `.agents/impeccable-source.json` records upstream commit `2bb6563e570ffc266d1fccec24a778745c143e52`, skill version 4.7.0, and engine version 0.1.16.
- `package.json` and `pnpm-lock.yaml` pin `impeccable@4.7.0` and its platform engine packages.
- `PRODUCT.md` records the audience, workflows, and runtime boundaries. `DESIGN.md` records the incumbent visual system.
- `.codex/hooks.json` and `.claude/settings.json` route edit and Stop events through `scripts/impeccable-ui.mjs`.
- `.claude/skills/impeccable` links to the canonical skill. Codex discovers `.agents/skills/` directly.
- `.impeccable/config.json` contains shared detector configuration. Local state and live sessions remain ignored.
- `.impeccable/live/config.json` targets the Vite shell, `src/client/index.html`. No live script is injected by default.

The integration uses the npm CLI for checks and hooks. It invokes Node directly, without interpolating tool arguments into a shell.
The upstream skill launcher remains available for skill commands. Both paths use engine 0.1.16.
The npm shim prefers its pinned platform package. Its fallback download verifies a SHA-256 sidecar before caching the engine.

These are repository development tools. They do not replace Intelligence Learning or inject local design skills into the running coding agent.

## Use it

After `pnpm install --frozen-lockfile`, the CLI is ready. The installed skill is available to Codex on the next turn.
In Codex, use `$impeccable audit src/client`, `$impeccable polish`, or a direct request naming Impeccable.
In clients with slash commands, use `/impeccable audit` or `/impeccable polish`.
The skill routes each task to its playbook. Root AGENTS.md links it to the starter-specific rules.

```sh
# Source scan; also runs inside pnpm check
pnpm design:check

# Structured source findings
pnpm design:check --json

# Twelve rendered scans: tools and bash/patch approvals,
# light/dark themes, 1440px/390px widths. No backend or model required.
pnpm design:browser

# Inspect an already-loaded local browser page
pnpm exec impeccable detect --cdp 9222 --target 127.0.0.1:4173 --json

# Inspect the context supplied to design work
pnpm exec impeccable context --target src/client/workspace.tsx
```

The browser command starts the existing fixture server on port 4174 and an isolated Chromium profile.
It records detector output and screenshots as Playwright attachments, then closes the browser and removes the profile.
It fails on detector errors, partial scans, malformed output, or primary findings. Advisory findings remain visible in attachments.
Source checks preserve the detector's exit status: 0 means completed without primary findings, 1 means an operational failure, and 2 means primary findings.

Edit hooks provide feedback in hosts that support these hook files. Host dispatch was not tested from a fresh interactive Codex or Claude session.
Shell-based edits are not guaranteed to emit an edit hook. Always run the explicit source and browser checks before delivery.
The source detector uses pattern matching for TSX and CSS. A clean scan does not establish accessibility or visual quality.
Keep the existing axe, interaction, reduced-motion, and screenshot checks.

## Usability gate

The repository's [interaction review](../.agents/skills/starter-react/references/interaction-review.md) supplements Impeccable for new or changed workflows.
Before implementation, the agent shows actual labels, entry points, and click outcomes.
Before delivery, a fresh [usability reviewer](../.agents/skills/starter-react/references/usability-reviewer.md) attempts the user task without the builder's explanation.
The reviewer records predictions before inspecting behavior or source.

Usability, visual quality, and technical verification have separate verdicts.
Impeccable's screenshot-based finish review does not replace task discovery or interaction testing.
A clean detector result cannot establish that a control makes sense.
Misleading labels and affordances block usability acceptance even when layout and accessibility checks pass.

Root AGENTS.md, starter-react, and starter-verification route agents to this gate.
These are locally owned workflow instructions, not an automated usability score or a new CI claim.
The vendored Impeccable skill and agents remain unchanged. Preserve these local references during upgrades.

### Workflow validation

A fresh reviewer evaluated the rejected composer without the builder's rationale or known findings.
Before seeing behavior, it guessed that Message might open mode choices and that 20 rounds would offer an editable limit.
After receiving click evidence, it returned `usability: fix` for the unclear entry point and misleading limit control.
The trial did not submit a goal or verify backend continuation. It validates this regression case, not general review accuracy.

Both changed skills passed the skill validator. Local references, formatting, and `git diff --check` passed.
`pnpm check` passed with 134 tests and 49 declared skips. `node --test example/greet.test.js` passed.
No app behavior changed in this tooling update, so browser suites were not rerun.

## Exceptions and live iteration

The initial installation preserved Plus Jakarta Sans through a font exception.
The [workspace redesign](DESIGN-STUDY.md) replaced that font with Manrope and removed the exception.
The current configuration has no ignored font values.
No blanket rule ignores or accepted-finding baselines are installed.

For browser variant work, invoke `$impeccable live` in the agent and follow the installed playbook.
The local CSP probe returned no policy. Live setup targets only `src/client/index.html`.
The live helper is opt-in. It is not part of app startup or the production bundle.
When finished, run `pnpm exec impeccable live-server stop` and inspect `git diff -- src/client/index.html` for leftover injection.
Do not commit injected scripts, screenshots of private data, local consent, caches, or session state.
Live variant generation was not exercised during this tooling installation.

## Upgrade

1. Select an explicit upstream commit and matching published npm version.
2. Install the upstream `.agents/skills/impeccable` directory into a temporary destination, then review its diff against the vendored copy.
3. Preserve `LICENSE`, `NOTICE.md`, and the executable mode of `scripts/impeccable`. Update `.agents/impeccable-source.json` with the selected commit and engine version.
4. Run `pnpm add -D --save-exact impeccable@<version>` and review the lockfile.
5. Run `pnpm check`, `pnpm design:browser`, and affected browser tests. Review detector rule changes before changing exceptions.
6. Verify the upstream skill launcher and npm CLI still select the intended engine.

Do not use an unpinned update command during normal setup.
`pnpm skills:sync` refreshes TanStack Intent mappings only. It does not update Impeccable.
`pnpm skills:list` lists package-shipped TanStack guidance, not repository skill directories.

## Verification on 2026-10-23

| Command or check                                                                         | Observed result                                                                                                                   |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                         | Passed with the existing install and shared package cache                                                                         |
| `pnpm check`                                                                             | Passed lint, design source scan, both TypeScript projects, 88 tests, and both production builds; 49 declared store checks skipped |
| `pnpm design:browser`                                                                    | Passed 12 rendered scans across tools, bash approvals, and patch approvals in both themes and widths                              |
| `pnpm test:e2e e2e/tool-renderers.spec.ts e2e/tool-approvals.spec.ts e2e/motion.spec.ts` | Eight tests passed, including axe, retry, keyboard, mobile, and reduced-motion checks                                             |
| `node --test example/greet.test.js`                                                      | One test passed                                                                                                                   |
| `pnpm format:check`, `git diff --check`                                                  | Passed                                                                                                                            |
| Pinned upstream comparison                                                               | All upstream skill files match the selected commit; launcher is executable; Claude symlink resolves                               |
| Source gate negative control                                                             | Temporary Inter CSS produced a primary finding and exit 2; the probe was removed                                                  |
| Hook replay                                                                              | A real PostToolUse payload scanned starter CSS and returned feedback; Stop completed successfully                                 |
| Skill/npm CLI                                                                            | Both reported 4.7.0; context loading included PRODUCT.md and DESIGN.md                                                            |

The hook regression failed before support for string-form patch payloads was added.
The rendered regression failed on 10px status/disclosure labels and an 11px approval heading before the CSS fix.
Those roles now use 11px and 12px respectively. No detector exceptions were added for them.

The [light tool cards](proof/tool-cards-light.png), [dark tool cards](proof/tool-cards-dark.png), and [mobile patch approval](proof/approval-patch-mobile.png) were visually inspected.
The screenshots preserve the compact hierarchy and show readable labels without overlap.
The build still reports the existing large frontend chunk warning.
No live model or Learning run was needed for these tooling and typography changes.
