# Temporary weekend delivery workflow

This workflow applies to starter fixes and their Intelligence or CopilotKit dependencies during the weekend alpha period.
Read the [candidate ledger](../MONDAY_CUTOVER_CHECKLIST.md) before each delivery.
Use [the implementation plan](../LEARNING_KNOB_PLAN.md) for detailed acceptance requirements.
Remove this runbook and its agent entry point before the final stable starter publication.

## Select the current stack

1. Fetch the remote branches in each affected repository. Preserve concurrent work in separate worktrees.
2. Inspect the actual GitHub stack and PR heads. Treat recorded commits as historical evidence, not current branch tips.
3. Branch each dependent fix from its repository's current stack tip. Keep one focused change per layer.
4. Open a draft PR against that parent branch. Cross-link companion PRs in other repositories.
5. Register native GitHub stack membership. A dependent base branch alone does not establish membership.
6. Record the ordered PRs, stack ID, exact heads, and companion links in the candidate ledger.

The initial Intelligence stack is #2064: #2041 → #2063. The companion SDK PR is CopilotKit/CopilotKit #7966.
These are discovery references. Later deliveries can extend or replace their recorded tips.
Native stacks cannot span repositories.

Use the official `github/gh-stack` extension and its guidance when available.
Run commands non-interactively. Pass `--json` to `gh stack view`.
Prefer PR URLs when linking an existing remote stack, so stale local branches cannot replace its parents.
To append a new PR, run `gh stack link <stack-number> <new-pr-url> --remote origin` from that repository.
If no stack exists, use `gh stack link --base main --remote origin <parent-pr-url> <child-pr-url>`.
Verify the ordered remote map through `gh api repos/<owner>/<repo>/stacks/<stack-number>` and each PR's `stack` field.
If native registration fails, stop at that delivery gate and report the cause.

When a lower layer changes, inspect the dependent rebases before pushing them.
Recheck membership, exact heads, and CI after every rebase. Rebased commits need new preview identities and acceptance results.
Do not push an unrelated or stale local parent branch.

## Test and publish matching previews

1. Write failing regression tests before behavior fixes. Run each repository's required checks and affected browser tests.
2. Inspect CI branch filters and custom job guards for dependent PR bases. Do not count skipped required tests as passes.
3. Publish SDK previews through CopilotKit's `publish-commit.yml`. Select the successful run for the exact committed SDK head.
4. Download the public SDK archives. Record their source SHA, versions, URLs, and checksums, including related transitive packages.
5. Freeze the Intelligence tip. Derive the CLI prerelease version from `apps/cli/package.json` and that commit's short SHA.
6. Dispatch `release-chart.yml` with the candidate inputs below. Verify the workflow's actual `headSha` equals the frozen commit.
7. Verify anonymous chart downloads and all eight image digests. Require both AMD64 and ARM64 indexes.
8. Save the candidate record and workflow results. Preserve the reviewed migration identity and compatibility declaration.
9. Dispatch `publish-cli.yml` from the same Intelligence commit. Use the verified SDK commit as `template_ref`.
10. Download the CLI archive. Verify its embedded source identities, chart pin, version, and checksum.
11. Pin the exact public downloads in the starter. Regenerate archive records and lockfile integrity before a frozen install.
12. Complete installed acceptance before committing and publishing the starter update. Update both PR descriptions and the candidate ledger.

Candidate chart inputs:

```text
mode=validate_release
version=0.15.0
publish_local_candidate=true
local_candidate_support=scripts/local-evaluation-support.json
local_candidate_cli_version=<derived CLI version>
```

Matching CLI inputs:

```text
cli_env=production
local_chart_version=0.15.0-validation.<Intelligence sha12>
template_ref=<verified full CopilotKit commit>
```

If GitHub rejects a commit SHA as a dispatch ref, use its branch and verify the resulting run's exact head.
Keep that branch unchanged until publication finishes. Derive versions again when source versions change.
Read Intelligence's current candidate and CLI release runbooks before dispatching workflows.
Do not invent migration compatibility or reuse an artifact identity with different build inputs.
A changed SDK/template pin requires a new Intelligence candidate commit before CLI publication.

Follow [the published alpha guide](https://github.com/MikeRyanDev/bookish-guacamole/blob/main/docs/ALPHA.md) for starter pins and `scripts/pin-alpha-integrity.mjs` when present.
Keep related SDK packages on the same preview commit. Verify archive integrity with `pnpm install --frozen-lockfile`.
Do not merge weekend PRs, push Intelligence `v*` tags, publish stable packages, or promote shared environments during this workflow.
Do not modify a real HTTPS deployment for local acceptance.

## Installed acceptance and evidence

Use a fresh public starter clone and the published CLI's normal setup flow.
Require no private checkout, manual image patch, or hidden source-build dependency.
Record host architecture, cache reuse, commands, artifact identities, and actual results.
Verify setup, connection, Inspector status/retry, Learning links, Luna approvals, and transcript reload.
Run real Learning, review its evidence, publish a supported Skill, and prove delivery on the next turn without an app restart.
Verify restart recovery and Learning runtime recycling. Separate deterministic fixtures from real backend and model evidence.
Report untested deployment or platform coverage explicitly. Never substitute fixture coverage for a claimed live deployment check.
Keep credentials, raw traces, model configuration, and workspace edits ignored.
Retain the last known-good candidate and rollback instructions until stable cutover succeeds.

## Final starter history requirement

The final published starter must have a completely rewritten Git history from a reviewed, clean release tree.
Deleting temporary files in a new commit is insufficient: their earlier versions would remain in its ancestry.
The final history must exclude weekend plans, stack/preview instructions, candidate ledgers, alpha artifacts, temporary workarounds, and development-only evidence.
Keep permanent contributor guidance, functional regression tests, licenses, attribution, and required third-party notices.

At cutover, export required release evidence and rollback records to an approved archive outside the final starter history.
Remove the temporary material listed in the Monday checklist, then validate the complete final tree.
Create a fresh root history with no development ancestry. Audit every branch and tag intended for the final publication.
Use a clean replacement repository if retained hosting refs prevent the required clean publication.
Rewriting a branch does not remove old clones, forks, caches, or retained pull-request refs.
Do not describe a history rewrite as erasure of previously published copies.

This requirement schedules the work; it does not authorize a history rewrite now.
Before any force-push or repository replacement, present the reviewed final tree, ref plan, external archive, and rollback procedure for explicit approval.
Do not rewrite Intelligence or CopilotKit history as part of the starter cleanup.
