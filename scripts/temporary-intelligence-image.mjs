import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const statePath = ".data/temporary-intelligence-image.json";
const [action, node, image] = process.argv.slice(2);
/** Runs kubectl only inside the explicitly selected CLI-owned local node. */
function kubectl(node, args) {
  if (!/^k3d-local-[a-f0-9]+-server-0$/.test(node))
    throw new Error("Expected a CLI local k3d node name.");
  return execFileSync("docker", ["exec", node, "kubectl", ...args], {
    encoding: "utf8",
    timeout: 180_000,
  });
}
/** Reads only the Learning container image and pull policy, never environment secrets. */
function current(node) {
  const deployment = JSON.parse(
    kubectl(node, ["get", "deployment", "cpki-learning-agent", "-o", "json"]),
  );
  const container = deployment.spec.template.spec.containers.find(
    (c) => c.name === "learning-agent",
  );
  if (!container) throw new Error("Learning container not found.");
  return { image: container.image, imagePullPolicy: container.imagePullPolicy };
}
/** Applies a guarded image change and waits for the Learning deployment. */
function replace(node, before, after) {
  const live = current(node);
  if (live.image !== before.image || live.imagePullPolicy !== before.imagePullPolicy)
    throw new Error("Image changed since capture; refusing to overwrite another update.");
  kubectl(node, [
    "patch",
    "deployment",
    "cpki-learning-agent",
    "--type=strategic",
    "-p",
    JSON.stringify({
      spec: { template: { spec: { containers: [{ name: "learning-agent", ...after }] } } },
    }),
  ]);
  kubectl(node, ["rollout", "status", "deployment/cpki-learning-agent", "--timeout=150s"]);
}
try {
  if (action === "apply") {
    if (!node || !image || !/^cpki-luna-app-api:[a-f0-9]{9,40}$/.test(image))
      throw new Error("Usage: apply <CLI-local-node> cpki-luna-app-api:<commit>");
    let previous;
    try {
      previous = JSON.parse(await readFile(statePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (previous?.status === "applied")
      throw new Error("An override already exists. Restore it before applying another.");
    const inspect = JSON.parse(
      execFileSync("docker", ["image", "inspect", image], { encoding: "utf8" }),
    )[0];
    const revision = inspect.Config.Labels?.["org.opencontainers.image.revision"];
    if (!revision?.startsWith(image.split(":")[1]))
      throw new Error("Image revision label does not match its commit tag.");
    const original = current(node),
      temporary = { image, imagePullPolicy: "Never" };
    const state = {
      node,
      original,
      temporary,
      revision,
      imageId: inspect.Id,
      status: "applied",
      createdAt: new Date().toISOString(),
    };
    await mkdir(".data", { recursive: true, mode: 0o700 });
    // Write recovery information before mutation so interrupted rollouts can be restored.
    await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
    replace(node, original, temporary);
    console.log(`Learning uses ${image}. Recovery: pnpm intelligence:image:restore`);
  } else if (action === "restore") {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    if (state.status !== "applied") throw new Error("No active image override.");
    const live = current(state.node);
    if (
      live.image === state.original.image &&
      live.imagePullPolicy === state.original.imagePullPolicy
    ) {
      // Recovery may begin before the apply patch, or after an interrupted restore.
      kubectl(state.node, [
        "rollout",
        "status",
        "deployment/cpki-learning-agent",
        "--timeout=150s",
      ]);
    } else replace(state.node, state.temporary, state.original);
    await writeFile(
      statePath,
      JSON.stringify(
        { ...state, status: "restored", restoredAt: new Date().toISOString() },
        null,
        2,
      ) + "\n",
      { mode: 0o600 },
    );
    console.log(`Restored CLI image ${state.original.image}.`);
  } else if (action === "status") {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    console.log(JSON.stringify({ ...state, observed: current(state.node) }, null, 2));
  } else throw new Error("Use apply, restore, or status. See docs/TEMPORARY-INTELLIGENCE.md.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Image override failed");
  process.exitCode = 1;
}
