---
version: 1
slug: "src-client-components-learning-panel-tsx"
primary_target: "src/client/components/learning-panel.tsx"
related_targets: ["src/client/components/inspector.tsx"]
---

# Workspace Learning

Mode: Operate. Extend the existing workspace inspector using its established visual system.
The developer assigns a named Learning space, starts Learning from saved conversations,
and reviews proposed and published Skills. This is an authorized local extension,
not a new visual identity or a whole-page concept round.

## Direction contract

**THESIS:** Put assignment, Learning progress, and Skill review beside the current workspace, with visible task controls.

**OWN-WORLD:** Inherit Manrope, compact flat rows, warm configurable accents, and deep neutral charcoal in dark mode. Use spacing and quiet surfaces without enclosing outlines.

**STORY:** Choose a space, save the choice for new conversations, start Learning, inspect instructions and supporting evidence, then explicitly approve or reject.

**FIRST VIEWPORT:** A visible Learning button beside Files opens the existing inspector. Assignment occupies its top, Learn and run status follow, then Review skills and Published skills. Selecting a Skill replaces the list with a reader and Back action. Mobile uses the same sequence at full panel width. Pending actions keep their label and announce progress; reduced motion preserves immediate state feedback.

**FORM:** Local extension, code-led. No concept seed applies. The ImageGen component study is `docs/design/workspace-learning/states.png`, not a pixel contract. Preserve the incumbent controls, remove generated outlines, and omit invented counts and timestamps.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## State and scope decisions

Save and Cancel preserve a draft until the server confirms a change. Loading, no spaces,
disabled assignment, unavailable service, empty reviews, pending writes, running Learning,
failed runs, approved/rejected candidates, and stale published Skills have explicit states.
Learn acts on the selected shared space and says so before the action.
Existing conversations retain their backend assignment and corresponding Skill source.
Approval publishes to that shared space; a lost write response requires reconciliation.
Fresh usability review precedes visual review. Technical checks are a separate verdict.
