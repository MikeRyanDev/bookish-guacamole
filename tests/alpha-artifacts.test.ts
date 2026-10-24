import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("every preview archive has a recorded integrity in the lockfile", () => {
  const lock = readFileSync("pnpm-lock.yaml", "utf8");
  const archives = [
    JSON.parse(readFileSync("docs/alpha-artifacts/cli-archive.json", "utf8")),
    ...JSON.parse(readFileSync("docs/alpha-artifacts/sdk-archives.json", "utf8")),
  ];
  const resolutions = lock
    .split("\n")
    .filter((line) => line.includes("resolution:") && line.includes("https://pkg.pr.new/"));
  expect(resolutions).toHaveLength(archives.length);
  for (const archive of archives) {
    const url = (archive.specifier ?? archive.url).replace(
      "https://pkg.pr.new/@copilotkit/",
      "https://pkg.pr.new/CopilotKit/CopilotKit/@copilotkit/",
    );
    const resolution = resolutions.find((line) => line.includes(`tarball: ${url}`));
    expect(resolution).toContain(`integrity: ${archive.integrity}`);
  }
});
