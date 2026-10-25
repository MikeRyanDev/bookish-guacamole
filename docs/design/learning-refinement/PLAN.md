# Learning reading layout

The approved nine-step plan prioritizes Skill selection and reading. This local refinement preserves the workspace entry, native dialog, backend contracts, fonts, and theme tokens.

## Pre-build evidence

The standalone HTML preview lives in `.data/learning-refinement/preview.html`. Before application edits, Chrome inspection covered desktop at 1512px, mobile list and reader at 390px, an empty list, and a refresh error with retained content. The prototype uses synthetic data. It proves composition, not working interactions. The prototype has an incomplete light code color and an inconsistent empty count. The implementation uses the existing theme tokens and actual counts.

The generated state study is illustrative. Its blue buttons, dividers, selection stripes, invented Create a skill action, and inaccurate labels are rejected. The HTML preview sets the intended alignment and restrained control hierarchy.

## Interaction contract

Learning beside the workspace name opens the dialog. Close and Escape restore entry focus.
Change space opens the assignment editor and its guidance. Save applies the choice. Cancel restores the existing reader. The editor hides actions that depend on the saved space.
Review skills and Published skills select the list. A row opens its document and focuses the title. Desktop retains the list without a Back control. Mobile and short-window Back to skills restores the list and focus.
Learn starts a run over saved conversations in the named space. Its adjacent status reports progress and the result. One Refresh skills control beside list navigation refreshes reads, including run status. Failed reads expose local Retry controls.
Instructions and Supporting evidence switch proposal content. Approve skill and Reject skill remain in the footer. Published documents have no decision controls.

## States

| Element | States and behavior |
| --- | --- |
| Close and Back | Neutral default, hover surface, visible keyboard focus, press feedback. Close remains available during reads. Back appears only in the mobile reader. |
| Change space | Compact text action. Editor replaces the summary. Long space names wrap. |
| Assignment | Initial loading and read errors disable selection. Save stays disabled until a different choice exists. Pending save disables edits and Cancel. Failed save keeps the draft. Save/Cancel restore focus to Change space. |
| Learn | Neutral action beside status. Loading, active run, pending start, and unknown run state disable starts with an adjacent explanation. Failure permits explicit state refresh before a retry. |
| Refresh skills | One named icon action, disabled during refresh with adjacent status. It refreshes list, selected document, evidence, and run status. Local Retry remains beside each failed read. |
| List navigation | Neutral default, soft selected fill, hover, pressed and visible focus. Counts come from confirmed data. |
| Skill row | Full wrapping title, two-line preview, muted description, soft selection. Hover retains selection clarity. Keyboard activation opens the same reader. |
| Reader | Stable title and content switches. Initial loading has a local status. Failed refresh retains the document with an error and Retry. Wide code and tables scroll within the document. |
| Decisions | Explicit destination text. Pending writes keep action geometry stable and disable duplicates. Unknown result disables decisions until a successful state read. Confirmed outcomes replace actions. |
| Metadata | One native disclosure per Markdown file with frontmatter. Original source remains intact. |
| Empty and missing data | Explain no spaces, no proposals, no published Skills, missing files, missing evidence, and unavailable sources locally. |

## Text source

Intelligence `libs/learning-agent/src/skill-candidate-draft.ts:112` prefixes trigger and exclusion fields. The browser currently renders that resulting description unchanged. Display-only normalization removes repeated leading `Use when When`, `Use when Use when`, and repeated `Do not use for` phrases. It does not rewrite Markdown, frontmatter, SDK data, or stored Skills.

## Acceptance

Inspect both themes at mobile, desktop, the user's width, and 200 percent browser zoom. Include long titles, documents, errors, focus, and pending states. Run a fresh task-first usability review before the separate visual review. Include the user's rejected screenshot in the visual review packet. Run required checks, merge into local main, and verify the active app. No fresh model or Learning run is needed for this UI change.
