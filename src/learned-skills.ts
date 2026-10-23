import {
  formatSkillCatalog,
  loadSkill,
  readSkillFile,
  type SkillRegistry,
  type VerifiedSnapshot,
} from "@copilotkit/runtime/internal/learned-skills";
import { toolDefinition } from "@tanstack/ai";
import { definePlugin } from "@tanstack/ai-harness";
import { z } from "zod";

/** Injects the SDK-verified catalog before each turn, with one snapshot per turn. */
export function learnedSkills(registry: SkillRegistry) {
  return definePlugin({
    name: "starter/learned-skills",
    setup: () => {
      let snapshot: VerifiedSnapshot | undefined;
      /** Refuses stale or partial data when this turn could not acquire its catalog. */
      function current(): VerifiedSnapshot {
        if (!snapshot) throw new Error("Learned skills are unavailable for this turn.");
        return snapshot;
      }
      return {
        onTurnStart: async () => {
          snapshot = undefined;
          snapshot = await registry.acquireSnapshot();
        },
        prompts: [
          {
            id: "starter/learned-skills/catalog",
            placement: "context",
            text: () =>
              snapshot
                ? formatSkillCatalog(snapshot)
                : "Learned skills could not be loaded for this turn. Continue without them and report that limitation. Never claim a skill was applied.",
          },
        ],
        tools: [
          toolDefinition({
            name: "list_learned_skills",
            description: "Read the automatically injected learned Skill catalog.",
            inputSchema: z.object({}),
          }).server(async () => formatSkillCatalog(current())),
          toolDefinition({
            name: "copilotkit_load_skill",
            description: "Load a relevant published Skill before applying its guidance.",
            inputSchema: z.object({ name: z.string() }),
          }).server(async ({ name }) => loadSkill(current(), name)),
          toolDefinition({
            name: "copilotkit_read_skill_file",
            description: "Read a supporting text file listed by a loaded Skill.",
            inputSchema: z.object({ name: z.string(), path: z.string() }),
          }).server(async ({ name, path }) => readSkillFile(current(), name, path)),
        ],
      };
    },
  });
}
