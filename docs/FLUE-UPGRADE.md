# Intelligence Flue upgrade boundary

> Historical implementation and validation record. Named models describe those runs, not starter requirements.
> For current provider-neutral setup, use [model configuration](MODELS.md) and the [README](../README.md).

## Current delivery state

Intelligence now uses Flue 2.3 with native upstream providers. Draft PR #2041
contains the migration. Runtime image `34918f9e1` passed container startup,
installed Luna Learning, Skill publication, browser ingestion without restart,
and restore/reapply checks. See [the verification record](VERIFICATION.md#installed-luna-learning-and-automatic-refresh).
The final Learning suite passed 324 tests; two opt-in live tests were also run.
The subsequent smoke-fixture-only commit adapts the pinned SDK harness and adds
a system-prompt regression; ten fixture tests pass. The shared end-to-end smoke for that commit passed.

## Investigation log (historical)

The starter uses the CLI-installed Intelligence backend. At the start of this investigation, its Learning runtime used Flue `1.0.0-beta.9`. Keep the fixes in the existing Intelligence branch and draft PR; do not add a second Learning implementation to the starter.

## Verified upstream behavior

A disposable installation of released `@flue/runtime@2.3.0` completed a real `openai/gpt-6-luna` run. The model called an evidence tool to read a random token that was absent from its prompt, then submitted that token through a schema-validated result tool. The result arrived through Flue's data writer and agent reply. The probe asserted the exact token, tool execution, and output shape. It registered no custom provider and contained no model-name transport selection.

The separate beta-runtime experiment with the updated Pi provider dependency also passed a real Learning workflow and 298 tests. That is evidence for the dependency cause, not proof that Intelligence has migrated to Flue 2.3.

Flue 2.3 reserves the tool name `finish`; the first disposable probe failed at tool assembly before calling the model. Renaming its application-owned result tool to `submit_result` passed. A migration must use Flue's built-in structured-result facility or a non-reserved application tool name.

## Contracts to preserve

| Boundary          | Current owner and required behavior                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow HTTP     | `libs/learning-agent/src/workflows/`: retain `POST /workflows/{name}?wait=result` and the `{ runId, result }` envelope                                                 |
| Workflow names    | `learning`, `find-insights`, `propose-skill-changes`, `find-insight-candidates`, `reduce-insight-candidates`, `propose-skill-candidates`                               |
| Authentication    | `LEARNING_AGENT_TOKEN`; production fails closed without the expected bearer token                                                                                      |
| Product execution | `apps/app-api/src/learning/learning-agent-client.ts` validates bounded responses; app-api, pg-boss, and Jobs retain retry and publication ownership                    |
| Inspection        | `libs/learning-agent/scripts/report-run.ts` reads paged `/runs/:runId` events, terminal headers, and actual usage; do not replace missing metrics with invented values |

The migration guide in the published runtime package confirms that Flue 2 removes workflow definitions, auto-mounted workflow/run routes, and the old CLI build command. New agents use hooks, explicit routing, and Vite. `init()` provides dispatch/read/abort handles. Cancelling a `read()` only cancels the wait; stopping model work requires `abort()`.

## Storage boundary

`charts/copilot-intelligence/templates/learning/agent.yaml` runs with a read-only root filesystem and no persisted Flue volume. Its command remains `/app/dist/learning-agent/server.mjs`. Product Learning records live outside that process and must remain untouched.

Flue's beta persisted schema cannot be opened directly by version 2. Do not delete or reset an existing developer database as part of this migration. Use a distinct new storage location when testing the new runtime; document export/reseed requirements for developers who retain beta runtime data. The disposable probe uses only fresh in-memory state.

## Implementation and verification sequence

1. Replace Flue agent/tool adapters and build entrypoints while preserving domain schemas, evidence validation, and all six workflows. Use upstream provider metadata for native models; preserve configured OpenAI-compatible endpoints.
2. Add authenticated application-owned workflow routes and run inspection over the new runtime. Cover valid and invalid input, missing/incorrect bearer tokens, model errors, aborts, and concurrent isolated requests.
3. Keep app-api callers unchanged and run their existing workflow-client tests. Run Learning tests, types, lint, build, CLI model conformance, and image packaging checks. Resolve removed upstream catalog entries without silently breaking saved model configuration.
4. Build one commit-labeled branch image, apply it only to the CLI-owned local Learning deployment, and complete real Luna Learning from browser-created evidence. Publish and consume an evidence-backed Skill.
5. Restore the captured CLI image and pull policy, verify readiness, and record the restoration. Keep the temporary mechanism opt-in until the released Intelligence image includes the fixes; then remove it as described in [the retirement runbook](TEMPORARY-INTELLIGENCE.md).

The repository upgrade is in progress. Installed Learning and image restoration are still pending; the disposable probe alone does not prove those delivery gates.

## Migration implementation progress

The Intelligence branch now has a fetch-based workflow boundary in `libs/learning-agent/src/workflow-http.ts`. Nine regression tests cover the result envelope, credential rejection before execution, input and output validation, safe execution errors, cancellation propagation, and streamed request-size limits. This is a transport adapter for the existing Flue surface, not a new Node server. It retains the existing Valibot domain schemas rather than translating their contracts into a second schema system.

Authorization moved to `http-auth.ts`; the beta routes re-export and use the same function. The phase implementations moved unchanged to `learning-phases.ts`, with the old workflow module preserving their exports. The pinned schema test still checks all five model-result sites at their new paths.

The adapter is now mounted in the standalone service described below. Run-event inspection remains unfinished. The existing beta runtime still serves the installed stack.

Validation: `NX_DAEMON=false NX_ISOLATE_PLUGINS=false pnpm nx run-many -t test,lint,typecheck,build -p @cpki/learning-agent` passed after extraction: 307 tests passed and one opt-in live test skipped. Focused regressions failed before each behavior was added. The first extraction check caught the schema-baseline test reading the old source path; updating that path retained its five-site assertion and made the check pass.

## Flue 2 execution and HTTP proof

Intelligence now pins released Flue runtime/CLI 2.3.0 and Pi 1.4.0 in the working branch. The model transport comes from upstream provider metadata. Domain tools keep their existing input/result interface in `tool-contracts.ts`; `flue-execution.ts` translates it to Flue 2, creates a separate agent instance per phase, validates the final result, and forwards cancellation to the agent's durable abort operation.

The six workflow definitions are application-owned. `application.ts` mounts them through the tested HTTP boundary. An Express service starts Flue through its supported standalone Node API. The esbuild target emits the same `dist/server.mjs` entrypoint used by the container, so the repository does not need a Vite major upgrade solely for Flue's optional build plugin.

A live Luna test passed through the migrated adapter, including a domain evidence tool and validated result. The built server then handled a real `POST /workflows/learning?wait=result` request using the repository's example corpus: HTTP 200, run `12c640da-eef6-4695-bf06-c83f4e85ebfc`, three Insights, one proposed Skill, 31.2 seconds. This is synthetic-corpus service proof, not a published Skill from the CLI-installed stack.

`NX_DAEMON=false NX_ISOLATE_PLUGINS=false pnpm nx run-many -t test,lint,typecheck,build,flue-build -p @cpki/learning-agent` passed: 310 tests and two opt-in skips. The adapter live test also passed when explicitly enabled. A real-socket deterministic test verified unauthorized requests return 401 and authorized insight requests return the existing result envelope.

Remaining migration work: application-owned run/event inspection; developer command/report wrappers; CLI model-catalog compatibility; focused app-api/image packaging checks; lockfile review; deployment, installed Learning, and restore proof. The new Node service was stopped after its live check. No installed container image or developer database was changed.

## Developer commands migrated

The example targets now build and run `dist/run.mjs`. It accepts either `--input` JSON or `--input-file`, calls the same application workflow boundary, prints only the result JSON, and fails before model work on invalid arguments. `--help` requires no provider key. The obsolete beta `flue.config.mts` was removed.

The scale-report launcher now starts `dist/server.mjs` instead of `flue dev` and supplies the service bearer token to execution and inspection requests. Its event reads still await the run-inspection implementation; this is not a completed scale-report proof.

The opt-in live command test passed with Luna on a 24-thread synthetic corpus in 38 seconds. All 317 deterministic Learning tests pass, with two opt-in skips; lint, types, both builds, and `pnpm docs:check` pass. The report script also passed a direct strict TypeScript check because it is outside the library source tsconfig.

Next: implement run/event inspection, resolve CLI catalog compatibility, review packaging and lockfile changes, and verify installed Learning plus image restoration.

## Run inspection and CLI compatibility proof

Run inspection now records process-local model usage and tool names behind the
service bearer token. It retains 100 recent runs plus active work, up to 10,000
metrics events per run, and serves 500-event pages with terminal cursor headers.
It omits prompt text, tool arguments, and results. Truncation is explicit and the
scale report rejects incomplete metrics. Product jobs retain durable history.

A live native Luna service run (`054626ed-97cd-4690-9076-51ee9232653e`) returned
three Insights and two Skill proposals. Its inspection endpoint returned HTTP
200, a closed non-truncated stream, seven model turns, 22 tools, and 17,091 tokens.
The model recorded in every turn was `gpt-6-luna`. The service was stopped after
this check. This remains synthetic-corpus proof, not installed publication.

Validation: 321 Learning tests passed (two opt-in skips), plus Learning lint,
typecheck, build, and flue-build. CLI lint, typecheck, and build passed. The CLI
catalog conformance test passes after removing IDs absent from Flue's upstream
catalog. The deterministic three-phase CLI integration and its model tests pass
(five tests); the fixture accepts both released and new result tools. App-api
client, runner, and fanout tests pass (24 tests). Documentation checks pass.
The unused Flue CLI dependency was removed; example and report commands use the
built application entrypoints.

Remaining: lockfile and production packaging review; cancellation/error coverage
for the new execution adapter; commit and update the draft PR; build and apply
its image; verify installed Learning publication and image restoration; finish
the starter requirement audit and delivery.

Final checks before staging the image: 323 Learning tests pass, including actual
Flue cancellation and incomplete-result rejection. App-api production build and
lockfile pruning pass. The frozen lockfile preserves all unrelated importer
resolutions; pnpm still normalizes and prunes old snapshot entries. Full CLI
coverage passed 7,216 tests with one stale fallback-model assertion; correcting
that assertion passed the prompt/catalog rerun (17 tests). Seven CLI integration
tests remained opt-in. The deterministic phase integration was run separately.
