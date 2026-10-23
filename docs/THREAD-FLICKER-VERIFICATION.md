# Thread selection flicker: cause and proof

The earlier navigation fix preserved DOM nodes and removed a 38px list shift. It did not catch changes to disabled styles. The remaining flash came from the workspace-wide busy flag, not sidebar remounts.

## Trace

Selecting a thread mounts its conversation and calls `connectAgent` to restore saved events. The SDK sets `agent.isRunning` while replaying. The app forwarded that flag to `Shell`, which disabled every other session link. CSS gives disabled rows 0.48 opacity. Replay then ended, clearing the flag and restoring full opacity. It also triggered file and Skill invalidations on mount and replay completion.

A browser trace sampled 121 animation frames and recorded DOM mutations and API requests for one selection. [Trace measurements](proof/thread-navigation-trace.json):

| Measurement                   | Before | After |
| ----------------------------- | -----: | ----: |
| Maximum disabled session rows |     19 |     0 |
| Minimum row opacity           |   0.48 |     1 |
| Sidebar replacements          |      0 |     0 |
| Unrelated file/Skill requests |      6 |     0 |

Thread selection still updates React components that consume the selected thread. No claim is made that rendering stops entirely. The fix removes the incorrect global busy transitions and resulting visual changes.

## Fix and regression

The conversation starts in restoring state for saved threads. Workspace busy state now means execution outside restoration. Query invalidation runs only on an actual execution-to-idle transition. The restore effect also observes the running flag so returning rapidly to a still-restoring agent waits for it to become available instead of remaining stuck.

The regression test first failed with 63 disabled-to-enabled session-row transitions across navigation. It now passes with zero transitions and zero unrelated requests. It preserves DOM identity and position, uses real SDK-created empty sessions, delays replay, switches away while restoration is pending, and returns through browser Back.

Commands:

```sh
pnpm test:e2e e2e/thread-navigation.spec.ts
pnpm check
pnpm test:e2e
LIVE_MODEL=1 pnpm test:e2e e2e/live-controls.spec.ts e2e/live-patch.spec.ts
```

The focused regression passed. Full checks passed lint, TypeScript, 83 unit tests, and browser/server builds. The browser suite passed 17 tests, with six opt-in model tests skipped. The 49 unit-test skips remain the declared unsupported persistence-store cases. The build retains its existing large-chunk warning.

## Smooth fast transitions

Connecting/restoring feedback now appears only if still pending after 250ms. This does not delay the request or the transcript. The timer is cancelled when restoration finishes or the component unmounts. The composer no longer flashes a second restoring label.

Two timer-controlled tests prove that fast operations show no progress text, slow operations show it at 250ms, and unmount cancels the timer. A [browser recording of five thread switches](proof/thread-switching.webm), including Back, captured zero connecting/restoring labels while real saved transcripts loaded. The delayed-replay browser test separately proves feedback remains available on a slow connection.

Live regression checks passed all three cases: rejected write, cancellation, and Patch approval/reload. The cancellation check now asserts real execution disables workspace/session navigation and stopping re-enables it. The full browser rerun passed 17 tests with six opt-in cases skipped. `pnpm format:check`, `node --test example/greet.test.js`, local Markdown link checks, and `git diff --check` also passed.
