# Goal mode

## Research and design

The pinned `@tanstack/ai-harness@0.1.0` already exports `goal`, `selectGoal`,
and `GoalMet` from `@tanstack/ai-harness/plugins`. Its source is
`src/first-party/goal.ts` in the installed package. This delivery reuses it.
The [upstream plugin source](https://github.com/TanStack/ai/blob/main/packages/ai-harness/src/first-party/goal.ts) documents the same lifecycle.
The [TanStack 1.0 announcement](https://tanstack.com/blog/tanstack-ai-1-0)
describes the experimental harness and its durable sessions.

The plugin stores one objective per session in the harness execution log.
It injects the objective into each turn, evaluates the last ten transcript
messages (up to 8,000 characters), and queues another turn if needed.
A structured model verdict supplies completion and a reason. This is model
assessment, not independent proof that tests or external actions succeeded.
The same configured coding model serves as judge. Judging uses extra model calls.

Native states are active, paused, met, and stopped. Approval, user input,
cancellation, provider failure, and judge failure pause work. Twenty rounds
stop a sequence; explicit Resume starts another sequence with a fresh count.
Stop cancels queued work; the integration must also cancel an active turn.
A new ordinary message pauses the native goal. Approval resolution does not
silently restart the Goal loop: the user resumes it explicitly.
The SDK requires resolving or rejecting a pending approval before another command.
Goal controls are disabled while that approval is pending; the loop is already paused.

## Integration contract

- CopilotKit remains the owner of messages, interrupts, replay, and outer runs.
- The native plugin remains the owner of the goal and continuation policy.
  SQLite stores this execution state; Intelligence stores streamed product evidence.
- Goal commands travel through the existing authenticated Intelligence run path.
  No browser timer or separate background model endpoint starts turns.
- A Goal run observes the whole native session until idle, including queued turns
  and plugin state updates. One outer start and terminal event delimit it.
  Private message snapshots remain excluded to avoid duplicate transcript rows.
- Cancellation stops the active turn and prevents queued Goal work from escaping
  the outer run. Every handle and subscription must be released.
- Resume and reload use persisted native state, never client-submitted goal state.
  Workspace runtime hosts and thread IDs retain their existing isolation.
- Commands validate objective length and reserved native command words. Starting
  over an unfinished objective must not silently discard it.

## Composer plan

Extend the existing Operate surface and its Manrope/mono, warm accent, and neutral
surface tokens. Add no new card, border, modal, or visual identity.

A named target icon switches the draft between Message and Goal. Goal mode uses
an objective placeholder and Start goal action. A short hint explains automatic
continuation and the round limit before starting. Keyboard submission remains
Command/Control+Enter. Ordinary messages retain their existing behavior.

Once a goal exists, a compact disclosure above the composer shows its objective,
status, and actual round count. Expanded details show the judge reason or pause
reason. Completion is labelled as the agent's assessment. Resume and Stop are
explicitly named actions. Stop run also halts Goal continuation. Pending approval
continues to use the existing approval surface and prevents another start/resume.
Long objectives wrap; controls remain reachable on narrow screens. Existing
focus, disabled, error, reduced-motion, and both-theme behavior applies.

## Required validation

Real harness tests must cover multiple automatically queued rounds, one outer
terminal event, native state visibility, judge completion, round limit, provider
and judge errors, cancellation, approval/resume, duplicate commands, persistence
across restart, and thread isolation. Browser checks cover composer mode,
submission, state controls, reload, keyboard interaction, long objectives,
mobile layout, and both themes. Run `pnpm check`, `pnpm design:check`,
`pnpm design:browser`, affected browser tests, and the example test.
Record live model/Intelligence proof separately from deterministic fixtures.

Work started on local main `3f995a5` and was integrated with local main `7891bf5`,
preserving its grouped tool activity. Remote alpha main `a248492` replaces the
current design and viewer with an older tree; it is not the local merge target.
No upstream package, shared deployment, or release-history rewrite is required.

[Validation record](GOALS-VERIFICATION.md).
