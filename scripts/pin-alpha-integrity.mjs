import { readFile, writeFile } from "node:fs/promises";

/** Generates preview lockfile integrities from the reviewed archive records. */
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const archives = [
  await readJson("docs/alpha-artifacts/cli-archive.json"),
  ...(await readJson("docs/alpha-artifacts/sdk-archives.json")),
];
const canonical = (url) =>
  url.replace(
    "https://pkg.pr.new/@copilotkit/",
    "https://pkg.pr.new/CopilotKit/CopilotKit/@copilotkit/",
  );
const pins = new Map(
  archives.map((archive) => [canonical(archive.specifier ?? archive.url), archive.integrity]),
);
const seen = new Set();
const source = await readFile("pnpm-lock.yaml", "utf8");
const output = source.replace(/^([ ]+)resolution: \{([^\n]+)\}$/gm, (line, indent, fields) => {
  const url = /(?:^|, )tarball: (https:\/\/pkg\.pr\.new\/[^, }]+)/u.exec(fields)?.[1];
  if (!url) return line;
  const integrity = pins.get(url);
  if (!integrity || !/^sha512-[A-Za-z0-9+/]{86}==$/u.test(integrity)) {
    throw new Error(`Missing reviewed SHA-512 archive integrity for ${url}`);
  }
  seen.add(url);
  return `${indent}resolution: {integrity: ${integrity}, tarball: ${url}}`;
});
if (seen.size !== pins.size)
  throw new Error("The archive records do not match the preview lockfile entries.");
await writeFile("pnpm-lock.yaml", output);
console.log(`Pinned ${seen.size} preview archive integrities.`);
