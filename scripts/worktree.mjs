import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { context, capture } from "./worktree/core.mjs";
import {
  setup,
  dev,
  serve,
  doctor,
  check,
  archive,
  preRemove,
  releasePorts,
  load,
} from "./worktree/lifecycle.mjs";
import { finish, guardMerge } from "./worktree/finish.mjs";

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "guard-merge") await guardMerge();
  else if (command === "setup") await setup(...args);
  else if (command === "dev") await dev(...args);
  else if (command === "serve") await serve();
  else if (command === "doctor") await doctor();
  else if (command === "check") await check(args);
  else if (command === "finish") await finish(args);
  else if (command === "archive") await archive();
  else if (command === "pre-remove") await preRemove();
  else if (command === "release-ports") await releasePorts(args[0]);
  else if (command === "ports-reset") {
    const { ctx, state } = await load();
    if (state.process) throw Error("Run wt dev stop first.");
    await releasePorts(ctx.root);
    await setup(state.base, state.mode);
  } else if (command === "unlock") {
    if (!/^(ports|finish|setup-[a-f0-9]+|dev-[a-f0-9]+)$/.test(args[0] ?? ""))
      throw Error("Name the stale lock shown by wt doctor.");
    const ctx = await context();
    const path = join(ctx.shared, `${args[0]}.lock`);
    const owner = JSON.parse(await readFile(path, "utf8"));
    try {
      process.kill(owner.pid, 0);
      throw Error("Lock owner is still alive.");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    await rm(path);
    console.log("Removed dead-owner lock. Retry the interrupted operation.");
  } else if (command === "task") {
    const { ctx, state } = await load();
    for (const arg of args) {
      const index = arg.indexOf("=");
      const key = arg.slice(0, index);
      const value = arg.slice(index + 1);
      if (index < 1 || !["owner", "purpose", "target"].includes(key) || !value)
        throw Error("Use wt task owner=<name> purpose=<text> target=<branch>.");
      state[key] = value;
      capture("wt", ["config", "state", "vars", "set", `${key}=${value}`], ctx.root);
    }
    const { writeJson } = await import("./worktree/core.mjs");
    await writeJson(ctx.statePath, state);
  } else if (command === "inventory") {
    const ctx = await context();
    const { writeJson } = await import("./worktree/core.mjs");
    const items = JSON.parse(capture("wt", ["list", "--format=json"], ctx.root));
    const file = join(ctx.shared, "inventory.json");
    await writeJson(file, items);
    console.log(file);
  } else
    throw Error(
      "Use wt setup, dev, doctor, check, task, finish, archive, inventory, ports-reset, or unlock.",
    );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
