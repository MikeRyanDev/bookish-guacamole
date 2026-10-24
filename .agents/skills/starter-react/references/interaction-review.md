# Interaction review

Use these gates when adding or changing a user workflow, control meaning, navigation, or feature discovery.
A styling-only change that preserves interactions needs the existing visual checks, not a new workflow proposal.

## Before implementation

State the user's task without naming the controls you plan to build.
Show a concrete interaction proposal in the conversation before editing UI behavior:

| User task | Visible control and initial state | Expected click result | Actual planned result | Recovery or exit |
| --------- | --------------------------------- | --------------------- | --------------------- | ---------------- |

Include the entry point and click sequence. Show a sketch or wireframe when spatial relationships affect understanding.
“Compact toolbar with details” is not enough: include the actual labels and what each click does.
A broad direction approval does not approve labels or interactions that the user has not seen.
Honor already approved interaction details. This gate requires a concrete proposal, not another automatic permission request.
If a consequential choice remains unresolved, ask a focused question and continue independent work.

Review the proposal against these rules:

- A control's visible label must communicate its action or destination. A current-state label alone is insufficient for an undiscoverable mode switch.
- Label, icon, shape, and placement must predict behavior together. A control that looks editable must edit the value. Help must look and read as help.
- Keep fixed limits and explanatory facts as text unless they have a clear action. Do not turn them into ambiguous controls to save space.
- Use familiar task language at the entry point. Prefer explicit labels over hiding necessary actions to satisfy a minimal-text preference.
- Use a disclosure for optional detail. Use a modal only when interruption or protected focus is necessary. A popover can still be confusing even if it is technically non-modal.

Resolve mismatches before coding. Record the chosen sequence in the existing surface brief or task documentation; avoid a duplicate design-system document.

## First-use review before delivery

Run a fresh usability reviewer before the Impeccable visual finish review.
Spawn with no inherited conversation and load [usability-reviewer.md](usability-reviewer.md).
This separate review is required for changed workflows; the visual reviewer cannot substitute for it.

Provide only the user's task, starting state, relevant constraints, and an isolated preview URL or unannotated captures initially.
Do not provide your direction contract, control map, implementation, rationale, intended click path, previous verdict, or suspected defects.
Have the reviewer record the entry point they choose and expected outcomes before they inspect actual behavior.
Then provide interaction evidence or source as needed to compare predictions with reality.
Keep existing authorization boundaries: no model calls, external writes, approvals, or destructive actions just for a walkthrough.

Use a runnable local fixture when the real workflow has side effects.
When only captures are available, label the review as a prediction review and list untested behavior.
Do not claim successful task completion from screenshots alone.
If independent review is unavailable, report that limit and perform a task walkthrough without calling it an independent pass.

## Acceptance and reporting

Record separate results for:

1. Usability: discovery, predicted versus actual outcomes, task completion, and recovery.
2. Visual quality: hierarchy, layout, responsiveness, and the incumbent design system.
3. Technical verification: behavior tests, accessibility checks, and build results.

No result substitutes for another. A label or affordance that misleads the reviewer is a material usability finding even when tests pass.
Fix task-blocking ambiguity and misleading controls before delivery, then repeat the affected task with fresh eyes.
A user report of confusion reopens usability acceptance; do not defend the interface with prior test counts or a visual ship verdict.
Include the task, evidence, unresolved findings, and review limits in delivery documentation.
These are agent workflow gates. Neither a Markdown checklist nor the source detector can automatically establish usability.
