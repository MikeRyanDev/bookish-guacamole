import { readFileSync } from "node:fs";
import { createModel, extendAdapter, type AnyTextAdapter } from "@tanstack/ai";
import { createOpenaiChat } from "@tanstack/ai-openai";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { createGeminiChat } from "@tanstack/ai-gemini";
import { createOllamaChat } from "@tanstack/ai-ollama";
import { z } from "zod";

const endpoint = z.url().refine((value) => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
}, "Use an HTTP(S) endpoint without embedded credentials.");
const entry = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/),
    label: z.string().trim().min(1).max(100),
    provider: z.enum(["openai", "anthropic", "gemini", "ollama", "openai-compatible"]),
    model: z.string().trim().min(1).max(200),
    apiKeyEnv: z
      .string()
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
      .optional(),
    baseURL: endpoint.optional(),
    api: z.enum(["chat-completions", "responses"]).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.provider === "openai-compatible" && !value.baseURL)
      ctx.addIssue({ code: "custom", message: "Compatible providers require baseURL." });
    if (value.provider !== "openai-compatible" && value.api)
      ctx.addIssue({ code: "custom", message: "api is only used by compatible providers." });
    if (value.provider !== "ollama" && !value.apiKeyEnv)
      ctx.addIssue({
        code: "custom",
        message: "Set apiKeyEnv to your key's environment variable.",
      });
  });
const schema = z
  .object({
    defaultModel: z.string().min(1),
    models: z.array(entry).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = value.models.map((model) => model.id);
    if (new Set(ids).size !== ids.length || !ids.includes(value.defaultModel))
      ctx.addIssue({ code: "custom", message: "Use unique IDs and a configured defaultModel." });
  });
export type ModelConfig = z.infer<typeof schema>;
export interface ModelCatalog {
  defaultModel: string;
  adapters: Record<string, AnyTextAdapter>;
  publicModels: Array<{ id: string; label: string; provider: string; model: string }>;
}

/** Validates private configuration without including input values in errors. */
export function parseModelConfig(input: unknown): ModelConfig {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new Error("Invalid model configuration. See docs/MODELS.md for required fields.");
  return result.data;
}

/** Builds server-only adapters; the public projection excludes keys and endpoints. */
export function createModelCatalog(
  input: unknown,
  env: NodeJS.ProcessEnv = process.env,
): ModelCatalog {
  const config = parseModelConfig(input);
  const adapters: Record<string, AnyTextAdapter> = Object.create(null);
  for (const model of config.models) {
    const key = model.apiKeyEnv ? env[model.apiKeyEnv] : undefined;
    if (model.apiKeyEnv && !key) throw new Error(`Set ${model.apiKeyEnv} before starting the app.`);
    const custom = [createModel(model.model, ["text"])];
    const transport = model.baseURL ? { baseURL: model.baseURL } : {};
    switch (model.provider) {
      case "openai":
        adapters[model.id] = extendAdapter(createOpenaiChat, custom)(model.model, key!, transport);
        break;
      case "anthropic":
        adapters[model.id] = extendAdapter(createAnthropicChat, custom)(
          model.model,
          key!,
          transport,
        );
        break;
      case "gemini":
        adapters[model.id] = extendAdapter(createGeminiChat, custom)(model.model, key!, transport);
        break;
      case "ollama":
        adapters[model.id] = createOllamaChat(model.model, {
          host: model.baseURL,
          ...(key ? { headers: { Authorization: `Bearer ${key}` } } : {}),
        });
        break;
      case "openai-compatible":
        adapters[model.id] = openaiCompatibleText(model.model, {
          baseURL: model.baseURL!,
          apiKey: key!,
          api: model.api,
        });
        break;
    }
  }
  return {
    defaultModel: config.defaultModel,
    adapters,
    publicModels: config.models.map(({ id, label, provider, model }) => ({
      id,
      label,
      provider,
      model,
    })),
  };
}

/** Loads once at startup. Restart after editing the catalog or server credentials. */
export function loadModelCatalog(): ModelCatalog {
  const file = process.env.CODING_MODELS_FILE ?? "models.json";
  let input: unknown;
  try {
    input = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error("Create models.json or set CODING_MODELS_FILE. See docs/MODELS.md.");
  }
  return createModelCatalog(input);
}
