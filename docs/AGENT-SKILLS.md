# Agent guidance sources

Read root [AGENTS.md](../AGENTS.md) first. Run `pnpm skills:sync` after a dependency update and review its diff. `pnpm skills:list` shows package-shipped skills actually available.

| Guidance                                          | Source                                              | How it is loaded                                                        |
| ------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| TanStack AI, portable skills, persistence, Router | Exact npm packages in `pnpm-lock.yaml`              | TanStack Intent mappings in root AGENTS.md                              |
| React state, effects, identity, performance       | React's official documentation, reviewed 2026-10-23 | [React practices](../.agents/skills/react-practices/SKILL.md)           |
| Starter React ownership and accessibility         | Repository-specific guidance                        | [Starter React](../.agents/skills/starter-react/SKILL.md)               |
| Runtime, event bridge, Learning                   | Repository-specific guidance                        | [Starter runtime](../.agents/skills/starter-runtime/SKILL.md)           |
| Tests and delivery evidence                       | Repository-specific guidance                        | [Starter verification](../.agents/skills/starter-verification/SKILL.md) |

The React practices skill is authored for this repository; it is not an official React-distributed skill. It uses [Thinking in React](https://react.dev/learn/thinking-in-react), [effect guidance](https://react.dev/learn/you-might-not-need-an-effect), and [Rules of React](https://react.dev/reference/rules), with links for deeper performance and identity work. The concise rules fit this SPA without adding framework or hosting assumptions.

[Intent](https://tanstack.com/intent/latest/docs/overview) loads package-specific guidance from pinned dependencies. `scripts/sync-skills.mjs` runs Intent and keeps the first sentence of each generated description; commands and skill IDs remain intact. Full package guidance stays available through the mapped load command. Local instructions outside the generated block remain unchanged.

These development skills guide assistants editing the starter. They are distinct from runtime learned Skills stored and published by Intelligence. CopilotKit v2 owns the transcript; generic chat examples do not replace it.
