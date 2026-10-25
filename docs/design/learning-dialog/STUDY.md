# Workspace Learning dialog

The user found Learning in the right inspector confusing because it appeared to belong to the active conversation.
The replacement opens a native modal from **Learning**, beside the workspace name.
The dialog title names the workspace. Existing conversations retain their Learning assignments.

## Interaction contract

| Task                        | Control                            | Outcome                                                 | Recovery                                                   |
| --------------------------- | ---------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Open Learning               | Learning beside the workspace name | Workspace dialog with saved assignment and Skill lists  | Close Learning or Escape returns focus                     |
| Change assignment           | Change space, selector, Save       | Server-confirmed space for new conversations            | Cancel discards the draft; failed saves preserve it        |
| Start Learning              | Learn                              | Process saved conversations across the shared space     | Run status and local Retry or Refresh status               |
| Review a proposal           | Skill row                          | Wide Markdown reader with persistent decisions          | Back to skills restores list focus                         |
| Inspect evidence            | Supporting evidence                | Insight and source messages                             | Local loading, error, Retry, and unavailable-source states |
| Decide                      | Approve skill / Reject skill       | Publish or reject, with explicit destination and result | Uncertain responses disable decisions until state refresh  |
| Read published instructions | Published skills, Skill row        | Same large reader, without review decisions             | Back to skills                                             |

Assignment edits hide Learn and review actions until Save or Cancel.
This prevents an unsaved selection from suggesting the wrong action scope.
Desktop keeps the list beside the reader. Mobile gives the reader the full dialog width.
The document scrolls independently from its heading, content controls, and decision footer.
Markdown tables, code, and inspectable frontmatter retain the complete instruction content.

## Design study and evidence

The [ImageGen study](states.png) explored the requested modal and document states before implementation.
It is an illustrative component study, not an approved pixel contract.
The implementation keeps the broad reader and persistent decisions, with the incumbent flat controls and neutral surfaces.
Generated outlines, stripes, and inconsistent sample counts did not carry into the application.
The image contains its exact prompt. The [sidecar](states.png.json) records provenance.

Current synthetic browser captures:

| State          | Captures                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Long Markdown  | [Light desktop](dialog-light-1440.png), [dark desktop](dialog-dark-1440.png), [light mobile](dialog-light-390.png), [dark mobile](dialog-dark-390.png) |
| Initial read   | [Loading](dialog-loading.png), [failed settings read](dialog-error-settings.png)                                                                       |
| Pending review | [Desktop](dialog-review-pending-1440.png), [mobile](dialog-review-pending-390.png)                                                                     |

These captures use simulated service data. They do not prove model behavior or backend persistence.
Their embedded provenance identifies the fixture and state.
Private application captures remain ignored under `.impeccable/review/`.

## Separate review results

[Usability](USABILITY.md): passed the verified fixture tasks after correcting draft-space ambiguity and initial focus.
The reviewer also checked the actual application entry and dialog without backend writes.

[Visual review](VISUAL-REVIEW.md): the original review found misleading empty guidance and moving pending decisions.
The verdict pass marked both fixes resolved and returned `ship` at that scoped review level.

Technical verification is recorded in [VERIFICATION.md](../../VERIFICATION.md#workspace-learning-dialog--2026-10-24).
The modal, scope, empty guidance, and pending geometry regressions failed before their corresponding fixes.
No SDK, backend, dependency pin, or deployment changed for this UI delivery.
