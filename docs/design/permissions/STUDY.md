# Permissions and planning

## User feedback and revision

The developer found the first interface too wordy. The requested revision removed Review changes, renamed Allow file edits to Require permissions, and separated Plan mode.
Saved permissions moved from the composer into Settings. Interrupts now offer Reject, Approve Once, and Always Approve.
Both approval actions use the accent fill. The scope confirmation remains explicit before saving a permission.

The original [two-concept study](concepts.png) records exploration, not the current interface. Its labels and four-mode selector are superseded.
The current screenshots and interactive prototype establish implementation truth.

## Behavior contract

| Control                          | Result                                                                                                         | Scope        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| Require permissions              | Ordinary edits run. Commands and sensitive paths ask unless a saved rule allows them.                          | Conversation |
| YOLO                             | The native permissions plugin allows calls, including its explicit denials. Separate tool restrictions remain. | Conversation |
| Plan mode                        | Permitted reads run. Edits and shell commands cannot run. The permission preference remains selected.          | Conversation |
| Reject                           | Refuses the current call.                                                                                      | Current call |
| Approve Once                     | Approves the current call.                                                                                     | Current call |
| Always Approve                   | Shows exact saved scope before Approve and Save.                                                               | Workspace    |
| Settings → Workspace permissions | Shows saved rules and Remove.                                                                                  | Workspace    |

Plan mode is a separate pressed-state control beside Create goal. It takes precedence over either permission preference.
Turning Plan mode off restores the selected permission preference. That preference survives restart and changes during planning.
Changes apply to the next turn. Active turns retain their original policy, and pending approvals remain open.
New conversations use Require permissions. Existing native default conversations retain their stricter policy until the user selects a preference.

Saved permissions apply across conversations and survive restart. YOLO does not add or delete rules.
The server derives scope from native tool resources. Some shell expressions cannot be remembered.
Removal waits for active turns and reloads native session plugins. It does not undo an approval already submitted.

## Component specification

The compact composer toolbar orders the controls Create goal, Plan, then Require permissions. Plan has the accessible name Plan mode.
Saving keeps the labels and layout unchanged. The Plan button exposes its busy state without visible status text.
The selector contains two choice labels. Short explanations appear on hover. It has no permanent timing or pending-approval note.
Saved rules appear after appearance in Settings. Reopening Settings refreshes the rules.

Interrupt buttons appear in this order: Reject, Approve Once, Always Approve.
Always Approve opens a scope preview with Approve and Save and Cancel. The preview replaces the original footer.
Cancel restores focus to Always Approve. Approval returns focus to the composer. Removal moves focus to Refresh permissions.
Errors preserve the pending choice. Duplicate clicks cannot submit twice.

## Prototype and visual evidence

Run `pnpm exec vite --config e2e/fixtures/vite.config.ts --port 4274`. Open `http://127.0.0.1:4274/permissions.html`.
The prototype imports production controls and uses fixed data. It never runs a model or shell.
Choose Command or Patch. Parameters `?theme=dark`, `?long`, `?fail`, and `?slow` exercise alternate states.

- [Light interrupt](interrupt-light.png) and [dark interrupt](interrupt-dark.png)
- [Light selector](modes-light.png), [dark selector](modes-dark.png), and [mobile selector](modes-mobile.png)
- [Light scope](scope-light.png) and [dark scope](scope-dark.png)
- [Light saved rules](rules-light.png) and [dark saved rules](rules-dark.png).

## Usability findings

A fresh independent agent received tasks and the fixture URL, without source or design rationale.
The reviewer predicted the permission selector, separate planning control, and Settings destination correctly before exploration.
The reviewer completed one-time approval, saved approval, cancellation, and removal. Desktop and 390px mobile controls had no overlap.
Keyboard activation worked. Escape returned focus to the correct trigger. No material discovery confusion remained.
The prototype cannot establish actual planning enforcement because its composer uses fixed data. Native tests establish that boundary separately.
This review is agent-based. The user's direct feedback supplied the human critique that drove this revision.

## Verification

See [verification](../../VERIFICATION.md#simpler-permissions-and-separate-planning) for current commands and results.

## Control copy audit

Removed permanent timing guidance from the permission popup and Plan tooltip. Choice explanations moved to hover text.
Removed the repeated workspace-scope sentence from Settings. The save confirmation now names scope once, beside the exact rules.
Shortened goal creation help to its automatic behavior and 20-turn limit. Errors and conditional partial-scope information remain.
Approval buttons retain their labels during submission. Busy state uses disabled controls and accessibility attributes.
Goal progress, explicit completion state, and recovery actions remain because they describe current work.
