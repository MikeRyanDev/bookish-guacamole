# Task-first Learning usability review

Date: 2026-10-24. Verdict after correction and recheck: **usability: pass** for the verified tasks below.

## Task and method

Manage Learning for a workspace; learn from saved conversations; read long Markdown Skills and supporting evidence; approve or reject proposals; return to the conversation.

Reviewed the running isolated fixture at `http://127.0.0.1:4196/learning.html?long=1` through Chrome browser interactions. Desktop used the default 1512 × 797 viewport. Mobile used 390 × 844. Inspected both light and dark themes. The temporary mobile viewport was reset. All Learning operations were simulated; this is not backend or model evidence.

Read the usability-reviewer instructions first. Did not read the design contract, implementation, or prior reports before the first-use walkthrough. The supplied task mentioned the prior thread-placement confusion; that is the only rationale supplied before discovery. Read only the fixture source after completing the first-use path to discover fault-injection query parameters.

## Initial predictions, recorded before outcomes

The visible Learning button beside Workspace is the natural starting point. It appears workspace-scoped. Files appears to be a file browser and does not compete as a Learning entry point.

After opening Learning, the workspace name in its title confirms scope. I expect selecting a Learning space to create a draft, Save to persist it, and Cancel to discard it. The copy says existing conversations retain their assignments. Learn should use saved conversations in the selected space. Review skills should list proposals, Published skills should list usable Skills. A proposal should open its instructions; Supporting evidence should show the conversations that justify it. Approve should publish to the stated space; Reject should leave it unpublished. Back to skills should return to the list; Close should return to the conversation.

## Observed task completion

The first desktop walkthrough completed without implementation explanation: Learning → Coding lessons → Save → Learn → Learning queued → Refresh status → Learning finished / 1 proposed Skill → Test before editing → Supporting evidence → Approve skill → “Approved. Published to Coding lessons.” → Close Learning → conversation shell.

The mobile dark walkthrough opened the long proposal, read evidence, recovered from an evidence error with Retry, rejected it, saw “Rejected. This proposal was not published,” and used Back to skills. Escape returned to the Learning trigger. The mobile light walkthrough recovered an uncertain approval result, approved the proposal, found it under Published skills, and opened the published reader.

## Findings corrected during review

1. **The space draft can misrepresent the target of active Learning actions.** With Coding lessons saved, Change space → Writing lessons leaves Learn and proposal navigation active. Writing lessons is now the only visible space name, while those actions still belong to the saved Coding lessons scope. The same ambiguity remains after a failed Save. The generic “this shared space” copy does not resolve it. Show the current saved action scope beside those controls, or suspend those controls until Save/Cancel resolves the draft. Recheck passed: editing now hides Learn and review navigation, displays “Save or cancel your space change to continue,” and retains that state after failed Save. Cancel restored the saved Writing lessons scope; successful Save restored actions under Coding lessons.
2. **Opening the dialog leaves keyboard focus on BODY.** Read-only DOM inspection after opening and after delayed loading completed reported `document.activeElement.tagName === "BODY"`. This occurred with `slow=1`; earlier accessibility observations showed the page as focused after ordinary opening too. Move initial focus into the dialog. Proposal opening does correctly focus its heading, and Escape correctly returns focus to the Learning trigger. Recheck passed: pointer opening during delayed loading focused the H1 Learning title. Escape restored the trigger, and Enter on that trigger reopened with heading focus.

## Controls and state coverage

