# Learning design documentation evidence

Date: 2026-10-24. Scope: an authorized Learning-specific merge into the incumbent DESIGN.md. This is a delegated Impeccable documenter pass, not an inline substitute or a new visual-world selection.

## Changes

DESIGN.md now records the workspace entry, modal geometry, separate scrolling regions, responsive reader, local typography, assignment editor, state controls, decision footer, and focus behavior. Its global frontmatter and unrelated component guidance remain unchanged. The workspace layout description now places Learning outside file inspection. The local reader sizes and 12px dialog radius describe this implemented surface; they do not establish replacement global scales.

No code was changed. The pre-existing `.impeccable/design.json` drift was not repaired: the assigned write boundary covers Learning documentation only. No global token regeneration or identity change was authorized.

## Evidence checked

- Read the full Impeccable document reference and documenter role, existing DESIGN.md, and the Learning direction contract.
- Inspected `src/client/styles.css`, `learning-panel.tsx`, and `learning-dialog.tsx` for exact dimensions, typography, breakpoints, overflow, states, and focus transfer. Checked the workspace entry and separate inspector ownership in `workspace.tsx` and `inspector.tsx`.
- Cross-checked the updated Learning descriptions in PRODUCT.md, README.md, and docs/ARCHITECTURE.md.
- Opened final synthetic captures `dialog-light-1440.png`, `dialog-dark-390.png`, and `dialog-review-pending-390.png`. These support the documented broad desktop reader, full-width mobile reader, incumbent palette, and pending footer treatment. Other captures were inventoried, not independently visually reviewed in this pass.
- Parsed every PNG provenance sidecar in this directory and verified each PNG contains the `impeccable:prompt` metadata key. The eight dialog captures identify synthetic fixture state. `states.png` has an illustrative-study record, not approval as a pixel comp.
- Read USABILITY.md and VISUAL-REVIEW.md, including the original findings and the later scored-fix verdict.

## Separate verdicts and limits

Documentation: complete for this local surface, grounded in current source and the sampled final captures. CSS sets Markdown line height to 1.75, but the panel's paragraph rule gives paragraphs 1.6; DESIGN.md records both rather than claiming uniform 1.75 text.

Usability: the independent report passes the exercised simulated tasks after correcting assignment-draft ambiguity and initial focus. It also records a read-only actual-app check of entry, title, heading focus, and focus return. Its unobserved state variants and full keyboard-loop/screen-reader limits remain explicit. This documenter did not repeat those interactions.

Visual: the original review required truthful empty-reader guidance and stable pending decisions. The follow-up disposition is ship only for those scored fixes. It is not a blanket approval of all surface states or backend behavior. This pass does not expand that scope.

Technical: no application tests were run by the documenter. The parent owns deterministic checks, backend evidence, and merged-tree verification. Source inspection is not proof that all transitions execute correctly. The synthetic captures do not establish real model use, persistence, or backend Learning behavior.

Not canonized: illustrative study outlines/stripes, global sidecar drift, and unverified interaction or backend claims. None belongs in the Learning design rules.
