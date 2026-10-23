# TanStack AI + CopilotKit Intelligence

Run a TanStack coding agent with the CLI-installed local Intelligence backend.

**Verified locally:** real GPT-4.1 coding, saved Intelligence events, app restart/replay, tool approvals, cancellation, a completed Learning run, and a later task loading the published Skill. See [the evidence record](docs/VERIFICATION.md).

This checkout is already connected. Run `pnpm dev` to start. The [local Learning dashboard](http://cpk.localhost:61995/o/local-evaluation/local-app/learning/coding-lessons) shows its Insight and Skill. For a fresh checkout, follow the setup below.

## What runs where

```mermaid
flowchart LR
  Terminal --> Client[CopilotKit Intelligence client]
  Client --> Runtime[Local CopilotKit Runtime]
  Runtime --> Bridge[AG-UI bridge]
  Bridge --> Harness[TanStack coding harness]
  Harness --> Model[OpenAI]
  Harness --> Workspace[Your coding workspace]
  Harness --> SQLite[Local execution log]
  Runtime --> Intelligence[CLI-installed Intelligence]
  Intelligence --> Learning[Insights and published Skills]
  Learning --> Harness
```

TanStack owns the model loop, coding tools, and approvals. Intelligence owns durable product runs and Learning inputs. SQLite stores the harness state needed to resume a conversation after the app stops. It does not replace Intelligence.

The starter uses TanStack AI `1.0.0` and the experimental harness `0.1.0`. All direct dependencies have exact versions. Keep the lockfile.

## Prepare the app

You need Node.js 22.13 or later, pnpm 10.9, Git, Docker, and an OpenAI key. The CLI also requires CopilotKit sign-in and local evaluation terms acceptance.

1. Open this repository.
2. Install the pinned dependencies:

   ```sh
   pnpm install --frozen-lockfile
   ```

3. Create your private configuration:

   ```sh
   cp .env.example .env
   ```

4. Set `OPENAI_API_KEY` in `.env`. Do not paste keys into chat or commit them.
5. Create the sample workspace:

   ```sh
   pnpm workspace:create
   ```

The workspace command creates a separate Git repository so the coding tools can discover its files. It refuses to replace an existing folder. This checkout already has the sample workspace.

## Install local Intelligence

Start Docker first. The CLI checks available CPU, memory, and storage.

1. Sign in:

   ```sh
   pnpm intelligence login
   ```

2. Review and accept the local evaluation terms yourself:

   ```sh
   pnpm intelligence local accept-terms
   ```

3. Install the backend:

   ```sh
   pnpm intelligence local setup
   ```

   Choose an OpenAI model for Learning and enter its key in the masked prompt. Do not defer model configuration for the full Learning walkthrough.

4. Review the connection changes:

   ```sh
   pnpm intelligence local connect
   ```

5. Apply the connection:

   ```sh
   pnpm intelligence local connect --approve-connection
   ```

The CLI writes `INTELLIGENCE_API_URL`, `INTELLIGENCE_GATEWAY_WS_URL`, and `CPK_INTELLIGENCE_API_KEY`. The starter reads these exact names. It refuses a remote backend URL.

If the CLI reports `authentication_required`, finish sign-in before you retry. If it reports `release_unavailable`, inspect the failed download before starting another installer.

On this machine, Docker Desktop's credential helper blocked the public Helm download. The working diagnostic used an empty temporary Docker configuration and the existing Docker socket. It changed no saved Docker settings. See [the evidence record](docs/VERIFICATION.md) before using that workaround.

## Create the Learning Container

After the CLI connects this project, create its container:

```sh
pnpm intelligence learning containers create --id coding-lessons --name "Coding lessons" --json
```

`LEARNING_CONTAINER_ID` defaults to `coding-lessons`. Use one stable container for this project. Each new Intelligence thread receives that assignment through `getLearningContainerId`.

This command was verified against the CLI-installed local stack.

## Run a coding task

Start an interactive session:

```sh
pnpm dev
```

Enter this task:

```text
Update greet so it trims names and rejects blank names with a clear error.
Add tests before changing the function. Run npm test and report the result.
```

The agent uses the official workspace tools. File changes and shell commands can ask for approval. Read the displayed call before answering `y`.

The workspace root limits file tools. A shell command can access the host, so it is not a sandbox. Use this starter with a trusted local workspace.

The terminal prints a thread ID. To reopen that thread:

```sh
pnpm dev --thread <thread-id>
```

For a single task:

```sh
pnpm dev --prompt "Read the project and explain the existing test."
```

A task that needs approval requires a terminal. A piped task exits with a resume command instead of approving a tool call.

Enter `/exit` to close the app. The CLI-installed backend remains running. Use `pnpm intelligence local stop` to stop it without deleting data.

## Complete the Learning cycle

A configured Learning model is not proof of Learning. Automatic scheduling uses a 15-thread threshold for the first run. A manual Learning run can use one completed thread; this was verified on local release 0.15.0.

1. Run real coding tasks in separate threads. Give specific feedback about incorrect code, test gaps, and useful conventions.
2. Run `pnpm intelligence local login` to open the dashboard signed in. Select **Local app**, then **Threads**, to inspect saved tool calls and results.
3. Open **Automatic Learning → Coding lessons → Start manual run now**. Wait for the analysis to finish. Automatic scheduling has a separate eligibility gate.
4. Inspect **Insights**, **Analysis results**, and **Skills**. Review a proposed Skill and its supporting evidence before approval.
5. Start a new coding task. Check that `list_learned_skills` and `copilotkit_load_skill` return and use the published Skill.

The starter reads published Skills through the pinned Intelligence Skill registry. It checks archive integrity and exposes three TanStack tools: list the catalog, load a Skill, and read its supporting text files. The model receives a catalog first, then loads a specific Skill.

Useful CLI reads:

```sh
pnpm intelligence learning insights list coding-lessons
pnpm intelligence learning candidates list coding-lessons
pnpm intelligence learning skills list coding-lessons --full
```

The verified run produced `greet-blank-trim-validation`. A later task explicitly requested this Skill, loaded it through `copilotkit_load_skill`, added whitespace regression tests, and passed all 12 workspace tests. The model may decide a Skill is irrelevant; listing a catalog alone does not prove use.

To review and approve a candidate from the terminal:

```sh
pnpm intelligence learning candidates get coding-lessons <candidate-id> --json
pnpm intelligence learning candidates approve coding-lessons <candidate-id> --yes --json
```

After publication, try:

```text
Review greet.js using the published greet-blank-trim-validation Skill.
Load it first. Add missing regression tests for tab and newline padded names
and tab/newline-only names. Run the tests and report the result.
```

## Change the starter

| File | Responsibility |
| --- | --- |
| `src/harness.ts` | Model, official coding plugins, prompts, and learned-Skill tools |
| `src/bridge.ts` | Harness-to-Intelligence event ordering, run IDs, cancellation, and cloning |
| `src/app.ts` | Local runtime, server authentication, Learning assignment, and shutdown |
| `src/cli.ts` | Terminal prompts, streaming output, and approvals |
| `src/log-store.ts` | SQLite implementation of TanStack's execution-log contract |

Set `CODING_WORKSPACE` to a trusted project folder. The default is `workspace/`. Keep `.data/` with this starter: it holds the harness execution log.

Change the model in `src/harness.ts`, or pass a TanStack text adapter to `createCodingHarness`. The initial model is `gpt-4.1`. The Learning model has separate configuration in the CLI-installed stack.

The runtime binds only to loopback and uses a random bearer token for each app process. The terminal sends that token. The local user ID is `local-developer`; this starter is for one developer.

The Skill registry uses the SDK's `internal/learned-skills` export. This is an explicit version-sensitive boundary. Run the tests before upgrading CopilotKit.

## Known limits

The harness is experimental and this starter is for one local developer. Keep the pinned versions until you rerun the checks. The published SDK currently prints repeated AG-UI warnings about extra organization/project envelope fields; persisted events, replay, and tool results were verified despite that noise. Node 22 also marks SQLite experimental.

A model can stop before finishing a task. The first real run stopped after the failing-test step; reopening its thread with a clear continuation completed the implementation. Check the files and test results, not only the model's summary.

The local dashboard calls Containers **Learning Spaces**. Its model-configuration banner is not a success signal: inspect the completed analysis and its output. Automatic analysis was off in the tested local install; the successful proof used a manual run.

## Check changes

```sh
pnpm check
node --test example/greet.test.js
```

`pnpm check` runs lint, TypeScript, tests, and build. The persistence suite runs TanStack's own contract checks. It skips stores this starter does not implement; only its execution log uses SQLite.

## Official references

- [TanStack harness CLI example](https://github.com/TanStack/ai/tree/5651e07e3181745984155ad88b65b86b8528844e/examples/harness-cli)
- [Build your first harness](https://tanstack.com/ai/latest/docs/harness/overview)
- [Coding tools](https://tanstack.com/ai/latest/docs/harness/coding-tools)
- [Session log](https://tanstack.com/ai/latest/docs/harness/session-log)
- [CopilotKit CLI](https://www.npmjs.com/package/copilotkit)

The [plan and review log](docs/PLAN.md) records the next review cycle.
