import { expect, test } from "vitest";
import { conciseSkillMap } from "../scripts/sync-skills.mjs";

test("skill sync keeps the first guidance sentence without upstream comparisons and leaves local instructions intact", () => {
  const input = `<!-- intent-skills:start -->\n  - id: "@vendor/package#topic"\n    run: "pnpm exec intent load @vendor/package#topic"\n    for: "Build a chat. NOT Another SDK. Other details."\n<!-- intent-skills:end -->\nLocal instructions. Keep every sentence.\n`;
  expect(conciseSkillMap(input)).toBe(
    input.replace("Build a chat. NOT Another SDK. Other details.", "Build a chat."),
  );
});
