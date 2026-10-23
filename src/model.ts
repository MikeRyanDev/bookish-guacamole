import { createOpenaiChat, openaiText } from "@tanstack/ai-openai";

export const CODING_MODEL = "gpt-6-luna";

/** Uses the same model for the harness and the browser's model display. */
export function createCodingAdapter(apiKey = process.env.OPENAI_API_KEY) {
  return apiKey ? createOpenaiChat(CODING_MODEL, apiKey) : openaiText(CODING_MODEL);
}
