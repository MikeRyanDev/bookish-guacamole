import { describe, expect, it } from "vitest";
import { shouldRunDesignHook } from "../scripts/impeccable-ui.mjs";

const root = "/repo/starter";
function edit(tool_input: unknown, cwd = root) {
  return { hook_event_name: "PostToolUse", cwd, tool_input };
}

describe("Impeccable hook scope", () => {
  it("checks UI edits and the HTML entry", () => {
    expect(shouldRunDesignHook(edit({ file_path: "web/src/styles.css" }), root)).toBe(true);
    expect(shouldRunDesignHook(edit({ path: "/repo/starter/web/index.html" }), root)).toBe(true);
    expect(shouldRunDesignHook(edit({ path: "styles.css" }, `${root}/web/src`), root)).toBe(true);
  });
  it("skips backend, sibling, private, and lookalike paths", () => {
    for (const path of [
      "src/server.ts",
      "../other/web/src/app.tsx",
      ".env",
      "web/index.html.bak",
      "web/src-other/app.tsx",
    ]) {
      expect(shouldRunDesignHook(edit({ path }), root)).toBe(false);
    }
  });
  it("recognizes mixed patches and moves into the UI", () => {
    expect(
      shouldRunDesignHook(
        edit({ input: "*** Update File: src/server.ts\n*** Add File: web/src/new.tsx" }),
        root,
      ),
    ).toBe(true);
    expect(
      shouldRunDesignHook(
        edit({ patch: "*** Update File: old.tsx\n*** Move to: web/src/new.tsx" }),
        root,
      ),
    ).toBe(true);
  });
  it("handles native string apply_patch payloads without scanning backend edits", () => {
    expect(
      shouldRunDesignHook(
        edit("*** Begin Patch\n*** Update File: src/server.ts\n*** End Patch"),
        root,
      ),
    ).toBe(false);
    expect(
      shouldRunDesignHook(
        edit("*** Begin Patch\n*** Delete File: web/src/old.tsx\n*** End Patch"),
        root,
      ),
    ).toBe(true);
  });
  it("forwards Stop and unknown payloads to the upstream detector", () => {
    expect(shouldRunDesignHook({ hook_event_name: "Stop" }, root)).toBe(true);
    expect(shouldRunDesignHook(null, root)).toBe(true);
    expect(shouldRunDesignHook(edit({}), root)).toBe(true);
  });
});
