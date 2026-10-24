---
name: starter-verification
description: Verify starter changes, reproduce setup failures, and prepare a reviewable delivery.
---

Read `docs/VERIFICATION.md` for historical evidence and `docs/ARCHITECTURE.md` for current ownership. Historical test results do not prove the current branch.

Write regression tests for observable changes before the fix. Run `pnpm check` and `node --test example/greet.test.js`. Run `pnpm test:e2e` against the local app for browser changes. `LIVE_MODEL=1 pnpm test:e2e e2e/live-model.spec.ts` spends model credits and requires a published Skill in the configured container; use it only within authorized model work.

Inspect real light/dark and mobile screenshots, keyboard focus, permission UI, cancellation, reload, error states, and Inspector visibility. Record exact commands and distinguish deterministic tests, fixture tests, and real backend/model proof. Do not claim Learning from configuration alone.

Keep .env, .data, .copilotkit, workspace edits, raw model logs, and browser traces out of Git. Check `git diff --check` and the staged file list. Never enable an image override by default; follow the temporary-image runbook and verify restoration before delivery.

For changed UI workflows, require the separate usability result from [interaction review](../starter-react/references/interaction-review.md). Record discovery and predicted-versus-actual behavior separately from visual review and technical checks. A visual ship verdict, axe result, or passing test suite cannot close a usability finding.
