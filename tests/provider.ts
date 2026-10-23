import { randomUUID } from 'node:crypto';
import { type AnyTextAdapter, EventType, type StreamChunk } from '@tanstack/ai';

/** A scripted provider used with the real TanStack engine. */
export function scriptedAdapter(
  reply: AnyTextAdapter['chatStream'],
): AnyTextAdapter {
  const adapter: AnyTextAdapter = {
    kind: 'text',
    name: 'test',
    model: 'test',
    '~types': {
      providerOptions: {},
      inputModalities: ['text'],
      messageMetadataByModality: {
        text: undefined,
        image: undefined,
        audio: undefined,
        video: undefined,
        document: undefined,
      },
      toolCapabilities: [],
      toolCallMetadata: undefined,
      systemPromptMetadata: undefined as never,
    },
    chatStream: reply,
    structuredOutput: async () => ({ data: {}, rawText: '{}' }),
  };
  return adapter;
}

/** Makes a complete model response with IDs different from the caller's IDs. */
export async function* answer(): AsyncIterable<StreamChunk> {
  const messageId = randomUUID();
  yield {
    type: EventType.RUN_STARTED,
    threadId: 'provider-thread',
    runId: 'provider-run',
    timestamp: Date.now(),
  };
  yield {
    type: EventType.TEXT_MESSAGE_START,
    messageId,
    role: 'assistant',
    timestamp: Date.now(),
  };
  yield {
    type: EventType.TEXT_MESSAGE_CONTENT,
    messageId,
    delta: 'Ready to code.',
    timestamp: Date.now(),
  };
  yield { type: EventType.TEXT_MESSAGE_END, messageId, timestamp: Date.now() };
  yield {
    type: EventType.RUN_FINISHED,
    threadId: 'provider-thread',
    runId: 'provider-run',
    timestamp: Date.now(),
  };
}
