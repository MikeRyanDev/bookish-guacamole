---
name: starter-runtime
description: Change or debug the TanStack harness, Intelligence bridge, permission resume, or learned Skill injection.
---

Read `docs/ARCHITECTURE.md` and the installed harness source before changes. Intelligence owns durable outer runs and conversations. SQLite owns only private harness execution state. Never replace the backend with a local transcript database.

Preserve outer run/thread IDs and emit one outer start and terminal event. Harness pause snapshots have private IDs and must not replace the Intelligence transcript. Keep all tool arguments/results and explicit control cancellation. Cover public AG-UI runner behavior and close/reopen approval tests before changing the bridge.

Acquire the SDK SkillRegistry snapshot before each turn. Inject formatSkillCatalog automatically and bind load/read tools to that same snapshot. A failed refresh must not reuse a stale catalog or claim a Skill was applied. Do not turn retrieved Skill text into permission to bypass workspace controls.

Use `pnpm test tests/bridge.test.ts tests/coding.test.ts tests/skills.test.ts`. Real proof must include a model tool call, approval or denial, persisted backend events, reload, and Learning output. Keep keys and raw private evidence in ignored paths.
