import { expect, test } from "vitest";
import { CODING_MODEL, createCodingAdapter } from "../src/model.js";

test("the default coding adapter uses GPT-6 Luna", () => {
  const adapter = createCodingAdapter("test-key");
  expect(CODING_MODEL).toBe("gpt-6-luna");
  expect(adapter.model).toBe(CODING_MODEL);
});
