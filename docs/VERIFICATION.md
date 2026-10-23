# Verification record

## Current browser delivery checks

The older terminal/GPT-4.1 evidence below is historical. It does not prove the new browser or Luna Learning path.

Browser checks on 2026-10-22, with final checks and installed Learning proof on 2026-10-23:

| Command                                                                                          | Observed result                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                                     | Lint and both TypeScript projects passed; 80 tests passed, 49 declared store checks skipped; browser built in 813 ms and server in 15 ms on the existing install |
| `pnpm test:e2e e2e/workspaces.spec.ts e2e/tool-renderers.spec.ts e2e/virtual-transcript.spec.ts` | Three browser tests passed: workspace management/reload/empty state; tool cards and axe in both themes; bounded virtual DOM and scroll-follow behavior           |
| `LIVE_MODEL=1 pnpm test:e2e e2e/live-model.spec.ts`                                              | Passed in 15.2 seconds against the real local backend and `gpt-6-luna`                                                                                           |
| `git diff --check`                                                                               | Passed                                                                                                                                                           |

Live browser thread: `61273bab-6138-42f9-9e5c-508c39231950`. The agent loaded `greet-blank-trim-validation` from the published Skill registry and executed two separately approved `npm test` calls. Both reported 14 passing workspace tests. The SDK returned ten unique tool calls, one Skill load, two bash calls, no message snapshots, no decode errors, and no truncation. Reload restored the final response and the same persisted tool-call count.

Screenshots: [light](proof/luna-light.png), [dark](proof/luna-dark.png), [tool cards light](proof/tool-cards-light.png), [tool cards dark](proof/tool-cards-dark.png). The dark live screenshot was visually inspected after the test. Raw events and logs remain ignored under `.data/`.

The file-list regression first failed on a folder without Git. The bounded fallback now passes alongside checks for private paths, symlinks, a 1,001-file folder, and missing folders. The empty-workspace browser assertion also failed before its UI state was added.

`LIVE_MODEL=1 pnpm test:e2e e2e/live-workspaces.spec.ts` passed in 11 seconds. Two real Luna sessions read different files in separate named workspaces. Switching isolated the file list and session history. A deliberately mixed workspace/thread URL returned Intelligence's `THREAD_AGENT_MISMATCH` and no foreign transcript. Removing and reopening the first folder restored its original workspace ID and saved conversation. [Workspace screenshot](proof/workspace-isolation.png).

Proof threads: alpha `74cd3cde-3ef7-4c46-8aac-dbbc33bcca95`; beta `e16a8920-a93b-4ab4-837c-2fac188200f4`. IDs and folder paths are recorded privately in `.data/workspace-isolation-proof.json`.

Two regressions were reproduced and fixed: an explicitly opened folder ignored by its parent Git repository no longer appears empty, and image restoration handles an interrupted apply that never changed the deployment. The interruption regression substitutes Docker; actual image restoration and reapplication also passed on 2026-10-23.

`LIVE_MODEL=1 pnpm test:e2e e2e/live-controls.spec.ts` passed both live controls in 14.7 seconds. Rejection thread `953c2500-3567-475e-8503-46ef441d91df` recorded the denied tool result; the requested file stayed absent and reload retained the refusal. Cancellation thread `f1bb5e72-9cc7-450d-86a5-fe94766acfab` persisted a `cancelled` outcome after stopping active text streaming; reload restored the partial response without restarting the run.

`pnpm test:e2e` passed eight browser tests in 11.1 seconds, including mobile panels, light/dark axe checks, and opening/navigating/closing the CopilotKit Inspector. Four model tests skip without `LIVE_MODEL=1`; their explicit live commands above passed separately. [Inspector screenshot](proof/copilotkit-inspector.png) was visually inspected.

A clean copy of this browser revision, without `.env`, `.data`, `.copilotkit`, `workspace`, or `node_modules`, passed `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm workspace:create`, and `node --test workspace/greet.test.js`. Installation took 5.1 seconds with the shared pnpm cache; browser build took 1.11 seconds and server build 14 ms. The copy passed 80 tests with 49 declared store skips. This verifies app setup, not a second backend installation. pnpm reported four ignored dependency build scripts; all checks still passed.

`pnpm format:check` passes with explicit exclusions for vendored skills, generated guidance, user-owned requirements, and private/generated outputs. Browser fixtures and E2E tests are included in TypeScript checks. The deprecated tsdown option was replaced; large frontend chunks remain a build warning.

`PORT=4175 pnpm start` also served the built HTML and JavaScript bundle with HTTP 200 and the correct JavaScript content type. That production check was stopped afterward; the development browser remains available at port 4173.

## Installed Luna Learning and automatic refresh

The installed CLI stack ran native `openai/gpt-6-luna` using Intelligence branch
image `cpki-luna-app-api:34918f9e1`, revision
`34918f9e1952d06c0c9ab0e21d0f4ff4bebddfc0`, image ID
`sha256:b0d72c8dc52b3d5961879d94a2713456e1f493b574366e94e5384f6174a47338`.
Its read-only, non-root runtime startup smoke passed, including deferred model setup.

