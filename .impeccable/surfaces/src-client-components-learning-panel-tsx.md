---
version: 1
slug: "src-client-components-learning-panel-tsx"
primary_target: "src/client/components/learning-panel.tsx"
related_targets:
  [
    "src/client/components/learning-dialog.tsx",
    "src/client/workspace.tsx",
    "src/client/components/inspector.tsx",
  ]
---

# Workspace Learning

Mode: Operate. Replace the inspector Learning surface with a workspace modal using the established visual system.
The developer assigns a named Learning space, starts Learning from saved conversations,
and reviews proposed and published Skills. This is an authorized local extension,
not a new visual identity or a whole-page concept round.

## Direction contract

**THESIS:** Put assignment, Learning progress, and Skill review in a workspace-level modal, with the document given protected reading space.

**OWN-WORLD:** Inherit Manrope, compact flat rows, warm configurable accents, and deep neutral charcoal in dark mode. Use spacing and quiet surfaces without enclosing outlines.

**STORY:** Choose a space, save the choice for new conversations, start Learning, inspect instructions and supporting evidence, then explicitly approve or reject.

**FIRST VIEWPORT:** A visible Learning button beside the workspace name opens Learning · [workspace]. A compact assignment summary offers Change space with explicit Save and Cancel. The left rail holds Learn, status, Review skills and Published skills. Selecting a Skill keeps the desktop list beside a broad, independently scrolling reader. Instructions and Supporting evidence switch the reading content; Approve skill and Reject skill remain in the footer. Mobile gives the reader the full dialog and Back to skills restores the list and focus. Escape or Close Learning returns focus to the entry point.

**FORM:** User-specified local redesign, code-led. The component/state ImageGen study is `docs/design/learning-dialog/states.png`, not an approved pixel contract. Keep the broad reader and persistent decisions; remove generated outlines, decorative stripes and misleading sample selection/count. Motion is immediate native modal focus transfer and in-place state updates, with no fading text or animated document layout.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## State and scope decisions

Save and Cancel preserve a draft until the server confirms a change. Loading, no spaces,
disabled assignment, unavailable service, empty reviews, pending writes, running Learning,
failed runs, approved/rejected candidates, and stale published Skills have explicit states.
Learn acts on the selected shared space and says so before the action.
Existing conversations retain their backend assignment and corresponding Skill source.
Approval publishes to that shared space; a lost write response requires reconciliation.
Fresh usability review precedes visual review. Technical checks are a separate verdict.
