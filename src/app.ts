import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { CopilotKitIntelligence, CopilotRuntime } from '@copilotkit/runtime/v2';
import { createCopilotNodeListener } from '@copilotkit/runtime/v2/node';
import { createHarnessHost } from '@tanstack/ai-harness';
import { defineAIPersistence } from '@tanstack/ai-persistence';
import { createHarnessAgent } from './bridge.js';
import { createCodingHarness } from './harness.js';
import { openLogStore } from './log-store.js';

/** Reads a required setting without printing its value on failure. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env. See README.md.`);
  return value;
}

/** Refuses accidental use of a hosted backend in this local starter. */
function localUrl(name: string, protocols: string[]): string {
  const value = required(name);
  const url = new URL(value);
  if (
    !protocols.includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  ) {
    throw new Error(`${name} must point to your CLI-installed local backend.`);
  }
  return value;
}

/** Starts a private local runtime; all client calls still cross Intelligence. */
export async function startApp() {
  required('OPENAI_API_KEY');
  const apiUrl = localUrl('INTELLIGENCE_API_URL', ['http:', 'https:']);
  const wsUrl = localUrl('INTELLIGENCE_GATEWAY_WS_URL', ['ws:', 'wss:']);
  const apiKey = required('CPK_INTELLIGENCE_API_KEY');
  const containerId = process.env.LEARNING_CONTAINER_ID ?? 'coding-lessons';
  const root = resolve(process.env.CODING_WORKSPACE ?? 'workspace');
  await mkdir(root, { recursive: true });
  await mkdir('.data', { recursive: true, mode: 0o700 });
  const store = openLogStore(resolve('.data/harness.sqlite'));
  const host = createHarnessHost({
    persistence: defineAIPersistence({ stores: { log: store.log } }),
  });
  const intelligence = new CopilotKitIntelligence({
    apiKey,
    apiUrl,
    wsUrl,
    getLearningContainerId: () => containerId,
  });
  const harness = createCodingHarness({ root, intelligence, containerId });
  const token = randomBytes(32).toString('hex');
  const runtime = new CopilotRuntime({
    agents: { coder: createHarnessAgent({ host, harness }) },
    intelligence,
    identifyUser: () => ({ id: 'local-developer', name: 'Local developer' }),
  });
  const listener = createCopilotNodeListener({
    runtime,
    basePath: '/api/copilotkit',
  });
  const server = createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401).end('Unauthorized');
      return;
    }
    listener(request, response);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Runtime did not bind a TCP port');
  return {
    runtimeUrl: `http://127.0.0.1:${address.port}/api/copilotkit`,
    wsUrl,
    token,
    root,
    close: async () => {
      await host.close();
      const closed = once(server, 'close');
      server.close();
      server.closeAllConnections();
      await closed;
      store.close();
    },
  };
}
