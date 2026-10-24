# Approval modes and workspace permissions

## Task and design decision

Developers choose how much work runs without approval. They can allow one call, save a specific permission, or remove it later.

The [concept sheet](concepts.png) contains two imagegen studies. Concept A uses an inline select. Concept B exposes descriptions in a compact list.
The implementation uses B's list and A's visible workspace-permissions action. This keeps the effects readable before selection.
The generated copy is not authoritative. The image has inaccurate descriptions and extra borders. The implementation uses the behavior table and existing design system.

The built-in imagegen tool produced the sheet. Prompt: create two compact developer-workspace concepts for the composer mode selector, inline command approval, and saved workspace permissions. A uses an inline select in light mode. B uses an expanded dropdown in charcoal dark mode. Include Review changes, Allow file edits, Plan only, and YOLO. Include Allow once, Remember this permission, Reject, Save and allow, Cancel, and Remove. Use Manrope-like labels, IBM Plex Mono-like commands, flat rows, warm accents, and no branding or decorative borders.

## Behavior contract

| Choice | Native value | Result |
| --- | --- | --- |
| Review changes | `default` | Native rules apply. Standard reads run. Edits and commands ask unless a rule allows them. |
| Allow file edits | `acceptEdits` | Ordinary edits run. Commands and sensitive paths still ask unless a rule allows them. |
| Plan only | `plan` | Permitted reads run. Edits, shell commands, and calls that require approval do not run. |
| YOLO | `bypass` | The permissions plugin allows all calls, including explicit denials. Separate tool restrictions remain. |

New harness conversations start in Allow file edits. Existing harness logs retain their current mode. Native session settings persist the mode.
A mode change applies to the next turn, including a later goal round. Active turns retain their original mode. Pending approvals do not resolve automatically.
YOLO does not add or delete saved rules. Leaving YOLO restores the selected mode's rules.

Saved permissions belong to the workspace. They apply across conversations and survive restart. Native rules still define what an approval can save.
The preview uses resources from the native tool plugins, including resolved file paths and separate command parts. It never grants permission.
Some shell expressions and wildcard resources cannot be remembered. The UI offers the save action only when a preview contains a saveable rule.
Removal deletes the native saved rule and reloads open session plugins. Reload waits for active turns. New turns wait until reload completes.
Removal does not cancel a running tool or revoke a decision already submitted for a pending call.

## Component specification

| Task | Visible entry | Action | Recovery |
| --- | --- | --- | --- |
| Change mode | Approval mode: current choice | Opens a non-modal radio group with all four descriptions | Escape or Close restores focus |
| Allow one call | Allow once beside the payload | Sends native `once` | Submission errors preserve the decision |
| Save permission | Remember this permission | Shows every saved tool/resource pair and workspace scope | Cancel returns to the original footer |
| Apply saved choice | Save and allow | Sends native `always` | Duplicate clicks cannot submit twice |
| Inspect rules | Workspace permissions | Opens exact saved rules | Close leaves rules unchanged |
| Remove a rule | Remove beside its scope | Deletes it and refreshes open plugins | Errors remain visible for retry |

The selector stays beside the composer. Its popover does not resize the transcript. Radio labels state the effect, not only the native name.
The save confirmation replaces the original decision footer. This prevents two competing primary actions.
The permission preview stays beside the command or patch. Flat spacing replaces enclosing cards. All controls retain visible keyboard focus.
The list supports empty, loading, error, and removal states. Mode controls show loading, submission errors, and the server-confirmed selection.

## Interactive prototype and scenarios

Run `pnpm exec vite --config e2e/fixtures/vite.config.ts --port 4274`. Open `http://127.0.0.1:4274/permissions.html`.
The prototype imports the production controls and uses fixed data. It never calls a model or shell.
Choose Command or Patch. Use `?theme=dark`, `?long`, `?fail`, or `?slow` for theme, overflow, failure, and duplicate-click scenarios.

Browser checks cover all four choices, saved scope, removal, submission failure, duplicate clicks, both themes, and 390px width.
Native harness tests cover mode effects, sensitive files, saved scope, restart, mode changes during active work, and pending decisions.
The real model check covers saved command reuse, YOLO, mode reload, removal, and durable Intelligence events.

## Usability findings

A fresh reviewer received only tasks and the isolated preview URL. The reviewer recorded predictions before exploration and read no implementation or design rationale.
The reviewer completed all four tasks at 1280px and 390px with pointer and keyboard controls.
The initial uncertainty was whether Remember immediately approved the command. The scope confirmation resolved it without explanation.
The reviewer understood conversation mode versus workspace permission scope. Escape restored focus. No horizontal overflow occurred.
Verdict: usability pass for the fixture tasks. This was an independent agent walkthrough, not a study with recruited human participants.
It does not establish backend correctness or broad user comprehension. Backend and visual evidence remain separate.

The visual pass identified competing primary actions in the save state. The final design replaces the original footer during confirmation.
A second task walkthrough checks cancellation, save, and removal after that change.

## Verification record

See [verification](../../VERIFICATION.md#approval-modes-and-saved-permissions) for exact commands and results.
The generated concepts are exploratory. The running component prototype and rendered screenshots establish implementation truth.
