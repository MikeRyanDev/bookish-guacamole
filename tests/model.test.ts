import { expect, test } from "vitest";
import { createModelCatalog, parseModelConfig } from "../src/server/agent/models.js";

const config = {
  defaultModel: "local",
  models: [
    {
      id: "local",
      label: "Local coder",
      provider: "ollama",
      model: "my-model",
      baseURL: "http://localhost:11434",
    },
    {
      id: "remote",
      label: "Remote coder",
      provider: "openai-compatible",
      model: "my-other-model",
      baseURL: "https://example.com/v1",
      apiKeyEnv: "MY_PROVIDER_KEY",
    },
  ],
};

test("accepts developer-selected models without a default provider or recommended model", () => {
  const catalog = createModelCatalog(config, { MY_PROVIDER_KEY: "private-test-key" });
  expect(catalog.defaultModel).toBe("local");
  expect(catalog.adapters.local?.model).toBe("my-model");
  expect(catalog.adapters.remote?.model).toBe("my-other-model");
  expect(JSON.stringify(catalog.publicModels)).not.toMatch(/private-test-key|baseURL|apiKeyEnv/);
});

test("rejects empty catalogs, duplicate IDs, unknown defaults, and inline keys", () => {
  expect(() => parseModelConfig({ models: [] })).toThrow();
  expect(() => parseModelConfig({ ...config, defaultModel: "absent" })).toThrow();
  expect(() =>
    parseModelConfig({ ...config, models: [config.models[0], config.models[0]] }),
  ).toThrow();
  expect(() =>
    parseModelConfig({ ...config, models: [{ ...config.models[0], apiKey: "secret" }] }),
  ).toThrow();
});

test("missing credentials identify the environment variable without revealing values", () => {
  expect(() => createModelCatalog(config, {})).toThrow(/MY_PROVIDER_KEY/);
});

test("compatible endpoints require an explicit protocol and URL", () => {
  expect(() =>
    parseModelConfig({
      ...config,
      models: [{ ...config.models[1], baseURL: "file:///tmp/model" }],
    }),
  ).toThrow();
  expect(() =>
    parseModelConfig({ ...config, models: [{ ...config.models[1], baseURL: undefined }] }),
  ).toThrow();
});

test.each(["openai", "anthropic", "gemini", "ollama", "openai-compatible"])(
  "constructs a developer-selected %s adapter without model catalog casts",
  (provider) => {
    const catalog = createModelCatalog(
      {
        defaultModel: "mine",
        models: [
          {
            id: "mine",
            label: "Mine",
            provider,
            model: "custom-model-id",
            apiKeyEnv: "CHOSEN_KEY",
            ...(provider === "openai-compatible" ? { baseURL: "https://example.com/v1" } : {}),
          },
        ],
      },
      { CHOSEN_KEY: "private-test-key" },
    );
    expect(catalog.adapters.mine?.model).toBe("custom-model-id");
  },
);
