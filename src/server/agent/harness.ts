import { historyOwnership } from "./undo.js";
import { permissionPreview } from "./permission-preview.js";
import { SkillRegistry } from "@copilotkit/runtime/internal/learned-skills";
import type { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { type AnyTextAdapter } from "@tanstack/ai";
import { defineHarness } from "@tanstack/ai-harness";
import { permissions, todos, usage } from "@tanstack/ai-harness/plugins";
import { workspaceTools, snapshots } from "@tanstack/ai-harness/plugins/coding";
import { projectCompaction } from "@tanstack/ai-compaction";
import { projectInstructions } from "@tanstack/ai-harness/plugins/node";
import { learnedSkills } from "./learned-skills.js";
import { loadModelCatalog, type ModelCatalog } from "./models.js";
import { selectedModelGoal } from "./model-settings.js";
import { contextManagement } from "./context-management.js";
import { optionalCodeMode } from "./code-mode.js";
import type { createExecutionSettings } from "./execution-settings.js";
import type { createExecutionUsage } from "./execution-usage.js";
import type { createRecovery } from "./recovery.js";
import type { createConnections } from "./connections.js";

/** Combines official coding plugins with published Intelligence Skills. */
export function createCodingHarness(options: {
  root: string;
  intelligence: CopilotKitIntelligence;
  containerId: string;
  adapter?: AnyTextAdapter;
  models?: ModelCatalog;
  snapshotDirectory?: string;
  history?: ReturnType<typeof snapshots>;
  connections?: ReturnType<typeof createConnections>;
  execution?: {
    settings: ReturnType<typeof createExecutionSettings>;
    ledger: ReturnType<typeof createExecutionUsage>;
    recovery: ReturnType<typeof createRecovery>;
  };
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
    middleware: options.execution ? [options.execution.ledger.middleware] : [],
    turn: options.execution ? { onModelError: options.execution.recovery.onModelError } : undefined,
    durability: {
      addRecordsToModelContext: { version: "starter-context-v1", record: projectCompaction },
    },
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
      ...(options.connections ? [options.connections.plugin()] : []),
      ...(options.history
        ? [options.history, historyOwnership()]
        : options.snapshotDirectory
          ? [
              snapshots({ root: options.root, dataDir: options.snapshotDirectory }),
              historyOwnership(),
            ]
          : []),
      ...(options.execution
        ? [
            contextManagement({
              settings: options.execution.settings,
              models: catalog.adapters,
              defaultModel: catalog.defaultModel,
            }),
            options.execution.ledger.plugin,
            optionalCodeMode(options.execution.settings),
          ]
        : []),
      usage(),
      todos(),
      selectedModelGoal(catalog.adapters, catalog.defaultModel),
    ],
  });
}
