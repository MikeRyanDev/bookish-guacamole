import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "vite";

// This opt-in build writes source maps only to ignored local build output.
// Run the ordinary build before serving production output.
await build({ build: { manifest: true, sourcemap: "hidden" } });
const root = resolve("dist/client");
const manifest = JSON.parse(await readFile(resolve(root, ".vite/manifest.json"), "utf8"));
const entry = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entry) throw new Error("No browser entry in the build manifest.");
const startup = new Set();
function visit(key) {
  if (startup.has(key)) return;
  startup.add(key);
  for (const imported of manifest[key].imports ?? []) visit(imported);
}
visit(entry);
const chunks = [];
const sources = new Map();
for (const key of startup) {
  const file = manifest[key].file;
  const bytes = await readFile(resolve(root, file));
  chunks.push({ file, bytes: bytes.length, gzipBytes: gzipSync(bytes).length });
  const mapText = await readFile(resolve(root, `${file}.map`), "utf8").catch((error) => {
    if (error.code === "ENOENT") return null; // Generated bundler runtime has no source map.
    throw error;
  });
  if (!mapText) continue;
  const map = JSON.parse(mapText);
  map.sources.forEach((source, index) => {
    const owner =
      source.match(/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/)?.[1] ??
      "application";
    sources.set(
      owner,
      (sources.get(owner) ?? 0) + Buffer.byteLength(map.sourcesContent[index] ?? ""),
    );
  });
}
const report = {
  startupChunks: chunks,
  startupBytes: chunks.reduce((total, chunk) => total + chunk.bytes, 0),
  startupGzipBytes: chunks.reduce((total, chunk) => total + chunk.gzipBytes, 0),
  // These are original source bytes, not minified bundle contributions.
  startupSourceBytesByPackage: Object.fromEntries([...sources].sort((a, b) => b[1] - a[1])),
  deferredEntries: Object.entries(manifest)
    .filter(([, value]) => value.isDynamicEntry)
    .map(([source, value]) => ({ source, file: value.file })),
};
await mkdir(".data", { recursive: true });
await writeFile(".data/bundle-report.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify({
    startupBytes: report.startupBytes,
    startupGzipBytes: report.startupGzipBytes,
    report: ".data/bundle-report.json",
  }),
);
