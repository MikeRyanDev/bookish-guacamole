import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const schema = z
  .object({
    provider: z.string().trim().min(1).optional(),
    model: z.string().regex(/^[^/\s]+\/\S+$/),
    apiKeyEnv: z
      .string()
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
      .optional(),
    baseUrl: z
      .url()
      .refine((value) => {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
      })
      .optional(),
    api: z.enum(["openai-completions", "openai-responses"]).optional(),
    contextWindow: z.number().int().positive().optional(),
    maxTokens: z.number().int().positive().optional(),
    reasoning: z.boolean().optional(),
  })
  .strict();
let input;
try {
  input = JSON.parse(await readFile(process.env.LEARNING_MODELS_FILE ?? "learning.json", "utf8"));
} catch {
  throw new Error("Create learning.json. See docs/MODELS.md.");
}
const parsed = schema.safeParse(input);
if (!parsed.success) throw new Error("Invalid Learning configuration. See docs/MODELS.md.");
const { apiKeyEnv, ...model } = parsed.data;
const apiKey = apiKeyEnv ? process.env[apiKeyEnv] : undefined;
if (apiKeyEnv && !apiKey)
  throw new Error(`Set ${apiKeyEnv} before creating Learning configuration.`);
await mkdir(".data", { recursive: true, mode: 0o700 });
const temporary = `.data/learning-model-${randomUUID()}.json`;
await writeFile(
  temporary,
  JSON.stringify({ ...model, ...(apiKey ? { apiKey } : {}) }, null, 2) + "\n",
  { mode: 0o600, flag: "wx" },
);
await rename(temporary, ".data/learning-model.json");
console.log(
  "Private Learning configuration written to .data/learning-model.json. The CLI validates provider support during setup.",
);
