# Verification record

## Verified on 2026-10-22

| Check | Evidence |
| --- | --- |
| Published packages | npm reports TanStack AI 1.0.0, harness 0.1.0, CopilotKit 1.79.1, CLI 4.29.0 |
| Event bridge | Real harness with a deterministic provider; public AG-UI runner accepts the event sequence |
| Run identity | Provider IDs cannot replace the outer Intelligence thread and run IDs |
| Tool evidence | Tool arguments and results survive the bridge; one final event closes the whole turn |
| Errors | Provider failure produces an error, not successful completion |
| Approval | The public agent API pauses before execution and resumes the tool exactly once |
| Cancellation | Unsubscription cancels the underlying model through the harness control API |
| Restart | A new SQLite connection and new host restore the previous model context |
| Coding permissions | Official write_file plugin resumes across a host restart; once writes the file, reject leaves it absent |
| SQLite contract | 56 applicable official persistence checks pass; 49 checks for absent stores skip |
| Sample workspace | Node's built-in test runner passes the greeting test |

## Local installation evidence

`copilotkit local list --json` returned no stacks. Docker was stopped. Docker Desktop now runs with Engine 29.3.0.

The first `local setup --defer-model --json` failed after the Helm pull timeout. Process inspection found Helm waiting on `docker-credential-desktop get`.

A read of the public GHCR tags endpoint succeeded. Retrying the CLI with a temporary empty Docker configuration passed release download and reached `authentication_required`.

The diagnostic command was:

```sh
DOCKER_CONFIG=/private/tmp/tanstack-public-registry \
DOCKER_HOST=unix:///Users/mikeryan/.docker/run/docker.sock \
pnpm intelligence local setup --defer-model --json
```

The temporary directory contains only `config.json` with `{"auths":{}}`. This path and socket are specific to this machine. The diagnostic deliberately deferred Learning configuration; final setup must configure its model.

CLI sign-in is complete. The OpenAI key was copied from the developer-authorized local source into ignored configuration without printing it. A real OpenAI chat completion returned HTTP 200, model `gpt-4.1-2025-04-14`, and the requested `MODEL_OK` response. This verifies model access only; it does not verify the coding harness or Learning.

Before personal acceptance, local setup with `--model-config .data/learning-model.json` exited with `eula_acceptance_required` for agreement `developer-edition-2026-10-01-web`. No license was requested. The CLI required the developer to run `pnpm intelligence local accept-terms` personally; agents cannot submit that acceptance.

## Real end-to-end evidence

Verified on 2026-10-22 (America/Los_Angeles), using local release **0.15.0** and real OpenAI GPT-4.1 for both coding and Learning.

| Check | Recorded evidence |
| --- | --- |
| CLI installation | `local setup --model-config .data/learning-model.json --json` completed; app-api, gateway, frontend, Learning agent and reconciler pods ready |
| Connection | `local connect --json` preview followed by `local connect --approve-connection --json`; local project 1 |
| Container | `learning containers create --id coding-lessons --name "Coding lessons" --json` succeeded |
| Coding + restart | Thread `f68e6556-41b2-491b-b82a-197d0bc5edbf`: real file/shell approvals, failing regression tests, process restart, replay, continuation, and 4 passing tests |
| Persisted events | SDK `getThreadEvents` returned 151 events for that thread, no decode errors, no truncation |
| Learning | Manual run `01a166d9-4246-7c61-9092-d69265abc900` succeeded with one evidence thread, one Insight, and one Skill candidate |
| Insight | `01a166d9-9c49-7c85-936f-ade8947e6fca`; cites the actual coding thread and eight transcript message references |
| Published Skill | Reviewed candidate `01a166d9-9c49-71f1-b211-9e7a50b2f48a`; approved Skill `01a166d9-f59a-77c1-857b-5fa252a69237`, registry revision 1 |
| Later Skill use | Thread `e00fdd3d-81af-480d-804d-23e448760c2b`: `copilotkit_load_skill` returned the full published `greet-blank-trim-validation` instructions, followed by real file edits and test execution; 86 events, no decode errors or truncation |
| Workspace result | Independent `npm test --prefix workspace`: all 12 tests passed, including four new tab/newline cases |
| Cancellation | Thread `3deba503-4657-4657-b43e-a0e422e553a4`, run `ce678445-fc6d-4a25-810a-56a777f009fe`: client aborted after text began; backend persisted `RUN_FINISHED` with `outcome.type: cancelled` |
| Rejection | Thread `36435dfa-3ece-4712-a667-85c8c7631277`: refused write returned `The user denied this tool call`; no farewell file was written by that call |
| Dashboard | Browser sign-in completed; Coding lessons showed 1 Insight, 1 Skill, and the finished manual analysis |

The manual run used the local API's `POST /api/learning/projects/1/containers/coding-lessons/runs`, with the CLI-owned local service credential read privately. Users can invoke the same operation through **Start manual run now** in the dashboard. No credential or raw private configuration is tracked.

Automatic scheduling reported a 15-thread threshold and was disabled. That threshold does not prevent a manual run with one thread. Automatic scheduling itself was not tested.

Raw event snapshots and run details remain in ignored `.data/`. These are local test conversations, not evidence of production reliability or long-term Learning quality.

## Regressions found and fixed

1. The SDK catalog names `copilotkit_load_skill` and `copilotkit_read_skill_file`. The original custom name did not match. A failing real-harness regression test now verifies both advertised tools execute against a snapshot.
2. The parent Git repository ignores `workspace/`, so official file discovery returned no files. The workspace creation script now initializes a separate Git repository. A regression test first reproduced empty discovery, then passed with the fix. Existing-folder replacement remains refused.

## Latest local checks

`pnpm check` passed: lint, TypeScript, 68 tests, 49 declared persistence-store skips, and build. `node --test example/greet.test.js` passed. `npm test --prefix workspace` passed all 12 model-created tests. `git diff --check` passed.

A fresh copy with no `.env`, `.data`, `.copilotkit`, workspace, or node_modules passed:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm workspace:create
node --test workspace/greet.test.js
```

The fresh install reused the local pnpm package store. pnpm reported skipped dependency build scripts; checks and sample creation still passed. This was a clean app setup check, not a second backend installation.

The guide's dashboard controls were checked in the installed 0.15.0 browser UI. Relative Markdown links and `git diff --check` passed. This standalone repository has no `docs:check` script or Nx targets. No hosted deployment, automatic-scheduler run, multi-user concurrency test, or long-term Learning-quality benchmark was performed.
