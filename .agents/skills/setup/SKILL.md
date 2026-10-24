---
name: setup
description: Install this starter's dependencies and set it up with developer-chosen coding models, separate Learning configuration, CopilotKit CLI sign-in, personal EULA acceptance, and a verified local browser connection.
---

# Set up the starter

Read `README.md` and `docs/MODELS.md`. Work from the repository root.
Preserve existing `.env`, model catalogs, workspaces, conversations, and local stacks.
Do not upgrade or replace an installed backend just to finish setup.

## Install dependencies first

Do the installation work, not just list commands for the developer.

1. Inspect `package.json`, `pnpm-lock.yaml`, and the host operating system.
2. Check Node.js, pnpm, Git, and Docker. Use versions compatible with the pinned dependencies and `packageManager` field.
3. Install missing prerequisites through the developer's existing version manager or package manager. Consult current official installation instructions.
4. Preserve existing installations and global defaults. If installation requires administrator access or an interactive installer, explain the required action.
5. Run `pnpm install --frozen-lockfile` from the repository root, including development dependencies. This also installs the pinned CopilotKit CLI.
6. Verify the command succeeds, then run `pnpm check` and `node --test example/greet.test.js`.

Do not replace the lockfile, upgrade packages, or install a global CLI to bypass an installation error.
Resolve the actual failure and retry. Do not claim dependencies are ready from an existing `node_modules` folder alone.
If package installation reports blocked build scripts, inspect which packages require them before approving specific scripts. Do not approve all scripts automatically.
When browser verification is needed, run `pnpm exec playwright install chromium` before the browser tests.
If Chromium needs host libraries, follow Playwright's platform instructions and handle required administrator access explicitly.
Start Docker and verify its engine is reachable before installing Intelligence.

## Choose models with the developer

Ask which provider, model ID, and credential source they want for coding and for Learning.
Accept several coding entries, including different models from the same provider.
Ask which coding entry starts new conversations. Do not choose or recommend a provider or model for them.
If they have no provider yet, explain the choices neutrally: hosted API account, compatible endpoint, or local model server.
Use the selected provider's current official documentation for account creation, key creation, model IDs, endpoint URLs, and required capabilities.
Coding needs streaming text and tool calls. Goals also need structured output.
Learning has its own supported provider catalog and container network access.
Do not imply that a TanStack adapter guarantees Learning support.

Keep secrets out of chat, command arguments, screenshots, and tracked files.
Have the developer put credentials in `.env`, or read a private source they explicitly authorize.
Do not search unrelated repositories for keys.
Create ignored `models.json` with the selected entries and `defaultModel`.
Use native adapters where appropriate; compatible endpoints require the correct API protocol and base URL.
Keep keys behind `apiKeyEnv` references. See `models.example.json` for field structure, not a provider recommendation.
Create ignored `learning.json` independently. The developer can explicitly reuse the same key or choose another.

## Prepare and authenticate

1. Create `.env` from `.env.example` only when it does not exist.
2. Run `pnpm workspace:create` only when the intended workspace does not exist.
3. Run `pnpm intelligence login --json` and retain its process handle.

The login command streams JSON lines. Relay its `authentication_url` and `action_required` messages with the exact current URL and code.
The developer completes sign-in in their browser. Do not approve the device request on their behalf.
Poll the same process until `type: "completed"` or `type: "failed"`.
An existing authenticated session can complete immediately. A URL alone is not successful authentication.
If the CLI returns `repeated_expiry` or requests developer input, stop that attempt. Do not loop with `--force` without their request.
Never print the CLI credential store.

## Verify personal EULA acceptance and install

Run `pnpm learning:config` to write private `.data/learning-model.json` with mode 0600.
Run `pnpm intelligence local list --json` and inspect the intended existing stack before setup.
Run `pnpm intelligence local setup --model-config .data/learning-model.json --json`.
The CLI validates provider support and checks the current agreement.

If the CLI returns `eula_acceptance_required`, tell the developer to run this in their own terminal:

```sh
pnpm intelligence local accept-terms
```

Explain that the CLI refuses coding-agent acceptance. Link this skill and quote that boundary if it blocks setup.
Do not call `accept-terms`, pass `--accept-eula-version`, remove agent markers, or simulate human input.
After the developer accepts, retry the same setup command. Verify its result; their message alone is not installation evidence.
Do not use `--defer-model` as completed setup when Learning was requested.

## Connect and verify

1. Run `pnpm intelligence local status --json`. Resolve readiness errors before proceeding.
2. Run `pnpm intelligence local connect --json`. Review the destination and proposed app changes.
3. For the intended local stack, run `pnpm intelligence local connect --approve-connection --json`.
4. Inspect existing Learning containers. Create `coding-lessons` only if it is absent, or use the developer's chosen container.
5. Run `pnpm dev` and open `http://127.0.0.1:4173`.
6. Verify that the composer lists every configured model and retains each conversation's selection after reload.

Ask before spending model credits unless the active task already authorizes model use.
When authorized, send a small coding task with tool use and verify its actual result.
Report deterministic checks separately from provider requests and real Learning runs.
A saved configuration or enabled Learning indicator does not prove a successful Learning run.
Report installed prerequisite versions, dependency installation and check results, selected providers, model IDs, configuration paths, authentication result, agreement/setup result, browser URL, and remaining failures. Never include keys.
