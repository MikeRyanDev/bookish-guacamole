import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { IntelligenceAgent } from '@copilotkit/core';
import { startApp } from './app.js';

/** Runs one local terminal conversation through the Intelligence client. */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      prompt: { type: 'string', short: 'p' },
      thread: { type: 'string' },
    },
  });
  if (!process.stdin.isTTY && !values.prompt)
    throw new Error('Use --prompt "task" when stdin is not a terminal.');
  const app = await startApp();
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const agent = new IntelligenceAgent({
    agentId: 'coder',
    runtimeUrl: app.runtimeUrl,
    url: `${app.wsUrl}/client`,
    headers: { authorization: `Bearer ${app.token}` },
  });
  agent.threadId = values.thread ?? randomUUID();
  agent.subscribe({
    onTextMessageContentEvent: ({ event }) => {
      process.stdout.write(event.delta);
    },
    onToolCallStartEvent: ({ event }) => {
      process.stdout.write(`\n[${event.toolCallName}]\n`);
    },
    onRunErrorEvent: ({ event }) => {
      process.stderr.write(`\nRun failed: ${event.message}\n`);
      process.exitCode = 1;
    },
  });
  /** Handles restored approvals before accepting another user task. */
  async function resolveApprovals(): Promise<void> {
    while (agent.pendingInterrupts.length > 0) {
      if (!process.stdin.isTTY)
        throw new Error(
          `Approval required. Resume interactively with --thread ${agent.threadId}`,
        );
      const resume = [];
      for (const interrupt of agent.pendingInterrupts) {
        process.stdout.write(`\n${JSON.stringify(interrupt, null, 2)}\n`);
        const answer = await terminal.question('Allow this call once? [y/N] ');
        resume.push({
          interruptId: interrupt.id,
          status: 'resolved' as const,
          payload: answer.toLowerCase() === 'y' ? 'once' : 'reject',
        });
      }
      await agent.runAgent({ runId: randomUUID(), resume });
    }
  }
  process.stdout.write(`Workspace: ${app.root}\nThread: ${agent.threadId}\n`);
  try {
    if (values.thread) {
      await agent.connectAgent();
      await resolveApprovals();
    }
    while (true) {
      const prompt =
        values.prompt ?? (await terminal.question('\nTask (/exit to quit): '));
      if (prompt === '/exit') break;
      if (!prompt.trim()) {
        if (values.prompt) throw new Error('Prompt must not be empty');
        continue;
      }
      agent.addMessage({ id: randomUUID(), role: 'user', content: prompt });
      await agent.runAgent({ runId: randomUUID() });
      await resolveApprovals();
      process.stdout.write('\n');
      if (values.prompt) break;
    }
  } finally {
    terminal.close();
    await app.close();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Starter failed');
  process.exitCode = 1;
});