Run `01a1690a-beaf-7c59-961f-b37e9328670c` succeeded over 16 evidence threads,
producing one Insight and one Skill candidate. Review approved
`regression-only-coverage` as Skill `01a1690c-42c5-7ea6-b3a2-169705cdfc0e`, registry
revision 2. The candidate contains a baseline/test-only-change/retest procedure.

`LIVE_MODEL=1 LIVE_LEARNING=1 pnpm exec playwright test e2e/live-learning.spec.ts`
passed in 11.8 seconds. Without a server restart or naming the Skill in the user
prompt, the next browser turn loaded the new Skill, explained its procedure, and
restored the response after reload. Thread `629301b7-bbf5-43f9-8a09-2412ea7adf07`.
[Inspected screenshot](proof/learned-skill-refresh.png).

Both branch images were restored to the captured CLI digest
`sha256:6de1be3ea286385b9eac7f929aee6ff44476d7662965672381eeec380e77795f`
and `IfNotPresent` policy with readiness confirmed. The tested branch image was
then reapplied for continued starter use. Recovery remains
`pnpm intelligence:image:restore`; normal startup never applies an override.
[Removal procedure](TEMPORARY-INTELLIGENCE.md).

Intelligence changes are staged in [draft PR #2041](https://github.com/CopilotKit/Intelligence/pull/2041).
The app-api image smoke passes. A pinned shared smoke fixture needed a Flue 2
result-tool/prompt-role update; its ten tests pass locally and the updated CI run
is pending. This is a temporary branch image, not a released Intelligence version.

## Verified on 2026-10-22

| Check              | Evidence                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Published packages | npm reports TanStack AI 1.0.0, harness 0.1.0, CopilotKit 1.79.1, CLI 4.29.0                             |
| Event bridge       | Real harness with a deterministic provider; public AG-UI runner accepts the event sequence              |
| Run identity       | Provider IDs cannot replace the outer Intelligence thread and run IDs                                   |
| Tool evidence      | Tool arguments and results survive the bridge; one final event closes the whole turn                    |
| Errors             | Provider failure produces an error, not successful completion                                           |
| Approval           | The public agent API pauses before execution and resumes the tool exactly once                          |
| Cancellation       | Unsubscription cancels the underlying model through the harness control API                             |
| Restart            | A new SQLite connection and new host restore the previous model context                                 |
| Coding permissions | Official write_file plugin resumes across a host restart; once writes the file, reject leaves it absent |
| SQLite contract    | 56 applicable official persistence checks pass; 49 checks for absent stores skip                        |
| Sample workspace   | Node's built-in test runner passes the greeting test                                                    |

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

| Check            | Recorded evidence                                                                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI installation | `local setup --model-config .data/learning-model.json --json` completed; app-api, gateway, frontend, Learning agent and reconciler pods ready                                                                                            |
| Connection       | `local connect --json` preview followed by `local connect --approve-connection --json`; local project 1                                                                                                                                  |
| Container        | `learning containers create --id coding-lessons --name "Coding lessons" --json` succeeded                                                                                                                                                |
| Coding + restart | Thread `f68e6556-41b2-491b-b82a-197d0bc5edbf`: real file/shell approvals, failing regression tests, process restart, replay, continuation, and 4 passing tests                                                                           |
| Persisted events | SDK `getThreadEvents` returned 151 events for that thread, no decode errors, no truncation                                                                                                                                               |
| Learning         | Manual run `01a166d9-4246-7c61-9092-d69265abc900` succeeded with one evidence thread, one Insight, and one Skill candidate                                                                                                               |
| Insight          | `01a166d9-9c49-7c85-936f-ade8947e6fca`; cites the actual coding thread and eight transcript message references                                                                                                                           |
| Published Skill  | Reviewed candidate `01a166d9-9c49-71f1-b211-9e7a50b2f48a`; approved Skill `01a166d9-f59a-77c1-857b-5fa252a69237`, registry revision 1                                                                                                    |
| Later Skill use  | Thread `e00fdd3d-81af-480d-804d-23e448760c2b`: `copilotkit_load_skill` returned the full published `greet-blank-trim-validation` instructions, followed by real file edits and test execution; 86 events, no decode errors or truncation |
| Workspace result | Independent `npm test --prefix workspace`: all 12 tests passed, including four new tab/newline cases                                                                                                                                     |
| Cancellation     | Thread `3deba503-4657-4657-b43e-a0e422e553a4`, run `ce678445-fc6d-4a25-810a-56a777f009fe`: client aborted after text began; backend persisted `RUN_FINISHED` with `outcome.type: cancelled`                                              |
| Rejection        | Thread `36435dfa-3ece-4712-a667-85c8c7631277`: refused write returned `The user denied this tool call`; no farewell file was written by that call                                                                                        |
| Dashboard        | Browser sign-in completed; Coding lessons showed 1 Insight, 1 Skill, and the finished manual analysis                                                                                                                                    |

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
