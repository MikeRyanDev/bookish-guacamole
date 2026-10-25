import { describe, expect, it } from "vitest";
import { learningDescription } from "../src/client/learning-description.js";

describe("Learning description presentation", () => {
  it("removes repeated generator prefixes without changing the source", () => {
    const source =
      "Use when When editing a greeting. Do not use for Do not use for unrelated code.";
    expect(learningDescription(source)).toBe(
      "Use when editing a greeting. Do not use for unrelated code.",
    );
    expect(source).toContain("Use when When");
    expect(learningDescription("Use when Use when testing.")).toBe("Use when testing.");
  });
  it("preserves ordinary wording, capitalization, and quoted instructions", () => {
    for (const source of [
      "Use when a test fails. Do not use for unrelated code.",
      "Describe the phrase ‘Use when When’ in documentation.",
      "When a test fails, inspect it.",
      "Use when WhenToRun is configured.",
    ]) {
      expect(learningDescription(source)).toBe(source);
    }
  });
});
