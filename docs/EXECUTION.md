# Execution and connections

Open **Settings → Execution** to configure context summaries, conversation limits, retries, and code mode.
These settings belong to the selected workspace. **Save changes** applies the draft; **Cancel changes** restores saved values.
Category changes retain drafts. Closing Settings discards unsaved drafts. A failed save retains the draft for retry.
A stale save returns a conflict instead of overwriting another window's changes.

## Context and usage

Automatic summaries start at 75% of the configured model context window. Each model initially uses a conservative 32,768-token window.
Set the actual capacity under **Model limits and prices**, especially when switching between models with different capacities.
Summaries use the selected coding model. They preserve objectives, constraints, paths, decisions, and verification evidence.
The harness persists the compact model view separately from the full conversation. Intelligence retains the complete product transcript.
A restart retains both views when `.data/` is preserved.

**Usage** beside the conversation shows reported token totals, the last reported context size, and cost.
**Summarize next message** schedules compaction. Short histories can require no summary; scheduling alone does not guarantee a smaller context.
The native overflow safeguard can still compact above the configured context window when automatic summaries are disabled.
A failed summary reports its state and can be retried on the next message.
Summary and Goal judge calls count toward consumption and limits.

Limits apply to the whole conversation, including persistent Goal work. Empty fields mean no limit.
A limit stops the next model call after the reported total reaches it. A call already in progress can exceed the limit.
These are application stop thresholds, not provider billing caps. Provider SDK retries can occur within an admitted call.
Missing usage stops further calls when any limit is set. Older conversations with incomplete accounting need a new conversation to enforce limits.
Undo does not refund tokens or reset spending.

Cost uses the provider's reported cost when available. Otherwise, it uses configured input, output, cache-read, and cache-write rates in USD per million tokens.
Unpriced calls remain unknown. Setting prices later does not retroactively price earlier calls.
Cost limits require configured prices before new calls. If earlier costs are unknown, use a new conversation or remove the cost limit.
A displayed zero cost is only valid when all calls have known costs.

## Recovery

Temporary provider failures use the native bounded retry policy. The default is three retries; zero disables it.
The conversation shows pending retries. **Stop run** cancels retry backoff. Tool permissions remain part of the native harness flow.

**Undo last turn** opens a preview of affected files and explains the transcript change.
**Undo turn** restores those files and removes the last prompt and response. **Redo turn** restores the undone turn.
This is one level of recovery. A new model turn clears Redo.
Native shadow Git repositories live under `.data/snapshots/`; they do not change project Git history.

Later edits to affected files block restoration. Active work, pending approvals, stale previews, and unmatched message/snapshot boundaries also block it.
Goal continuations do not have a matching outer user message, so this UI does not undo them.
Avoid concurrent edits to the same files during restoration: the native file restore is not a filesystem transaction.
Retain `.data/` to preserve snapshots and execution state.

## MCP connections

Open **Settings → Connections**. **Try local guide** starts the bundled read-only documentation tool without an account.
Its source is `scripts/mcp-guide.mjs`. It reads no workspace files and makes no external network requests.
Disconnect keeps the saved configuration; Remove requires confirmation.

For another server:

1. Select **Add connection**, enter a unique name, and choose HTTP or stdio.
2. Enter its URL or executable and arguments. Each stdio argument occupies one line.
3. Save the disabled connection, then select **Connect**.
4. For OAuth, select **Sign in**, then **Open sign-in**. **Cancel sign-in** closes the pending attempt.

External MCP tools require explicit approval. Only the bundled guide is trusted as read-only without approval.
A stdio executable runs on your local machine when connected. Use a trusted command.
HTTP URLs cannot contain credentials, query parameters, or fragments.
For bearer authentication, enter a server environment variable name, not its secret value.
Stdio mappings use `CHILD_VARIABLE=SERVER_VARIABLE`; values are resolved server-side.
Missing variables produce a connection error without disabling the coding agent.

OAuth uses the native loopback/PKCE flow. Tokens remain in private server memory, never in settings responses or browser storage.
Restarting requires sign-in again. Changing a connection destination clears its old credentials.
Connection changes wait for active native operations before reloading tools. Status distinguishes saved configuration from applied connections.

## Optional code mode

**Enable code mode** offers an isolated TypeScript program tool on the next turn. It defaults to off.
The QuickJS isolate has a 64 MiB memory limit and a 30-second timeout.
Programs can compose `read_file`, `list_files`, `grep`, and explicitly safe MCP tools.
Host globals and direct write/shell bindings are absent. Writes remain separate tools with their existing approval behavior.
The tool renderer shows the exact program, a copy action, output, and errors.

The deterministic dependent-read benchmark reads a manifest, then the referenced file with real tools and the real isolate.
Direct tools require three scripted model calls, including the final answer. A program requires two.
Independent reads can already run in one direct-tool batch, so this does not establish a general latency or cost improvement.
Run `pnpm exec vitest run tests/code-mode.test.ts` to repeat the comparison.

Tracing and a Diagnostics category are intentionally excluded from this delivery.
