# TanStack AI + CopilotKit Intelligence

Run `pnpm dev`, then open **http://127.0.0.1:4173** after completing setup below.

A browser starter for building your own coding agent with TanStack AI, CopilotKit React v2, and CLI-installed Intelligence. The coding model is **GPT-6 Luna**. Intelligence stores conversation history and turns completed runs into Insights and published Skills. The agent receives the current Skill catalog automatically before each turn.

## Set up

You need Node.js 22.13 or later, pnpm 10.9, Git, Docker, and an OpenAI key. CopilotKit local setup also requires sign-in and personal acceptance of its evaluation terms.

1. Run `pnpm install --frozen-lockfile`.
2. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` privately.
3. Run `pnpm workspace:create` to create the sample project without replacing an existing folder.
4. Start Docker, then run `pnpm intelligence login`.
5. Run `pnpm intelligence local accept-terms` and review the terms yourself.

Install and connect the backend:

1. For native Luna on release 0.15.0, follow the [temporary branch setup](docs/TEMPORARY-INTELLIGENCE.md#configure-native-luna-with-the-branch-cli). After the fixed Intelligence release ships, use `pnpm intelligence local setup` instead.
2. Run `pnpm intelligence local connect` to review the proposed connection.
3. Run `pnpm intelligence local connect --approve-connection` to apply it.
4. Run `pnpm intelligence learning containers create --id coding-lessons --name "Coding lessons" --json`.
5. Run `pnpm dev` and open **http://127.0.0.1:4173**.

The CLI writes `INTELLIGENCE_API_URL`, `INTELLIGENCE_GATEWAY_WS_URL`, and `CPK_INTELLIGENCE_API_KEY`. The starter uses those names and refuses remote backend URLs. `LEARNING_CONTAINER_ID` defaults to `coding-lessons`.

The coding model and Learning model have separate configuration. Both have passed real Luna checks. Release 0.15.0 needs the temporary Intelligence branch image for native Luna Learning; [verification](docs/VERIFICATION.md#installed-luna-learning-and-automatic-refresh) records the completed run, published Skill, browser ingestion, and image restoration.

## Use the workspace

Enter a task in the browser, for example:

```text
Update greet so it trims names and rejects blank names with a clear error.
Add tests before changing the function. Run npm test and report the result.
```

Review the exact tool arguments when a permission request appears. **Allow once** executes that call; **Reject** refuses it. Use the stop control to cancel an active run. Sessions reopen from the sidebar and their thread ID stays in the URL.

The transcript uses TanStack Virtual. It follows new output while you are at the bottom. Scroll up to read earlier work without being pulled down; use the jump control to return to the latest output. Bash, patches, and file reads have dedicated renderers with expandable details.

The Files panel previews source files. The Skills panel shows published Skills from the configured Learning container. CopilotKit's own Inspector is enabled in local development. The theme control switches between light and dark.

### Named workspaces

Use the workspace control at the top left to create an empty project or open an existing absolute folder path. You can search, switch, rename, and remove saved entries.

Each workspace has a stable ID, separate agent identity, and separate harness execution log. Renaming changes the label. Removing an entry leaves its files and saved conversations intact; opening the same path again restores its identity. Keep `.data/` across restarts.

`CODING_WORKSPACE` chooses the initial folder when the registry is first created; it defaults to `workspace/`. Use the picker to manage folders after that. New managed workspaces live under `.data/workspaces/`. Existing folders need not use Git. File discovery omits private dot paths; plain-folder discovery also skips symlinks and dependency trees and bounds the work for large folders.

This starter is for one trusted local developer. File tools use a workspace root, but an approved shell command can access the host: it is not a sandbox.

## Complete a Learning cycle

1. Run real tasks in separate sessions and give specific feedback about mistakes and useful conventions.
2. Run `pnpm intelligence local login` to open the local dashboard signed in.
3. Open the Learning container and start a manual analysis. Inspect its final status and evidence.
4. Review a proposed Skill and approve it when its evidence supports it.
5. Start another coding task. Verify that the agent loads and applies a relevant Skill.

The agent refreshes the SDK SkillRegistry before each turn, injects its catalog, and binds Skill load/read tools to that same verified snapshot. A failed refresh does not reuse an old catalog. The model decides which Skills apply; a catalog listing alone does not prove use.

Useful reads:

```sh
pnpm intelligence learning insights list coding-lessons
pnpm intelligence learning candidates list coding-lessons
pnpm intelligence learning skills list coding-lessons --full
```

The tested local release allows manual analysis with one completed thread. Automatic scheduling has separate eligibility and configuration; it is not covered by the historical manual-run proof.

## Extend the starter

| File                                                            | Responsibility                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/harness.ts`, `src/model.ts`, `src/learned-skills.ts`       | Model, coding plugins, permissions, and automatic Skill catalog           |
| `src/bridge.ts`, `src/log-store.ts`                             | AG-UI event identity, cancellation, and private execution state           |
| `src/app.ts`, `src/workspaces.ts`                               | Local runtime/auth, workspace registry, Learning assignment               |
| `web/src/workspace.tsx`, `web/src/router.tsx`, `web/src/api.ts` | React shell, URL selections, and TanStack Query reads                     |
| `web/src/components/`                                           | Conversation, virtual transcript, tool cards, permissions, and inspectors |

