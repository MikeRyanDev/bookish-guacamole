# Capabilities design handoff

This delivery extends the incumbent compact developer workspace. It does not establish a new visual identity or replace the design system. The documentation handoff preserves root `DESIGN.md`, `.impeccable/design.json`, source tokens, and the review captures.

## Approved scope

Execution and Connections extend the existing Settings category rail. Usage and Undo remain beside the conversation. Tracing, Diagnostics, and OpenTelemetry are excluded.

The implementation covers `execution-settings.tsx`, `connection-settings.tsx`, `conversation-capabilities.tsx`, `settings-panel.tsx`, and `tool-call.tsx` under `src/client/components/`, plus capability styles in `src/client/styles.css`. The [study](STUDY.md) records the interaction contract. Its [concept image](concept.png) is a decision reference, not a pixel-fidelity specification. Per-response limit captions and Usage placement in that image were rejected; limits cover the conversation and Usage stays beside it.

## Evidence and review outcome

The fresh finish reviewer reported **ship**, with no material fixes, for all 36 captured component surfaces. A later scoped review also returned **ship** for the stale-connection error state and its explicit discard-and-reload action. This handoff records that reviewer disposition; it does not claim a second independent visual review.

The local evidence set is `.impeccable/review/{surface}-{theme}-{width}.png`:

| Surface           | Themes      | Viewport widths |
| ----------------- | ----------- | --------------- |
| `execution`       | light, dark | 1440, 390, 320  |
| `model-prices`    | light, dark | 1440, 390, 320  |
| `connections`     | light, dark | 1440, 390, 320  |
| `connection-form` | light, dark | 1440, 390, 320  |
| `usage`           | light, dark | 1440, 390, 320  |
| `undo`            | light, dark | 1440, 390, 320  |

All 36 named files were present during handoff. Captures cover component surfaces, not every interaction or error state. Native Settings panes scroll internally; a viewport capture does not imply that all form content is simultaneously visible.

Visual finish, task usability, and technical verification remain separate judgments. The supplied visual disposition does not establish backend acceptance, live model behavior, persistence, OAuth completion, keyboard behavior, or complete accessibility conformance. This documentation-only pass ran no model calls or browser tests and makes no new technical or usability pass claim. Delivery-level checks belong in the implementation verification record.

## Consistency with the incumbent system

The extension retains the persistent labeled Settings rail and independently scrolling selected pane. Existing pane components remain mounted across category changes. New fieldsets have no border; spacing and alignment group tasks. Inputs use the incumbent panel fill, neutral text, and control radius. Narrow layouts collapse paired fields to one column, and action groups wrap.

Capability styles reuse the existing background, panel, text, muted, danger, and accent variables. They do not introduce a new neutral palette. Dark surfaces therefore retain the incumbent charcoal palette with its trace of blue. Interface labels stay compact, while connection configuration uses monospace where appropriate. No decorative enclosing cards, section rules, framework captions, or repeated category headings are required by this extension.

Explicit controls carry decisions: Save changes and Cancel changes, named connection actions, Usage, Undo last turn, and the history confirmation's Cancel and Undo/Redo actions. Consumption distinguishes unknown cost from known cost. Recovery explains affected files and blocking conditions rather than presenting restoration as an immediate toolbar action. These choices follow the approved Operate direction and existing product constraints.

## Documentation drift recorded without repair

- `PRODUCT.md`, the Settings navigation section of `DESIGN.md`, and the sidecar narrative still describe the earlier Appearance, Models, and Permissions category set. Current source also includes Execution and Connections. The root documents do not yet describe the new capability controls.
- `DESIGN.md` describes primary controls as accent-filled. Capability `.primary-action` styles currently use neutral text/background inversion. This is a local implementation difference from the recorded primary-action convention; it does not redefine the system token.
- The sidecar's Primary action and Permission group specimens still show “Allow once,” while root `DESIGN.md` records Approve Once, Always Approve, and the scope-preview flow. The sidecar Tool disclosure specimen also uses visible “Result received” text where root guidance describes the completed-result checkmark. These are existing specimen/documentation mismatches, not repairs included in this delivery.
- The delivery verification record separately records usability and technical results. STUDY.md now links to that record.

No root document or sidecar refresh was performed. The handoff is limited to this file. A future authorized design-system refresh can reconcile these records against the then-current implementation; this ordinary extension does not silently overwrite the incumbent contract.
