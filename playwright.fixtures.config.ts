import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** Deterministic UI coverage: no Intelligence stack, credentials, or model calls. */
export default defineConfig({
  ...base,
  grepInvert: /@connected/,
  testMatch: [
    "capabilities-design.spec.ts",
    "capabilities-settings.spec.ts",
    "composer-discovery.spec.ts",
    "composer.spec.ts",
    "conversation-capabilities.spec.ts",
    "design.spec.ts",
    "file-formats.spec.ts",
    "file-viewer.spec.ts",
    "html-tree.spec.ts",
    "lazy-panels.spec.ts",
    "learning-dialog.spec.ts",
    "learning-refinement.spec.ts",
    "learning.spec.ts",
    "models.spec.ts",
    "motion.spec.ts",
    "permissions.spec.ts",
    "settings-navigation.spec.ts",
    "settings-visual.spec.ts",
    "settings.spec.ts",
    "tool-approvals.spec.ts",
    "tool-disclosure.spec.ts",
    "tool-polish.spec.ts",
    "tool-renderers.spec.ts",
    "tool-stack.spec.ts",
    "typescript-output.spec.ts",
    "typescript-tool.spec.ts",
    "virtual-transcript.spec.ts",
  ],
});
