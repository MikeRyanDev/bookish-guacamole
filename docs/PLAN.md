# Delivery plan and review log

## Requirements

Build a local coding agent on the published TanStack AI harness, backed by the CLI-installed CopilotKit Intelligence stack. Prove persisted conversations and Learning, including use of a published Skill on a later coding task. Supply a complete setup and extension guide in this new standalone repository.

## Plan 1

1. Pin TanStack AI 1.0.0 and ai-harness 0.1.0. Follow TanStack's official harness-cli example and coding plugins.
2. Adapt the harness AG-UI stream to a CopilotKit AbstractAgent. Use the published Intelligence runtime for durable runs and Learning assignment.
3. Provide a local terminal client, a small sample coding workspace, and a single documented startup path. Keep model keys server-side.
4. Test ID mapping, history, tools, cancellation, failures, and restart behavior. Exercise a real model and CLI-installed local stack.
5. Run Learning, inspect resulting evidence, publish/download a Skill, and use it in a later task. Finish the guide after those commands work.

## Review 1

- TanStack's core is 1.0.0, but the harness is experimental 0.1.0. Exact pins and a lockfile are required.
- Avoid two competing transcript owners: Intelligence must preserve the durable outer conversation; harness state must restore coherently on restart.
- Preserve tool events and run identity. A text-only adapter would lose the evidence Learning needs.
- Do not call configured Learning a verified run. Capture real backend completion and Skill use separately.
- Local installation has a developer license acceptance step. The CLI requires the developer to accept it personally.
- The local stack is the required product path. Hosted services or a hand-made Docker replacement do not satisfy it.

## Current evidence

- Published npm versions queried on 2026-10-22: @tanstack/ai 1.0.0, @tanstack/ai-harness 0.1.0, copilotkit 4.29.0, @copilotkit/runtime 1.79.1.
- Official source reference: https://github.com/TanStack/ai/tree/main/examples/harness-cli
- Official coding guide: https://tanstack.com/ai/latest/docs/harness/overview
- CLI local list returned no saved stacks. Docker was stopped and has been started.
- Implementation and end-to-end proof remain in progress.

## Review 2: implementation findings

- TanStack emits harness metadata before the provider run starts. AG-UI's public runner requires RUN_STARTED first. The bridge supplies the outer start before forwarding metadata.
- Provider lifecycle IDs can differ from the requested IDs. The bridge uses the outer Intelligence IDs.
- A tool loop can emit multiple finish events. The bridge holds the final result until the operation stream closes.
- Closing the transport alone does not cancel a harness operation. The bridge sends a targeted control cancellation.
- A direct stream test missed AG-UI's verification rules. Public runAgent tests now cover ordinary turns and approval/resume.
- SQLite passes the official log contracts and a real close/reopen context test.

## Plan 2

1. Complete local sign-in, license acceptance, backend installation, and model configuration.
2. Exercise the terminal against the real Intelligence gateway. Fix setup, replay, approval, and shutdown failures found there.
3. Run the Learning proof with enough distinct conversations and a later Skill-assisted task.
4. Review error paths, credential handling, clean installation, and the guide against the final behavior.
5. Record evidence at each checkpoint. Declare the starter complete only after the full acceptance audit passes.

## Review 3: coding permissions and restart

The prior turn made progress: it created and checked the starter. The installer still reports no stacks, and the existing device-login process remains live. No new installer or login was started.

Two additional tests exercise the official file-edit and permission plugins with SQLite. Both approvals survive a host restart. An approval writes the requested file; a rejection leaves it absent. The harness now accepts a typed adapter override for other providers and deterministic tests.

The next acceptance gate remains real local installation and Learning. Sign-in, personal terms acceptance, and a model key are still required.

## Setup checkpoint

Sign-in and direct GPT-4.1 access are verified. Private model configuration is ready. The latest local setup attempt stopped at personal evaluation terms acceptance; no installer remains running. After acceptance, resume CLI installation with that model configuration, then complete Plan 2 against the real backend.

## Review 4: real backend and Learning

Local release 0.15.0 installed through the published CLI. Real coding, replay after restart, approval, rejection, and cancellation crossed Intelligence. A manual Learning run succeeded, produced a cited Insight and a reviewed Skill, and a later task loaded that Skill before adding tests. See VERIFICATION.md for IDs and results.

Real execution exposed two gaps missed by the original deterministic suite: catalog tool names did not match the registered tools, and the parent ignore rule hid the sample files from official discovery. Both now have red-green regression evidence and passing fixes. The automatic 15-thread threshold is separate from manual analysis; the guide now reflects the verified behavior.

## Plan 3: final delivery review

1. Validate a fresh copy with the frozen lockfile, complete checks, and sample creation.
2. Review the guide against the installed dashboard and actual commands.
3. Review the final diff for credentials, scope, and stale claims. Commit the focused changes.
4. Audit the original requirements against recorded evidence before declaring completion.

## Final review

The fresh copy passed frozen installation, lint, typecheck, 68 tests, build, sample creation, and the sample test. The original objective is covered by real evidence: a separate local repository, official TanStack coding plugins, the CLI-installed Intelligence backend, persisted runs, Learning output, reviewed publication, later Skill loading and use, and the setup/extension guide.

Known limits are explicit: experimental harness/SQLite, noisy SDK envelope warnings, model follow-through needing supervision, and manual Learning rather than an automatic-scheduler proof. Credentials and raw local state stay ignored. No remote repository or deployment was requested.
