import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SkillRegistry } from '@copilotkit/runtime/internal/learned-skills';
import { CopilotKitIntelligence } from '@copilotkit/runtime/v2';
import { EventType } from '@tanstack/ai';
import { createHarnessHost } from '@tanstack/ai-harness';
import { expect, test, vi } from 'vitest';
import { createHarnessAgent } from '../src/bridge.js';
import { createCodingHarness } from '../src/harness.js';
import { answer, scriptedAdapter } from './provider.js';

test('catalog instructions point to callable tools that load skills and supporting files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'coding-skills-'));
  const snapshot = vi
    .spyOn(SkillRegistry.prototype, 'acquireSnapshot')
    .mockResolvedValue({
      revision: '1',
      etag: 'test',
      skills: [
        {
          name: 'validation',
          description: 'Validate names',
          files: [
            {
              path: 'SKILL.md',
              size: 17,
              sha256: 'test',
              text: 'Reject blank names',
            },
            {
              path: 'examples.txt',
              size: 12,
              sha256: 'test',
              text: 'Test spaces',
            },
          ],
        },
      ],
    });
  const host = createHarnessHost();
  let call = 0;
  const names: string[] = [];
  const adapter = scriptedAdapter(async function* (options) {
    names.push(...(options.tools ?? []).map((tool) => tool.name));
    const request = [
      { name: 'list_learned_skills', args: {} },
      { name: 'copilotkit_load_skill', args: { name: 'validation' } },
      {
        name: 'copilotkit_read_skill_file',
        args: { name: 'validation', path: 'examples.txt' },
      },
    ][call++];
    if (!request) {
      yield* answer();
      return;
    }
    const timestamp = Date.now();
    const toolCallId = randomUUID();
    yield {
      type: EventType.RUN_STARTED,
      runId: 'provider',
      threadId: 'provider',
      timestamp,
    };
    yield {
      type: EventType.TOOL_CALL_START,
      toolCallId,
      toolCallName: request.name,
      timestamp,
    };
    yield {
      type: EventType.TOOL_CALL_ARGS,
      toolCallId,
      delta: JSON.stringify(request.args),
      timestamp,
    };
    yield { type: EventType.TOOL_CALL_END, toolCallId, timestamp };
    yield {
      type: EventType.RUN_FINISHED,
      runId: 'provider',
      threadId: 'provider',
      timestamp,
      metadata: { tanstack: { finishReason: 'tool_calls' } },
    };
  });
  const agent = createHarnessAgent({
    host,
    harness: createCodingHarness({
      root,
      adapter,
      intelligence: new CopilotKitIntelligence({
        apiKey: 'test',
        apiUrl: 'http://localhost:9',
        wsUrl: 'ws://localhost:9',
      }),
      containerId: 'coding-lessons',
    }),
  });
  const results: string[] = [];
  agent.subscribe({
    onToolCallResultEvent: ({ event }) => {
      results.push(String(event.content));
    },
  });
  agent.addMessage({
    id: randomUUID(),
    role: 'user',
    content: 'Use validation skills.',
  });
  try {
    await agent.runAgent({ runId: randomUUID() });
    expect(names).toContain('copilotkit_load_skill');
    expect(names).toContain('copilotkit_read_skill_file');
    expect(results.join('\n')).toContain('Reject blank names');
    expect(results).toContain('Test spaces');
  } finally {
    snapshot.mockRestore();
    await host.close();
    await rm(root, { recursive: true, force: true });
  }
});
