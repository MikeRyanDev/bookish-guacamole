import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

/** Keep the first sentence of package descriptions; preserve commands and local guidance. */
export function conciseSkillMap(source) {
  return source.replace(/<!-- intent-skills:start -->[\s\S]*?<!-- intent-skills:end -->/g, (map) =>
    map.replace(/^(\s+for: )(.*)$/gm, (_, prefix, encoded) => {
      const description = JSON.parse(encoded);
      return prefix + JSON.stringify(description.split(/(?<=\.)\s/)[0]);
    }),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = spawnSync("pnpm", ["exec", "intent", "install", "--map"], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  await writeFile("AGENTS.md", conciseSkillMap(await readFile("AGENTS.md", "utf8")));
}
