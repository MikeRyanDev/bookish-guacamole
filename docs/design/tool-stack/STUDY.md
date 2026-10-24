# Tool activity design study

Reviewed 2026-10-23. Scope: tool rendering within the existing workspace.

## Current app

The live browser conversation contained six file/list calls across two assistant messages. Its screenshot showed large gaps both within a batch and before the next response. The synthetic baseline expands coverage to eight calls: list, read, search, Skill loading, command, patch, and unknown tool. Baseline captures use the current production ToolCall and VirtualTranscript components; they are layout evidence, not model evidence.

The spacing has three sources: each tool adds 16px vertical margins, each assistant message adds 22px bottom margin, and a message-label wrapper remains even without text. A completed patch also opens its full preview by default. Shrinking tool margins alone cannot remove message-boundary gaps or collapse a long sequence.

## Desktop comparison

| Product        | Evidence                                                                                                                                                                  | Pattern                                                                                                                                                                          | Implication                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Codex desktop  | [macOS activity summary report](https://github.com/openai/codex/issues/23868), May 21; [coding-view report](https://github.com/openai/codex/issues/19891), version 26.422 | Activity is aggregated into expandable counts for exploration, edits, and commands. The reports describe repeated clicks to inspect details and lost visibility of edited paths. | Adopt aggregation but retain useful categories, explicit drill-down, and visible exceptional outcomes.            |
| Claude desktop | [official desktop documentation, Switch view modes](https://code.claude.com/docs/en/desktop#switch-view-modes)                                                            | Normal keeps full text responses and summarizes tool calls. Thinking adds reasoning; Verbose exposes every intermediate operation.                                               | Separate narrative from activity. Keep detailed evidence available without making the default transcript verbose. |

Evidence limits: Codex native inspection was rejected by the computer-use tool; Claude was not installed. Codex behavior above is first-hand user reporting in its official repository, not an independently exercised current build. Claude's view modes are documented behavior, not a live interaction test. Exact competitor dimensions, animation timing, and expansion persistence are not asserted. These sources justify the interaction model, not pixel imitation.

## Selected design

The user confirmed: group completed activity. Keep the existing neutral surfaces, type, accent choices, and borderless workspace. Consecutive successful calls share one compact disclosure even when the SDK puts them in separate assistant messages. Narrative and user messages break groups. Pending approvals remain in their dedicated decision surface. Failed, denied, running, and missing-result calls remain directly visible, with honest status.

A group summary exposes the count and types of work. Expansion reveals a tight ordered stack; each call can reveal its exact arguments, output, command, or diff. Completed patches start collapsed. Command previews remain legible in collapsed call rows. Explicit disclosure choices survive virtual row remounts for the current conversation. No durations or success claims are invented.

## Validation targets

Capture light/dark and narrow layouts; verify keyboard disclosure, copying, long paths, escaped output, partial JSON, failure/denial, pending approval, live-to-complete updates, message boundaries, virtualization, and scroll anchoring. Run repository checks, rendered design checks, and affected browser tests. Record results separately from historical model evidence.

## Visual study and evidence

[Generated state study](concept-study.png) compares collapsed activity, expanded evidence, and exception/approval treatment in both themes. It was generated after the first implementation pass as a final state study; it was not an approved pre-build comp. The implementation follows the user-selected interaction and existing visual system. The study's invented source lines and OK labels are illustrative; production retains exact payloads and observed outcomes. The exact prompt is saved alongside the image and embedded in its metadata.

[Before light](before-light.png) · [Before dark](before-dark.png) · [After collapsed](after-light-1440-collapsed.png) · [After expanded](after-dark-1440-expanded.png) · [Mobile detail](after-light-390-detail.png). Baseline and after use the same eight tool samples. Baseline used the old per-message structure; the final fixture exercises production TranscriptMessages.

The compact group header is 34px at desktop, and expanded call headers are adjacent 34px rows. There is 8px separation after the activity block. Copy controls sit beside narrative rather than adding another line. Mobile summaries wrap their category breakdown. Source payloads can scroll horizontally without making the page overflow.
