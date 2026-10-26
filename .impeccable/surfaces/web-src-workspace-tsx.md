---
version: 1
slug: "web-src-workspace-tsx"
primary_target: "src/client/workspace.tsx"
related_targets:
  ["src/client/components/tool-call.tsx", "src/client/components/appearance-settings.tsx"]
---

# Coding workspace redesign

## Current refinement: darker neutrals, less chrome

The user rejected the green cast, persistent metadata, and remaining boxes after the first redesign.
This refinement keeps the fonts, eight accents, controls, and workflows. It changes the neutral palette and removes unnecessary presentation.
Earlier concepts below are historical references, not authority for green surfaces or enclosing panels.

**THESIS:** Let the work carry the interface; use spacing before drawing a boundary.
**GROUND:** Dark background `#141517`, panel `#191a1d`, and code `#1b1c20` are darker charcoal with only a trace of blue. Accent and semantic diff colors remain independent.
**CONTENT:** Remove framework branding, model/container identifiers, idle Ready text, repeated run status, the connection dot, repeated section/role labels, and the empty-state tagline/icon frame. Keep accessible names, active composer status, errors, approval scope, and decisions.
**FORM:** No pane, header, footer, dialog, search, composer, or ordinary button outlines. No enclosing permission panel. Code uses one quiet surface. Keyboard focus, table row rules, and spinner geometry are functional exceptions.
**ACCESS:** Harness documentation moves to the command menu. Workspace paths remain available in workspace management. Runtime configuration remains in setup files and documentation, rather than read-only Settings text.
**PROOF:** New regression checks first failed against the old chrome. Verify both themes, all accents, keyboard controls, mobile, tool approvals, and the workspace manager; inspect current screenshots before delivery.

## Brief and research

The user requested a cleaner tool-call interface, Google Fonts typography, eight warm vintage-rainbow accents, and fewer borders and boxes.
The user delegated the design choice. The existing compact, Linear-inspired developer workspace remains the product context.

Sources reviewed on 2026-10-23:

| Source                                                                                                | Observation                                                                                                         | Application here                                                                            |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [Claude Code public product demo](https://claude.com/product/claude-code)                             | The rendered demo separates prose from quiet expandable activity rows. File reads and edits use short descriptions. | Tool rows show a concise action, target, and outcome. Successful reads collapse by default. |
| [Claude desktop documentation](https://code.claude.com/docs/en/desktop#review-changes-with-diff-view) | Code changes have an explicit review surface with file context.                                                     | File headers and additions/removals stay readable beside approval controls.                 |
| [Cursor agent overview](https://cursor.com/docs/agent/overview)                                       | Reading, editing, and command execution are separate tool responsibilities.                                         | Each tool gets a purpose-specific presentation and an exact raw-argument disclosure.        |
| [Cursor 2.0 interface release](https://cursor.com/changelog/2-0)                                      | The release describes consolidated review of changes across files.                                                  | Keep related source/output together and keep metadata subordinate to the change.            |

The Claude public demo was inspected in a browser. Cursor research used its published documentation and release page.
Some embedded Cursor media did not load in the research browser. This study does not claim inspection of a signed-in Cursor or ChatGPT session.
Private research captures remain under `.data/redesign/`.

## Typography

[Manrope](https://fonts.google.com/specimen/Manrope) supplies the interface's pleasant, rounded sans-serif voice.
[IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) supplies readable, distinct code glyphs in commands, diffs, and file previews.
Both families are self-hosted through pinned Fontsource packages. Normal startup does not request Google Fonts servers.
Manrope uses its variable weight range. Plex Mono loads 400 and 500 weights.

## Studies and selection

The built-in imagegen tool produced three studies before implementation:

- [Workspace composition](../../docs/design/redesign/workspace.png)
- [Tool components and states](../../docs/design/redesign/tools.png)
- [Appearance controls](../../docs/design/redesign/appearance.png)

Each image has an adjacent `.png.json` file with the exact prompt and generation tool.
The prompts are also embedded in the PNG metadata.
These are design studies, not screenshots or promises of backend data.

Selected treatment: flat activity rows, quiet code surfaces, compact type, and a restrained accent system.
The implementation intentionally removes the studies' redundant nested outlines, invented account information, timestamps, durations, and unsupported navigation.
The user's request for fewer boxes takes priority over generated image details.
This is a code-led translation using the studies as visual references, not a pixel-matching contract.

## Direction contract

**THESIS:** Make tool activity easy to scan and changes easy to inspect without enclosing every event in a card.

**OWN-WORLD:** Soft neutral surfaces, Manrope labels, Plex Mono source, muted rainbow accents, and minimal structural dividers.
A single code surface holds the meaningful payload. Status stays in the activity row.

**STORY:** Read the action and outcome, open its evidence, inspect the exact proposed change, then approve or reject that call.

**FIRST VIEWPORT:** Preserve the compact three-pane workspace. The central transcript leads; files and sessions support it.
The composer remains anchored below the transcript. Settings exposes mode and eight accent swatches together.

**FORM:** The brief pins modern harness minimalism and vintage-rainbow customization. Those constraints override unrelated catalog directions.
Impeccable exploration ran with `seed:55214461d4b32883` (assigned index 7); the user-delegated selection follows the explicit brief.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Component decisions

- Tools: native disclosure rows with explicit status, exact payload copying, and raw details. No surrounding outline or colored edge.
- Commands: command and output share a quiet surface. Failed output starts expanded; an exit failure never receives a success label.
- Patches: file header, restrained red/green lines, and explicit addition/removal signs. Redundant single-file transport framing is omitted from the preview.
- Raw patch and arguments: preserved exactly for copying and inspection, including multi-file framing.
- Files: successful reads start collapsed. Expanded content retains provider-supplied line numbers and escaped source text.
- Approvals: proposed payload and per-call decision footer stay together. No colored left stripe or nested bordered cards.
- Appearance: native radio groups support keyboard selection. Eight choices persist with light/dark mode and apply across the app.
- Accent names: Moss, Ochre, Apricot, Coral, Rose, Plum, Iris, Denim. Each has distinct accessible light/dark foreground values.
- Semantic colors: errors and diff additions/removals keep their meaning when the primary accent changes.
- Motion: short disclosure/control feedback and existing reduced-motion support. Virtual rows do not animate on remount.
