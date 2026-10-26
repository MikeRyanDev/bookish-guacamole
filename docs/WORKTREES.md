# Parallel work with Worktrunk

Worktrunk owns checkout creation, navigation, hooks, status, and removal. The starter
owns private configuration, service readiness, test selection, and integration checks.
The tested Worktrunk version is recorded in `.worktrunk-version` (0.81.0).

## Install once

Install the recorded version of Worktrunk. On macOS, when Homebrew provides that version:

```sh
brew install worktrunk
wt --version
brew pin worktrunk
wt config shell install zsh
wt config plugins codex install
```

If Homebrew provides a newer version, install the recorded release from
[Worktrunk releases](https://github.com/max-sixty/worktrunk/releases/tag/v0.81.0).
Setup refuses a different version. Review release changes and rerun acceptance before upgrading.
Restart the shell after installation. `type wt` must report a shell function for interactive navigation.
Agents must still pass the checkout directory on every shell tool call.

Put personal paths in `~/.config/worktrunk/config.toml`. For this machine:

```toml
worktree-path = "/Users/mikeryan/Repos/worktrees/{{ repo }}/{{ branch }}"

[list.custom-columns.Owner]
template = "{{ vars.owner | default('') }}"

[list.custom-columns.Ready]
template = "{{ vars.readiness | default('unknown') }}"
```

Keep branch paths separate. Do not create `feat/task/child` inside the existing
`feat/task` worktree. Use `feat/task-child` instead.

Review `.config/wt.toml`, then approve its commands once:

```sh
wt config approvals add --all
```

Worktrunk remembers these approvals. Changed commands require another review.
For authorized unattended setup, `wt config approvals add --all --yes` stores the approvals.
Place global flags before aliases: `wt --yes setup main fixture`.

The Codex plugin supplies guidance and activity markers. It does not create isolated
Codex worktrees automatically. Use `wt switch --create` before opening a desktop task
in that directory. Existing Codex sessions can need a restart to load the plugin.
Open `/hooks` in Codex and review the four Worktrunk marker commands before trusting them.
Plugin installation alone does not activate untrusted hooks.
Markers can remain after a process crash. They do not prove that a process is alive.
The repository's existing Impeccable hooks remain separate.

## Create or resume a task

```sh
wt switch --create feat/example --base main
wt task owner=your-name purpose='Explain the intended change' target=main
wt doctor
```

Creation runs a blocking setup hook, then starts the fixture server in the background.
`wt doctor` checks readiness and returns JSON. If startup is still in progress, retry it.
Use `wt switch feat/example` to resume. Use `wt list` for status and URLs, or
`wt list --format=json` for automation. `wt inventory` saves an inventory under the
shared Git directory. Existing worktrees stay at their original paths.

The exact initial commit, base branch, owner, purpose, and target are recorded in
`.data/worktrunk.json`. Worktrunk branch variables hold public task metadata and ports.
Neither file copies secrets into tracked configuration. A default owner comes from
`STARTER_WORKTREE_OWNER` or `USER`. A default purpose comes from
`STARTER_WORKTREE_PURPOSE` or the branch name.

## Setup and private files

`wt setup [base] [fixture|connected]` supports retries. It keeps existing private files
and workspace edits. It runs a frozen pnpm install inside each checkout. Dependencies
are not symlinked between checkouts. The pnpm package store remains shared.

`.worktreeinclude` permits only `.env`, `models.json`, and `learning.json`.
Worktrunk reads this include file at the copy source, normally the primary checkout.
The primary checkout must contain the committed file before automatic copying works.
This matters during the first installation and when adopting an older checkout.
The command never copies `.data`, `workspace`, dependency directories, or test evidence.
Use `wt step copy-ignored --require-include --dry-run` to inspect the selection.

Copied workspace and model paths must stay inside the new checkout. Setup rejects
outside paths and symlinks without printing their values. Correct the private file,
then retry `wt setup`. Existing destination files are not overwritten.

## Choose the runtime mode

The default mode is `fixture`. It needs no model credentials or backend mutation.
It serves deterministic UI fixtures. Its URL is not the complete connected application.

Connected mode uses the existing local Intelligence connection:

```sh
wt dev stop
wt setup main connected
wt dev
wt doctor
```

For creation directly in connected mode, set `STARTER_WORKTREE_MODE=connected` before
`wt switch --create`. Prepare valid `.env` and `models.json` first. `learning.json` is copied when present.
The existing backend already owns its Learning model configuration.
The script checks required connection fields without printing credentials. It does not
install, upgrade, reset, or change the Intelligence backend.

Each checkout has its own workspace, `.data`, dependency directory, fixture output,
and app/fixture/reload ports. The connected backend still shares conversations and
Learning resources. Use separate test conversations. Backend isolation requires a
separate connection and explicit backend setup.

Port allocation uses Worktrunk's path hash as a starting point. A repository lock
coordinates reservations. Startup checks actual listeners because other repositories
and applications can occupy a reserved port. If a port is occupied, stop the conflicting
listener or run `wt dev stop`, `wt ports-reset`, and `wt dev`.

## Start, stop, and check

```sh
wt dev
wt dev restart
wt dev stop
wt check
wt check e2e/worktree.spec.ts e2e/tool-renderers.spec.ts
```

`wt dev` reuses only a server with matching checkout, commit, mode, and startup instance.
It uses Worktrunk tether and records the server process group for explicit stop/restart.
It checks process identity before sending a signal. Logs remain in `.data/worktrunk-server.log`.
A failed startup remains available for inspection. Fix the error, then run `wt dev restart`.

`wt check` runs `pnpm check`, the greeting test, the managed browser smoke test, and
`git diff --check`. Named browser tests replace the smoke selection. Run affected
browser suites before delivery. Fixture mode does not establish live model or backend proof.

Managed Playwright runs check server identity before tests. Direct Playwright calls
in a prepared checkout must supply the managed URLs; `wt check` does that automatically.
A server with the wrong root, commit, or startup instance fails the suite. A listening
port alone is insufficient evidence. An unmanaged checkout retains the legacy test workflow.

## Integrate reviewed work

Commit the reviewed source before integration. Set the intended target with `wt task`.

```sh
wt finish main
```

The finish command holds one repository lock through the entire operation. It refuses
a dirty source, a dirty target, and a target without a checkout. It invokes
`wt merge <target> --no-commit --no-remove`. Worktrunk rebases, runs blocking pre-merge
checks, and updates the local target. It never fetches. Fetch and inspect remote refs
explicitly when the task depends on remote state.

The pre-merge hook requires the finish coordinator. It cannot accidentally run outside
the integration lock. A second finish request fails with a busy message and can retry.
After the update, finish prepares a target fixture and runs the target checks. The
source remains available after success or failure. A target check failure does not
roll back the merge automatically. Fix the combined result and run checks again.

For a known unrelated tracked edit, an explicit exception can preserve that one file:

```sh
wt finish main --preserve=MONDAY_CUTOVER_CHECKLIST.md
```

The exception rejects staged changes, untracked files, and paths touched by the source.
It compares the target's patch before and after integration and final checks.
Normal tasks do not need this exception.

If a rebase conflicts, resolve or abort it in the source checkout. Review the result,
then rerun `wt finish`. Published preview commits require new evidence after rebasing.

## PRs and dependent branches

Create dependent tasks from the actual parent: `wt switch --create feat/child --base feat/parent`.
Set `target=feat/parent` for local integration. Use `wt switch pr:123` for PR review.
Old branches without the configuration need an explicit adoption before managed checks.

GitHub tooling still owns publication, PR creation, and native stack membership.
A parent branch alone does not establish a native stack. During the temporary weekend
period, obey [WEEKEND-DELIVERY.md](WEEKEND-DELIVERY.md) and inspect the current candidate
ledger. Preserve exact preview identities and leave upstream PRs unmerged.
Worktrunk does not publish previews or override release gates.

## Archive, remove, and recover

```sh
wt archive
wt remove feat/example --foreground
wt step prune --dry-run --format=json
```

Archiving stops owned services and copies private workspace data and test evidence to
`<git-common-dir>/starter-worktrunk/archives/`. This location is outside linked worktrees
and remains private. An archive does not establish that a branch is integrated.
The pre-remove hook checks ownership and the artifact fingerprint. Later artifact
changes require another archive. Credentials in `.env` are not archived by this command.

Preview bulk cleanup first. Each managed worktree requires its own archive. Age and
Git merge status alone do not establish that private work is disposable. Do not use
`--force`, `-D`, or `--no-hooks` as routine cleanup. Use `--no-delete-branch` to retain
an experimental branch. Existing unmanaged worktrees need individual inspection.

Worktrunk removes files in the background by default. Use `--foreground` when completion
must mean that removal finished. Tether also stops services if another tool removes
the worktree. `--reap` is a recovery tool that finds detached processes by working directory.

`wt doctor` reports shared locks. A live owner keeps its lock. If the owner is dead,
`wt unlock <name>` removes its stale lock. It refuses a live PID. Retry the interrupted
operation afterward. Never remove another agent's lock based only on elapsed time.

## Acceptance and upgrades

Run `pnpm test:worktree` for lock, port, identity, path, and dirty-target regression tests.
Run `node scripts/worktree/acceptance.mjs` for three simultaneous real worktrees,
failed setup recovery, wrong-server rejection, interruption, and artifact cleanup.
This opt-in acceptance run installs dependencies and starts local fixture servers.
It records evidence under the shared Git directory and keeps failed checkouts for diagnosis.
Do not include it in every unit test run.

Before changing the version pin, rerun unit, real lifecycle, connected identity,
merge conflict, concurrent finish, and merged-target acceptance. Record timings and
manual command counts separately from backend/model evidence.
