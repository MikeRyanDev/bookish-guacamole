import {
  formatSkillCatalog,
  loadSkill,
  SkillRegistry,
} from '@copilotkit/runtime/internal/learned-skills';
import type { CopilotKitIntelligence } from '@copilotkit/runtime/v2';
import { type AnyTextAdapter, toolDefinition } from '@tanstack/ai';
import { defineHarness } from '@tanstack/ai-harness';
import { permissions, todos } from '@tanstack/ai-harness/plugins';
import { workspaceTools } from '@tanstack/ai-harness/plugins/coding';
import { projectInstructions } from '@tanstack/ai-harness/plugins/node';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';

/** Combines official coding plugins with published Intelligence Skill tools. */
export function createCodingHarness(options: {
  root: string;
  intelligence: CopilotKitIntelligence;
  containerId: string;
  adapter?: AnyTextAdapter;
}) {
  const skills = new SkillRegistry({
    client: options.intelligence,
    containerId: options.containerId,
  });
  return defineHarness({
    name: 'starter/coder',
    adapter: options.adapter ?? openaiText('gpt-4.1'),
    systemPrompts: [
      'You are a coding agent. Read the project instructions and inspect relevant files before editing.',
      'List learned skills at the start of each task. Load and apply relevant skills, citing their names. If no skills are available, say so and continue with the task.',
      'Make small changes. Run the relevant tests. Report what changed and the actual test result. Never claim a test ran if it did not.',
    ],
    tools: [
      toolDefinition({
        name: 'list_learned_skills',
        description:
          'List published coding lessons from the Intelligence Learning Container.',
        inputSchema: z.object({}),
      }).server(async () => formatSkillCatalog(await skills.acquireSnapshot())),
      toolDefinition({
        name: 'load_learned_skill',
        description: 'Read a published skill before applying its instructions.',
        inputSchema: z.object({ name: z.string() }),
      }).server(async ({ name }) =>
        loadSkill(await skills.acquireSnapshot(), name),
      ),
    ],
    plugins: () => [
      workspaceTools({
        root: options.root,
        outside: 'deny',
        web: false,
        bashTimeoutMs: 30_000,
      }),
      projectInstructions({ root: options.root, env: false }),
      permissions({ root: options.root }),
      todos(),
    ],
  });
}
