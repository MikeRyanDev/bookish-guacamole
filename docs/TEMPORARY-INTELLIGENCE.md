# Temporary Intelligence branch image

Use this only while the Intelligence fixes await release. Normal `pnpm dev` and `pnpm start` never select or patch an image. The CLI remains responsible for installing and connecting the stack.

**Validation status:** commit `34918f9e1` passed the runtime-image smoke, local rollout, installed Luna Learning, Skill publication, and browser ingestion checks. Restoration returned the deployment to the captured CLI image and `IfNotPresent` policy; reapplication also passed. The local stack currently uses this temporary branch image. See [proof](VERIFICATION.md#installed-luna-learning-and-automatic-refresh).

## Configure native Luna with the branch CLI

The installed CLI 4.29.0 does not offer Luna in its Learning catalog. Use the
CLI built from the same Intelligence branch for this one setup operation;
keep the starter's normal CLI dependency unchanged.

1. Check out `codex/luna-learning-starter-fixes` in your Intelligence repository.
2. In that repository, run `pnpm install --frozen-lockfile`, then `pnpm nx build cli`.
3. Return to the starter and run `pnpm learning:config`. It writes the OpenAI key
   from `.env` to ignored `.data/learning-model.json` with private permissions.
4. Set `INTELLIGENCE_REPO` to that checkout's absolute path, then run:

   ```sh
   node "$INTELLIGENCE_REPO/dist/apps/cli/index.js" local setup \
     --model-config "$PWD/.data/learning-model.json" --json
   ```

5. Build and apply the branch image below before running Learning. Keep using
   `pnpm intelligence` for connection, dashboard, and container commands.

Sign-in and personal terms acceptance are prerequisites, as in the README.
Setup retains the CLI-owned release and configures native `openai/gpt-6-luna`.
Do not supply `baseUrl` for this native provider. This source-CLI step can be
removed with the image override once the released CLI catalog includes Luna.

## Build the reviewed branch

Keep all Intelligence fixes on `codex/luna-learning-starter-fixes` and its draft PR: <https://github.com/CopilotKit/Intelligence/pull/2041>. Commit and validate the final dependency changes before building; the image must identify that exact revision. Do not use the earlier image that contains a model-name workaround.

From a clean Intelligence branch checkout:

```sh
INTELLIGENCE_REVISION=$(git rev-parse HEAD)
docker build -f apps/app-api/Dockerfile \
  --label "org.opencontainers.image.revision=$INTELLIGENCE_REVISION" \
  -t "cpki-luna-app-api:$INTELLIGENCE_REVISION" .
```

This builds the app-api image, which also contains the Learning runtime. The temporary override changes only the `cpki-learning-agent` deployment; it does not replace app-api, databases, or the rest of the stack.

## Import and apply locally

1. Use `pnpm intelligence local list --json` to identify the intended CLI-owned stack. Inspect Docker's node names; use the matching `k3d-local-…-server-0` node.
2. Import the image into that node's containerd store. Set `LOCAL_INTELLIGENCE_NODE` and `INTELLIGENCE_REVISION` to the inspected node and built commit:

   ```sh
   docker save "cpki-luna-app-api:$INTELLIGENCE_REVISION" |
     docker exec -i "$LOCAL_INTELLIGENCE_NODE" ctr -n k8s.io images import -
   ```

3. From the starter, apply the override:

   ```sh
   pnpm intelligence:image:apply "$LOCAL_INTELLIGENCE_NODE" "cpki-luna-app-api:$INTELLIGENCE_REVISION"
   ```

4. Run `pnpm intelligence:image:status` to compare captured and observed image values.
5. Configure the native Learning model through the fixed CLI, run a real analysis, and inspect its final state and evidence. Record the exact image digest, revision, run ID, and outcome in the verification record.

The script checks the local node format and image revision label. It saves the original image and pull policy in ignored `.data/temporary-intelligence-image.json` **before** patching, sets the temporary pull policy to `Never`, and waits for rollout. Preserve this file until restoration is verified. A missing imported image causes rollout failure; use restoration to recover.

## Restore the CLI image

```sh
pnpm intelligence:image:restore
pnpm intelligence:image:status
```

Restore reinstates the captured image and pull policy and waits for readiness. If apply stopped before patching, or restore stopped after patching, an already-original deployment is accepted after readiness verification. A different image or policy is refused so an unrelated update is not overwritten.

Do not delete the state file to bypass an error. Compare its captured values with the observed deployment first. The state file is a recovery record, not a credential store.

## Retire the workaround after release

1. Restore the captured CLI image before asking the CLI to install the released Intelligence version. Verify that the release includes the fixes and that the CLI chooses its images.
2. Repeat the real Luna Learning check using the released image. Record the release, image, run ID, and result.
3. Remove `scripts/temporary-intelligence-image.mjs`, its focused regression test, and the three `intelligence:image:*` package scripts.
4. Remove this runbook and its links, temporary compatibility notes, and local recovery/build artifacts after confirming they are no longer needed.
5. Confirm normal startup still works and no startup code, environment setting, or deployment refers to `cpki-luna-app-api`.

The branch image has no automatic fallback or permanent installation hook. Returning to CLI images is a required delivery check, not an optional cleanup task.
