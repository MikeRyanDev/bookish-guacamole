# Execution, connections, and conversation recovery

## Direction

Keep the existing settings dialog and category rail. Add Execution and Connections. Keep Usage and Undo beside the conversation.
The user approved this grouping and excluded tracing. This delivery adds no Diagnostics category or OpenTelemetry feature.

The [concept study](concept.png) explores controls and states before UI implementation. The built-in imagegen tool used the current settings screenshot as its reference.
The study is not an approved pixel specification. Its per-response limit captions are incorrect: limits cover the conversation.
Its Usage placement is also incorrect. Usage stays beside the conversation. The implementation removes its unnecessary dividers and repeated headings.

## Interaction contract

| User task                     | Entry and control                                   | Result                                                                            | Recovery                                                               |
| ----------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Manage long conversations     | Settings → Execution → Summarize long conversations | Summarize model context; retain the full transcript                               | Disable automatic summaries or retry a failed summary from Usage       |
| Bound persistent work         | Execution → Conversation limits                     | Stop further model calls after the conversation reaches a limit                   | Raise or clear the limit, then send another message or resume the Goal |
| Set model capacity and prices | Execution → Model limits and prices                 | Save separate values for each configured model                                    | Cancel changes; unknown prices remain unknown                          |
| Retry temporary failures      | Execution → Temporary failure retries               | Apply a bounded retry policy                                                      | Stop cancels a pending retry                                           |
| Batch read tools              | Execution → Enable code mode                        | Offer an isolated TypeScript tool on the next turn                                | Disable it; writes retain direct approval controls                     |
| Extend the tool catalog       | Settings → Connections → Add connection             | Save a disabled HTTP or stdio connection                                          | Cancel the draft; retry a failed save                                  |
| Try MCP locally               | Connections → Try local guide                       | Connect the bundled read-only guide                                               | Disconnect or remove the connection                                    |
| Activate a saved connection   | Connection → Connect                                | Start the connection and discover its tools                                       | Disconnect; retry after a connection failure                           |
| Sign in                       | OAuth connection → Sign in → Open sign-in           | Open the provider page; tokens stay on the server                                 | Cancel sign-in or sign out; restart requires sign-in again             |
| Inspect consumption           | Conversation → Usage                                | Show reported tokens, context consumption, and known or unknown cost              | Retry the read; open Execution settings                                |
| Recover a turn                | Conversation → Undo last turn                       | Review affected files, then restore files and remove the last prompt and response | Cancel; later edits block restoration; Redo restores the undone turn   |

## State requirements

Reads show local loading placeholders and explicit retry actions. A failed save retains the draft and the last confirmed server values.
Execution uses Save changes and Cancel changes. Category changes retain drafts. Closing Settings discards unsaved drafts; submitted saves continue.
Connection changes report pending application while active turns finish. OAuth shows a named sign-in link and a cancellation action.
History changes require a fresh revision and file-conflict check. Running work and pending approvals disable history changes.
Goal continuations currently have no matching outer user message, so history preview explains that they cannot use this Undo action.

## Verification

The independent task-first usability review passed; the fresh visual reviewer returned **ship** for 36 captured component surfaces.
A follow-up verified retained price drafts and focus after saving. See [verification](../../CAPABILITIES-VERIFICATION.md) for commands, live evidence, and scope limits.
The generated concept itself does not prove working behavior, accessibility, or contrast.
