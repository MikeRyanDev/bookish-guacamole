# Agent guidance sources

Read root `AGENTS.md` first. Run `pnpm skills:sync` after a dependency update and review its diff. `pnpm skills:list` shows the package-shipped skills actually available; a dependency name alone does not mean it ships guidance.

| Guidance                              | Source                                                                                          | How it is loaded                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| TanStack AI, persistence, Router      | Exact npm packages in `pnpm-lock.yaml`                                                          | TanStack Intent mappings in root AGENTS.md                                    |
| React performance                     | Vercel's official `vercel-labs/agent-skills`, commit `063bee94c3f4df8453406c830b0a7df0f2860278` | `.agents/skills/vercel-react-best-practices/SKILL.md` and relevant rule files |
| Starter React state and accessibility | Repository-specific guidance                                                                    | `.agents/skills/starter-react/SKILL.md`                                       |
| Runtime, event bridge, Learning       | Repository-specific guidance                                                                    | `.agents/skills/starter-runtime/SKILL.md`                                     |
| Tests and delivery evidence           | Repository-specific guidance                                                                    | `.agents/skills/starter-verification/SKILL.md`                                |

Vercel's skill is vendored with its MIT license declaration and source metadata; trailing whitespace is normalized. Its Next.js and SWR examples are conditional guidance, not dependencies to add here. This SPA uses Vite, TanStack Router/Query, and CopilotKit v2. Do not let generic chat examples replace the required CopilotKit transcript path.

[Why Vercel publishes React skills](https://vercel.com/blog/introducing-react-best-practices) and [TanStack Intent's package-based model](https://tanstack.com/intent/latest/docs/overview) explain the source choices. No deployment, account-management, or unrelated skill collections are installed.

These development skills guide the coding assistant modifying the starter. They are distinct from runtime learned Skills stored and published by Intelligence.