| Element                   | Prediction and actual outcome                                     | State evidence                                                                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learning entry            | Opens workspace management; matched.                              | Discovered beside Workspace. Title changed to Second project after workspace selection. Initial focus finding above.                                                                                          |
| Refresh Learning          | Reloads current data; refresh affordance is understandable.       | Disabled during settings/detail fetch. Full refresh recovery was not independently exercised; individual Retry paths were.                                                                                    |
| Close Learning / Escape   | Returns to conversation; matched.                                 | Close returned to shell. Escape restored Learning trigger focus. No conversation messages exist in this fixture, so actual conversation-state preservation is outside this proof.                             |
| Learning space            | Draft selection; matched.                                         | Loading spaces text and disabled selector observed. Space-list failure showed Retry; retry restored options. Empty list says create a space in Intelligence then refresh. External creation is not simulated. |
| Save                      | Persists draft; matched.                                          | Disabled while unchanged/loading. Failed save preserved Writing lessons draft and showed error; second Save succeeded with confirmation. Pending save label was not captured.                                 |
| Cancel / Change space     | Discard draft / open editor; matched.                             | Cancel after selecting Writing restored Coding. Action-scope ambiguity while editing is finding 1.                                                                                                            |
| Learn                     | Starts Learning from saved conversations; matched on saved scope. | Queued status disables Learn. Run failure gives error and instructs refresh before trying again. A subsequent Learn succeeded. Pending request itself was not captured separately from queued.                |
| Refresh status            | Retrieves completion; matched.                                    | Queued → finished / one proposal verified. Status failure disabled Learn; Retry restored finished status and enabled Learn.                                                                                   |
| Review skills             | Lists proposals; matched.                                         | Empty copy explains no Skills need review. List error showed Retry and recovered. Selected list and selected proposal were visible.                                                                           |
| Published skills          | Lists published Skills; matched.                                  | Empty copy explains approval. Error Retry recovered. Approved Skill appeared and opened as a reader without review actions.                                                                                   |
| Proposal / Back to skills | Open reader / return to list; matched.                            | Loading proposal shown; detail error had Retry with no decision controls. Retry restored content. Mobile hides list during reading and Back restores it. Heading receives focus.                              |
| Instructions              | Render Markdown; matched.                                         | Twelve-section document, code blocks, tables, and bottom metadata reached by scrolling. Header, content tabs, and decision footer stayed accessible. No horizontal overflow observed at mobile width.         |
| Skill metadata            | Expand metadata; matched.                                         | Collapsed initially; expanded to frontmatter after clicking.                                                                                                                                                  |
| Supporting evidence       | Show source conversations; matched.                               | Loading evidence, request error, Retry, and recovered source conversation/roles/content observed. Evidence-empty/unavailable-source states are not provided by this fixture.                                  |
| Approve skill             | Publish to named space; matched.                                  | Both decision controls disabled with “Saving review…” while pending. Success named the published space. Review-state failure disabled both until detail Retry succeeded; retry approval then succeeded.       |
| Reject skill              | Leave proposal unpublished; matched.                              | Success explicitly stated not published, and review list became empty. Reject-specific pending/error was not separately exercised; same controls showed pending for approval.                                 |

## Keyboard, responsive, and recovery notes

Keyboard Tab moved from Instructions to Supporting evidence, with a visible focus indicator. Tab from Close reached Change space. Proposal selection focused its heading. Escape closed the dialog and restored entry focus. Full focus-loop coverage and screen-reader speech were not tested.

At mobile width the reading path became a single reader with Back to skills. Both themes kept text, controls, and error recovery readable. The long desktop reader reached section 12 and the metadata disclosure while retaining the decision footer. Mobile light published content and mobile dark proposal content rendered code and tables legibly. This is a usability finding, not a separate visual approval.

Errors generally recovered through a visible Retry or repeated Save. Generic GET errors say “Request failed (503). Check the local runtime.” The visible Retry allowed recovery without runtime investigation. The review-state recovery retained the previous Markdown, displayed the uncertainty, and disabled another decision until state was refreshed. This preserved a clear decision boundary.

## Limits

This fixture cannot establish backend persistence, real model runs, unavailable evidence sources, empty candidate file content, deleted/inaccessible selected spaces, running/failed/cancelled server-run variants, or actual conversation-state preservation. Those states still need deterministic tests or another fixture. This report considers loading/error/empty/pending/disabled/focus behavior for every visible control group above; unobserved variants are explicitly distinguished from passes.

Both material findings were corrected and rechecked in the running fixture. The main task path passes within the simulated fixture. A separate read-only check at `http://127.0.0.1:4197` verified the actual application header entry, workspace dialog title, initial heading focus, and Close returning focus to Learning. No Learn, Save, or review mutation was performed in that application preview. Remaining unverified variants above are evidence limits, not claimed passes.
