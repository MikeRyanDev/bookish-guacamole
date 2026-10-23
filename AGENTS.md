# Starter development

Read README.md, docs/PLAN.md, and docs/VERIFICATION.md before editing.

Use the published package versions in package.json and pnpm-lock.yaml. The TanStack harness is experimental. Inspect its installed source before changing the bridge.

Keep the required product path: TanStack coding harness, CLI-installed local CopilotKit Intelligence, and real Learning. Do not replace Intelligence with SQLite or a mock backend. SQLite stores only harness execution state.

Write regression tests before behavior changes. Run `pnpm check` and the sample's `node --test example/greet.test.js`. Keep `.env`, `.data`, `.copilotkit`, and workspace edits out of git.

Record real backend and model results separately from deterministic tests. Do not claim completion without a real coding run, persisted events, Learning output, and a later task that uses a published Skill.
