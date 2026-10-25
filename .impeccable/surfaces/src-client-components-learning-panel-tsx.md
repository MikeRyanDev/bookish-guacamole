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

**THESIS:** Make Skill selection and reading primary. Keep workspace assignment compact and Learning progress beside its action.

**OWN-WORLD:** Preserve Manrope, neutral charcoal, configurable accent, flat rows, and visible focus. No new global tokens, borders, or decorative dividers.

**STORY:** Select a Skill, read its instructions and evidence, then decide. Change the Learning space only when needed.

**FIRST VIEWPORT:** Compact title and Close row, then one assignment row. A 280px library contains Learn beside status, list navigation, one refresh control, and two-line row previews. The broad reader aligns its title, description and Markdown on one left edge. Desktop has no Back control. Mobile uses one pane and an explicit Back control. Decisions stay below scrolling content.

**FORM:** User-pinned nine-step refinement, code-led. No concept seed applies. The pre-build HTML preview and generated state study are recorded in docs/design/learning-refinement/PLAN.md. The study is illustrative, not an approved comp.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
