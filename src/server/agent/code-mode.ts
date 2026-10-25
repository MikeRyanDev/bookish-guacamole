import { codeMode } from "@tanstack/ai-code-mode/harness";
import { createQuickJSIsolateDriver } from "@tanstack/ai-isolate-quickjs";
import { definePlugin, type PluginPrompt, type PluginContributions } from "@tanstack/ai-harness";
import type { createExecutionSettings } from "./execution-settings.js";

/** Opt-in isolated composition of inspection tools. Edits and shell stay direct. */
export function optionalCodeMode(settings: ReturnType<typeof createExecutionSettings>) {
  const native = codeMode({
    driver: createQuickJSIsolateDriver({ memoryLimit: 64, timeout: 30000 }),
    timeout: 30000,
    include: (tool) => ["read_file", "list_files", "grep"].includes(tool.name),
  });
  return definePlugin({
    ...native,
    setup: async (ctx) => {
      const contributions: PluginContributions = await native.setup(ctx);
      let enabled = false;
      const prompts: PluginPrompt[] = (contributions.prompts ?? []).map((prompt, index) => ({
        id: `starter/code-mode-${index}`,
        text: (turn) => {
          if (!enabled) return "";
          if (typeof prompt === "string") return prompt;
          if (typeof prompt === "function") return prompt(turn);
          return typeof prompt.text === "string" ? prompt.text : prompt.text(turn);
        },
      }));
      return {
        ...contributions,
        prompts,
        prepareTools: async (turn) => {
          enabled = (await settings.read()).settings.codeMode;
          return enabled && contributions.prepareTools
            ? contributions.prepareTools(turn)
            : turn.tools;
        },
      };
    },
  });
}
