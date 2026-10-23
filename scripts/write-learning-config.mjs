import { mkdir, writeFile } from "node:fs/promises";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("Set OPENAI_API_KEY in .env before creating Learning configuration.");
await mkdir(".data", { recursive: true, mode: 0o700 });
await writeFile(
  ".data/learning-model.json",
  JSON.stringify({ provider: "openai", model: "openai/gpt-6-luna", apiKey }, null, 2) + "\n",
  { mode: 0o600 },
);
console.log("Private Learning configuration written to .data/learning-model.json.");
