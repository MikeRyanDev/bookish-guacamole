import { execFile } from "node:child_process";
import { cp, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

// Refuse to replace an existing workspace or its edits.
await mkdir("workspace");
// Copy children into the directory we just reserved. Current Node versions
// reject cp(sourceDirectory, existingDirectory) with errorOnExist, even if empty.
for (const entry of await readdir("example")) {
  await cp(join("example", entry), join("workspace", entry), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
}
// Give official file tools a Git boundary outside the parent's ignore rules.
await promisify(execFile)("git", ["init", "--quiet", "workspace"]);
console.log(
  "Created workspace/. Run pnpm dev, open http://127.0.0.1:4173, and ask the agent to add a regression test.",
);
