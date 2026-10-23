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

A CLI device login is waiting for the developer. The CLI also requires personal evaluation terms acceptance. Agents cannot submit that acceptance.

## Still required

1. Finish account sign-in and terms acceptance. Install and connect the local backend with a Learning model.
2. Run the real coding task. Inspect persisted Intelligence events and reconnect after an app restart.
3. Test approvals and cancellation through the real Intelligence gateway.
4. Supply enough real conversations for Learning. Record the completed Learning run, Insight, and approved Skill.
5. Use that Skill in a later coding task. Review setup from a clean checkout and finish the guide with actual evidence.

No real-model, local-backend, or Learning success is claimed yet.

## Latest local checks

`pnpm check` passed with 66 tests and 49 declared skips, plus lint, TypeScript, and build. `node --test example/greet.test.js` passed. The two new cases run the actual coding plugins with a scripted provider; they do not prove real model access.