Use **only `@copilotkit/react-core/v2`** for CopilotKit React APIs. CopilotKit owns the transcript; Router owns URL selections; Query owns server reads. Add tools through the TanStack harness rather than creating another chat client.

[AGENTS.md](AGENTS.md) maps installed TanStack Intent guidance and repository skills. Read [architecture](docs/ARCHITECTURE.md) before changing ownership boundaries and [agent guidance sources](docs/AGENT-SKILLS.md) before refreshing the scaffold. The harness and the SDK's `internal/learned-skills` export are version-sensitive; rerun checks when upgrading them.

## Check changes

```sh
pnpm check
node --test example/greet.test.js
pnpm test:e2e
```

Start the app before browser tests. `pnpm check` runs Oxlint, TypeScript, Vitest, Vite, and tsdown. Vite 8 uses Rolldown/Oxc; Oxfmt handles formatting. Dependencies and the package manager are pinned. Persistence tests explicitly skip stores this starter does not implement.

For a real model/Skill browser check on the configured sample workspace:

```sh
LIVE_MODEL=1 pnpm test:e2e e2e/live-model.spec.ts
```

This uses the configured OpenAI account and requires a published relevant Skill. It checks approvals, saved Intelligence events, reload, and tool-call uniqueness. Fixture tests prove rendering behavior, not Learning or model behavior.

`pnpm build` creates browser and Node output; `pnpm start` serves the build. Stop the app with Ctrl-C. The backend stays running; `pnpm intelligence local stop` stops it without deleting data.

## Evidence and limits

[Acceptance audit](docs/IMPROVEMENTS-ACCEPTANCE.md) maps every requested improvement to evidence. [Verification](docs/VERIFICATION.md) records commands, screenshots, backend runs, and limits. Credentials, raw model logs, traces, workspace edits, and runtime databases stay ignored. The server binds to loopback, checks Host/Origin, and gives the same-origin browser a temporary bearer token; provider keys stay on the server.

The starter is not a multi-user service. A model can stop early: check its actual file changes and test results. Large frontend chunks remain a build warning. The CopilotKit Inspector follows the SDK's local-development restrictions.

Temporary Intelligence branch images are opt-in and never a startup default. Application, real Learning, restoration, and reapplication passed. Use `pnpm intelligence:image:restore` to return to the captured CLI image; follow the [removal checklist](docs/TEMPORARY-INTELLIGENCE.md#retire-the-workaround-after-release) after the fixed release ships.
