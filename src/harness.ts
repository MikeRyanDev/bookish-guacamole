import { permissionPreview } from "./permission-preview.js";
import { SkillRegistry } from "@copilotkit/runtime/internal/learned-skills";
import type { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { type AnyTextAdapter } from "@tanstack/ai";
import { defineHarness } from "@tanstack/ai-harness";
import { permissions, todos } from "@tanstack/ai-harness/plugins";
import { workspaceTools } from "@tanstack/ai-harness/plugins/coding";
import { projectInstructions } from "@tanstack/ai-harness/plugins/node";
import { learnedSkills } from "./learned-skills.js";
import { loadModelCatalog, type ModelCatalog } from "./model.js";
import { selectedModelGoal } from "./model-settings.js";

/** Combines official coding plugins with published Intelligence Skills. */
export function createCodingHarness(options: {
  root: string;
  intelligence: CopilotKitIntelligence;
  containerId: string;
  adapter?: AnyTextAdapter;
  models?: ModelCatalog;
}) {
  const catalog: Pick<ModelCatalog, "defaultModel" | "adapters"> =
    options.models ??
    (options.adapter
      ? { defaultModel: "custom", adapters: { custom: options.adapter } }
      : loadModelCatalog());
  const skills = new SkillRegistry({
    client: options.intelligence,
    containerId: options.containerId,
    freshnessWindowMs: 0,
  });
  return defineHarness({
    name: "starter/coder",
    adapter: catalog.adapters[catalog.defaultModel]!,
    models: catalog.adapters,
    systemPrompts: [
      "You are a coding agent. Read the project instructions and inspect relevant files before editing.",
      "The learned Skill catalog is injected automatically. Load and apply relevant Skills with load_skill before editing, and cite their names.",
      "Make small changes. Run the relevant tests. Report what changed and the actual test result. Never claim a test ran if it did not.",
    ],
    plugins: () => [
      learnedSkills(skills),
      workspaceTools({
        root: options.root,
        outside: "deny",
        web: false,
        bashTimeoutMs: 30_000,
      }),
      projectInstructions({ root: options.root, env: false }),
      permissionPreview(options.root),
      permissions({ root: options.root }),
      todos(),
      selectedModelGoal(catalog.adapters, catalog.defaultModel),
    ],
  });
}
