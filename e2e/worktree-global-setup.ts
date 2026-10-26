import { execFileSync } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { join } from "node:path";

/** Rejects stale or foreign listeners before a managed browser suite can run. */
export default async function setup() {
  let state: {
    root: string;
    instance: string;
    token: string;
    mode: string;
    ports: { app: number; fixture: number };
  };
  try {
    state = JSON.parse(await readFile(join(process.cwd(), ".data/worktrunk.json"), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" && !process.env.STARTER_WORKTREE_ROOT)
      return;
    throw error;
  }
  const root = await realpath(process.cwd());
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (state.root !== root)
    throw new Error("Worktree metadata belongs to another checkout. Run wt setup.");
  for (const kind of state.mode === "connected" ? ["fixture", "app"] : ["fixture"]) {
    const url =
      kind === "app" ? process.env.FILE_VIEWER_APP_URL : process.env.FILE_VIEWER_FIXTURE_URL;
    if (!url)
      throw new Error("Managed worktree browser tests require wt check so test URLs are explicit.");
    let token = state.token;
    if (kind === "app") {
      const config = await fetch(`${url}/api/config`, { signal: AbortSignal.timeout(2000) });
      if (!config.ok) throw new Error("Worktree bootstrap failed.");
      token = (await config.json()).token;
    }
    const response = await fetch(
      `${url}${kind === "app" ? "/api/worktree-identity" : "/__worktree"}`,
      {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(2000),
      },
    );
    if (!response.ok) throw new Error(`Worktree identity request failed: ${response.status}`);
    const actual = await response.json();
    for (const [key, value] of Object.entries({ root, commit, instance: state.instance, kind }))
      if (actual[key] !== value)
        throw new Error(`Worktree identity mismatch (${key}). Refuse this server.`);
  }
}
