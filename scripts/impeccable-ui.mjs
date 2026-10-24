import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Adapted from Intelligence b10ee8971 (Tyler Slaton). Scope this starter's UI only.
export const UI_ROOTS = Object.freeze(["src/client/", "src/client/index.html"]);
const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const launcherPath = join(repositoryRoot, "node_modules/impeccable/cli/bin/cli.js");
const PATCH_FILE_HEADER = /^\*\*\* (?:Add|Update|Delete) File: (.+)$|^\*\*\* Move to: (.+)$/gm;

/**
 * Reads the file paths an agent tool call edited.
 *
 * Claude Code edits name `tool_input.file_path`; Codex `apply_patch` calls carry
 * the patch text, whose file headers name every touched path.
 *
 * @param {Record<string, unknown> | string} toolInput - The hook payload's `tool_input`.
 * @returns {string[]} Edited paths as written in the payload.
 */
function editedPaths(toolInput) {
  if (typeof toolInput === "string") toolInput = { input: toolInput };
  const paths = [];
  for (const key of ["file_path", "path", "notebook_path"]) {
    if (typeof toolInput[key] === "string") paths.push(toolInput[key]);
  }
  const patchText = [toolInput.command, toolInput.input, toolInput.patch]
    .flat()
    .filter((part) => typeof part === "string")
    .join("\n");
  for (const match of patchText.matchAll(PATCH_FILE_HEADER)) {
    paths.push((match[1] ?? match[2]).trim());
  }
  return paths;
}

/**
 * Reports whether a path lies inside one of the UI roots.
 *
 * @param {string} filePath - An edited path, absolute or relative to `cwd`.
 * @param {string} cwd - The directory the agent session runs in.
 * @param {string} repoRoot - The repository root.
 * @returns {boolean} True for a file under a UI root.
 */
function isUiPath(filePath, cwd, repoRoot) {
  const absolute = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  const fromRoot = relative(repoRoot, absolute).split(sep).join("/");
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) return false;
  if (!/\.(?:tsx?|css|html)$/.test(fromRoot)) return false;
  return UI_ROOTS.some((root) =>
    root.endsWith("/") ? fromRoot.startsWith(root) : fromRoot === root,
  );
}

/**
 * Decides whether an agent hook event should reach the impeccable detector.
 *
 * Edits outside the UI roots are skipped. The Stop deep pass, and any event
 * whose edited path cannot be read, are forwarded so the detector applies its
 * own filters rather than losing a scan.
 *
 * @param {unknown} payload - The parsed hook payload from stdin.
 * @param {string} repoRoot - The repository root.
 * @returns {boolean} True when the detector should run.
 */
export function shouldRunDesignHook(payload, repoRoot) {
  if (typeof payload !== "object" || payload === null) return true;
  const { hook_event_name: event, tool_input: toolInput, cwd } = payload;
  if (
    event !== "PostToolUse" ||
    (typeof toolInput !== "object" && typeof toolInput !== "string") ||
    toolInput === null
  ) {
    return true;
  }
  const paths = editedPaths(toolInput);
  if (paths.length === 0) return true;
  const sessionDirectory = typeof cwd === "string" ? cwd : repoRoot;
  return paths.some((filePath) => isUiPath(filePath, sessionDirectory, repoRoot));
}

/**
 * Runs the pinned npm CLI and returns its exit status.
 *
 * @param {string[]} args - Launcher arguments.
 * @param {{ input?: string }} [options] - Text to pass on stdin.
 * @returns {number} The CLI's exit status.
 */
function runLauncher(args, { input } = {}) {
  const result = spawnSync(process.execPath, [launcherPath, ...args], {
    cwd: repositoryRoot,
    input,
    timeout: 120_000,
    stdio: [input === undefined ? "inherit" : "pipe", "inherit", "inherit"],
  });
  if (result.error) {
    process.stderr.write(`impeccable-ui: could not run ${launcherPath}: ${result.error.message}\n`);
    return 1;
  }
  return result.status ?? 1;
}

/**
 * Forwards an agent hook event to the detector when it concerns UI code.
 *
 * A missing skill never blocks an edit: the hook reports it and exits cleanly.
 *
 * @returns {number} The exit status for the hook runner.
 */
function runHook() {
  const raw = readFileSync(0, "utf8");
  let payload = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Forward unparsable input unchanged; the detector owns the payload format.
  }
  if (!shouldRunDesignHook(payload, repositoryRoot)) return 0;
  if (!existsSync(launcherPath)) {
    process.stderr.write(
      "impeccable-ui: impeccable is not installed; run pnpm install; skipping the design hook.\n",
    );
    return 0;
  }
  return runLauncher(["hook"], { input: raw });
}

/**
 * Scans every UI root with the impeccable detector.
 *
 * @param {string[]} extraArgs - Extra detector flags, such as `--json`.
 * @returns {number} The detector's exit status.
 */
function runDetect(extraArgs) {
  if (!existsSync(launcherPath)) {
    process.stderr.write("impeccable-ui: impeccable is not installed; run pnpm install.\n");
    return 1;
  }
  return runLauncher(["detect", ...extraArgs, ...UI_ROOTS]);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === "hook") {
    process.exitCode = runHook();
  } else if (mode === "detect") {
    process.exitCode = runDetect(rest);
  } else {
    process.stderr.write("Usage: node scripts/impeccable-ui.mjs <hook|detect> [detector flags]\n");
    process.exitCode = 2;
  }
}
