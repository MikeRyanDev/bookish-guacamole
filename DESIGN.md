---
name: TanStack Coding Starter
description: A compact developer workspace with flat activity rows and warm configurable accents.
colors:
  light-bg: "#fbfaf8"
  light-panel: "#f2f2ee"
  light-hover: "#e9ebe4"
  light-text: "#272a25"
  light-muted: "#61675b"
  light-line: "#dfe2d9"
  light-control: "#858e7c"
  light-accent-bg: color-mix(in srgb, var(--accent) 10%, var(--bg))
  light-on-accent: "#fff"
  light-code: "#f1f2ed"
  light-danger: "#a13c42"
  dark-bg: "#141517"
  dark-panel: "#191a1d"
  dark-hover: "#25262a"
  dark-text: "#edeef0"
  dark-muted: "#adafb5"
  dark-line: "#36383e"
  dark-control: "#777b85"
  dark-accent-bg: color-mix(in srgb, var(--accent) 14%, var(--bg))
  dark-on-accent: "#141517"
  dark-code: "#1b1c20"
  dark-danger: "#efacaf"
  moss-swatch: "#7e956f"
  moss-light: "#416447"
  moss-dark: "#acc59c"
  ochre-swatch: "#c8a354"
  ochre-light: "#806018"
  ochre-dark: "#dec080"
  apricot-swatch: "#d39970"
  apricot-light: "#98532c"
  apricot-dark: "#e8b28c"
  coral-swatch: "#c88073"
  coral-light: "#9c4c43"
  coral-dark: "#e6a095"
  rose-swatch: "#b87f98"
  rose-light: "#934b65"
  rose-dark: "#dca2b9"
  plum-swatch: "#9b7d99"
  plum-light: "#79516e"
  plum-dark: "#c7a1c0"
  iris-swatch: "#9190b6"
  iris-light: "#625b91"
  iris-dark: "#b5acdd"
  denim-swatch: "#7b9aaf"
  denim-light: "#426780"
  denim-dark: "#99b8cc"
  light-diff-added: "#285e36"
  light-diff-added-bg: "#e2ecdf"
  light-diff-removed: "#943f48"
  light-diff-removed-bg: "#f1e2e1"
  dark-diff-added: "#b1d4a4"
  dark-diff-added-bg: "#2d3e2b"
  dark-diff-removed: "#efb2b4"
  dark-diff-removed-bg: "#452e30"
  light-syntax-keyword: "#715a8d"
  light-syntax-string: "#42704a"
  dark-syntax-keyword: "#c6b3df"
  command-backdrop: "#0005"
  workspace-backdrop: "#080b1259"
typography:
  body:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: 13px
    fontWeight: 400
  prose:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.8
  title:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: 13px
    fontWeight: 600
  label:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: 12px
    fontWeight: 500
  tool-action:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: 12px
    fontWeight: 550
  metadata:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: 11px
    fontWeight: 400
  source:
    fontFamily: '"IBM Plex Mono", monospace'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.8
  code:
    fontFamily: '"IBM Plex Mono", monospace'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.65
  section-title:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: 14px
    fontWeight: 600
  empty-title:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: 22px
    fontWeight: 500
    letterSpacing: -0.5px
  boot-title:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: 20px
    fontWeight: 700
rounded:
  control: 6px
  surface: 8px
  circle: 50%
spacing:
  compact: 4px
  control-gap: 8px
  inset: 12px
  group: 16px
  pane: 24px
components:
  button-primary:
    backgroundColor: "{colors.moss-light}"
    textColor: "{colors.light-on-accent}"
    rounded: "{rounded.control}"
    padding: 7px 12px
  button-primary-dark:
    backgroundColor: "{colors.moss-dark}"
    textColor: "{colors.dark-on-accent}"
    rounded: "{rounded.control}"
    padding: 7px 12px
  button-secondary:
    backgroundColor: "{colors.light-bg}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.control}"
    padding: 7px 12px
  button-icon:
    textColor: "{colors.light-muted}"
    rounded: "{rounded.control}"
    width: 32px
    height: 32px
    padding: "0"
  session-selected:
    backgroundColor: "{colors.light-accent-bg}"
    textColor: "{colors.moss-light}"
    typography: "{typography.label}"
    padding: 10px 8px
  input-search:
    textColor: "{colors.light-text}"
    rounded: "{rounded.control}"
    padding: 7px 8px
  tool-disclosure:
    textColor: "{colors.light-muted}"
    rounded: "{rounded.control}"
    padding: 4px 6px
  activity-summary:
    textColor: "{colors.light-muted}"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
    padding: 4px 6px
    width: 100%
  tool-surface:
    backgroundColor: "{colors.light-code}"
    rounded: "{rounded.surface}"
    typography: "{typography.source}"
  permission:
    padding: "0"
  appearance-mode:
    backgroundColor: "{colors.light-panel}"
    rounded: "{rounded.surface}"
    padding: 4px
---

# Design System: TanStack Coding Starter

## Overview

**Creative North Star: "The coding workspace"**

A compact, plain, minimal, clean, and elegant interface for sophisticated developers. Linear informs density, restrained hierarchy, coherent controls, and precise feedback. Tool activity is easy to scan and changes are easy to inspect without enclosing every event in a card.

### Confirmed design taste

These preferences come from the user's [requirements](IMPROVEMENTS.md), [browser delivery plan](docs/IMPROVEMENTS-PLAN.md), and [redesign brief](docs/DESIGN-STUDY.md). They apply to this developer workspace, not automatically to unrelated products or marketing surfaces.
Use whitespace to separate tasks without sparse panels. Prefer recognizable icons; add visible labels where understanding or safety requires them.
Treat hover, focus, pressed, disabled, loading, empty, error, and success states as part of each component.
Make motion thoughtful without delaying input, distracting from reading, or causing navigation flicker.
Commands, patches, files, and permission decisions deserve the same care as the shell.
Default to no borders, dividers, or enclosing cards. A line must solve a specific usability problem that spacing, alignment, and subtle surface changes cannot solve.
Keep persistent text tied to a task or decision. Omit framework branding, decorative model/container identifiers, idle status, repeated headings, and decorative connection indicators. Task-specific model choices remain appropriate in Settings.
Dark neutral surfaces must be deeper charcoal with only a trace of blue, never green-tinted gray. Warm accents stay separate from the neutral palette.

### Change authority and design process

The latest user request takes priority, followed by user-owned requirements and these recorded preferences.
The current Google Fonts pairing and configurable warm accents implement the delegated redesign. Exact sizes, colors, and radii are implementation choices; preserve them during routine refinements without treating them as permanent personal preferences.
Generic design guidance must not override the compact workspace brief. Source values in `src/client/styles.css` and `src/client/appearance.ts` are the implementation ground truth; refresh these tokens when they change.

For new or substantially redesigned component families, use imagegen concepts and component/state studies before implementation, as requested by the user. Small fixes can use existing studies and rendered UI.
Consult the [component inventory](docs/IMPROVEMENTS-PLAN.md#component-inventory), the current [workspace](docs/design/redesign/workspace.png), [tools](docs/design/redesign/tools.png), and [appearance](docs/design/redesign/appearance.png) studies, and their [direction contract](docs/DESIGN-STUDY.md).
The earlier [navigation](docs/design/navigation.png), [conversation](docs/design/conversation.png), and [inspector](docs/design/inspector.png) studies remain historical references.
The [tool activity state study](docs/design/tool-stack/concept-study.png) was generated retrospectively after the first implementation pass. It was not an approved pre-build comp; this deviates from the study-before-implementation process above. Its [study record](docs/design/tool-stack/STUDY.md) documents the user-selected grouping and evidence limits.
Generated labels, data, and status indicators are not product facts. The user brief, real behavior, and accessibility take priority over generated details. Verify the translation in the rendered app.

**Key Characteristics:**

- Soft neutral surfaces with eight warm vintage-rainbow presets and saved custom accents.
- Manrope interface text and IBM Plex Mono source text.
- Flat activity rows, quiet code surfaces, and explicit outcomes.
- Equal attention to light, dark, keyboard, and narrow-screen use.

## Colors

Warm neutral light surfaces and deeper charcoal dark surfaces support a muted vintage rainbow. Dark neutrals carry only a trace of blue; the palette must not read as blue-themed or green-tinted.

### Primary

Moss is the default. Settings also offers Ochre, Apricot, Coral, Rose, Plum, Iris, and Denim.
Each has a display swatch plus separate light and dark foreground values in the frontmatter.
The resolved light or dark mode drives the runtime accent for links, focus, primary actions, and selection. System mode follows the operating system.
Custom colors preserve the entered sRGB color and opacity in their saved swatches. The interface derives opaque light and dark accent shades for readable foregrounds and buttons; custom colors do not redefine the preset or neutral tokens.
Soft selection backgrounds mix that accent with the current background; swatch colors are not substitutes for accessible foreground values.

### Neutral and semantic roles

Background, panel, hover, text, muted text, code, and on-accent roles have separate light and dark tokens.
The line token is reserved for functional table row rules and spinner geometry. Ordinary regions and controls have no permanent outlines.
Danger text and source additions/removals retain semantic colors independent of the chosen accent. Diff signs and textual outcomes accompany color.
Dark syntax strings share the dark added-source foreground.

**The Neutral Surface Rule.** Keep dark backgrounds nearly achromatic with a trace of blue. Selected accents may tint selection and focus, never the base surface palette.

**The Semantic Color Rule.** Changing the accent must not change the meaning of errors or added and removed source lines.

## Typography

Manrope Variable supplies the pleasant sans-serif interface voice. IBM Plex Mono distinguishes source glyphs in commands, diffs, and file previews.
Both Google Fonts families are self-hosted through pinned Fontsource packages; normal startup does not request Google Fonts servers.
The frontmatter records the compact body, title, label, action, metadata, and source roles. General preformatted blocks use the code role; tool payloads use the more spacious source role.
Keep headings subordinate to the developer task; larger empty-state headings are local exceptions, not a display-type system.

**The Source Type Rule.** Use mono for source, commands, paths, and machine values; use sans-serif for actions and explanations.

## Layout

The desktop workspace has session navigation, a central transcript and anchored composer, and file inspection. Workspace Learning opens separately from the visible Learning action beside the workspace name.
Its grid is 224px / flexible (minimum 320px) / 290px beneath a 48px header. At 1100px, side panes narrow to 200px and 250px.
At 850px, panes occupy one shared content area and navigation selects the visible pane; icon hit areas grow from 32px to 40px.
When the development Inspector is present, the header reserves 72px at its end for the floating badge. Workspace names truncate before app controls overlap it.
The conversation uses compact grouped spacing and contained scrolling. Tool headers wrap below 600px. Settings keeps its header and left category rail fixed while only the selected pane scrolls. The dialog is at most 740px wide and 580px tall, with a 154px rail. At 600px and below, the rail narrows to 104px while retaining icons and labels; the dialog leaves 8px viewport margins and reaches at most 640px tall. The eight preset accents become two four-item rows and numeric color entry moves below the color plane at that breakpoint.

The virtual transcript follows streaming only while the reader remains near its end. User-triggered disclosure preserves the clicked control's viewport position while row heights settle; streaming then resumes following only at the end. Saved session rows stay mounted during navigation.
Do not animate virtual rows on remount. User-opened tool and group disclosures reveal in place over 180ms with a decelerating clip; their layout height settles immediately so inspection anchoring stays authoritative. Content remains at full contrast throughout. Restored nested disclosures do not replay the reveal. Reduced motion skips it. Short local motion explains disclosure, focus, press, panel, and dialog state; reduced-motion preferences disable it.

## Elevation & Depth

Flat surfaces, spacing, and alignment carry the workspace. Ordinary panes, dialogs, search fields, and controls have no outline or separating rule.
The composer uses a subtle panel fill; source payloads use one quiet code surface. Permission groups add no enclosing panel.
Functional exceptions are visible keyboard focus, table row rules that preserve cell relationships, selected accent outlines, and spinner geometry. Each exception communicates an actual state or relationship.
Dialogs use soft overlay shadows. Jump to latest uses a small floating shadow, and selected appearance mode uses a slight lift.
These are specific depth roles, not a reason to shadow ordinary activity rows. Exact shadows and motion live in the sidecar extensions.

**The No-Line Default Rule.** Start with no border, divider, or card wrapper. Add one only when a concrete usability need cannot be met with spacing, alignment, or a subtle surface change; record that reason.

**The Flat Activity Rule.** Separate tool events with spacing and disclosure hierarchy. Keep the meaningful payload in one quiet surface.

## Shapes

Ordinary controls use the control radius. Source surfaces, user messages, and the composer use the surface radius. Permission groups are unframed.
Circles remain intentional for accent swatches, activity indicators, and Jump to latest, including its hover and focus surfaces.
Keep state shapes consistent. Do not copy legacy isolated radius values into new components as additional system scales.

## Components

### Controls and navigation

Reuse `IconButton` for named icon actions. Primary actions use the selected mode-specific accent and on-accent text. Secondary controls use neutral surfaces; disabled actions reduce opacity and retain their semantics.
Keyboard focus uses an accent outline with an offset. Session and file selection use soft accent fill and text, with no decorative left stripe.
Inspector tabs indicate selection with an accent tint and fill, without an underline. Search is unboxed; its icon, placeholder, and focus outline identify the field.
The composer is a subtly filled surface with a focus outline. Workspace form inputs use panel fill and keyboard focus instead of permanent outlines.

### Tool activity and source

The [tool polish study](docs/design/tool-polish/STUDY.md) records the rejected tree-like concept and the final minimal treatment. Stacking, grouping, indentation, and interruption rules remain unchanged.

Reuse `ToolCall` within the derived `TranscriptMessages` view. A flat native disclosure row shows a human action, target, and truthful outcome.
Action and activity-count labels use weight 550. Tool-type icons remain unframed. Completed results use a quiet checkmark with the accessible name and tooltip “Result received”; exit codes, missing results, failures, running work, and approvals keep visible text. Approval status uses a soft accent fill; errors retain semantic danger color.
Two or more consecutive completed calls without failed outcomes share one initially collapsed activity summary, including across assistant message boundaries. A single call remains a direct tool row. Narrative, user messages, pending approvals, and exceptional or unfinished calls break groups.
The summary reports call count and work categories; expansion reveals calls in order, each with its own payload disclosure. Failed, denied, running, and missing-result calls remain outside completed groups. Pending approvals retain their separate decision surface.
Completed calls, including patches, begin collapsed. Failures, running work, and approval content begin expanded unless the reader has chosen otherwise. Missing-result rows retain their explicit status.
Activity summaries and tool headers have a minimum height of 34px and use the compact padding in the frontmatter. Expanded headers are adjacent without message-sized gaps; activity blocks have 8px trailing separation. Group content is inset 22px, reduced to 8px below 600px; category summaries wrap at that breakpoint.
Explicit group and top-level tool disclosure choices survive virtual row remounts only within the mounted conversation. Nested output/raw-detail disclosures are not covered by that retention, and choices are not stored for a later conversation mount.

**The Inspection Origin Rule.** Preserve the clicked disclosure's viewport position during expansion and collapse. Continue following streaming output only when the reader remains at the end.

Commands and their output share one code surface. A subtle neutral surface change separates output from its command without a divider. Source headings use a quiet neutral fill. Expanded file/patch content has one file heading; collapsed rows retain target context.
Copy actions preserve the exact source payload and report failure explicitly. Raw arguments remain inspectable.
Patch previews omit redundant transport framing for a single file while retaining meaningful multi-file framing, signs, and counts. File previews retain provider-supplied line numbers.

### Permissions

Keep the proposed payload and decision footer together without an enclosing panel. Order the actions Reject, Approve Once, Always Approve.
Both approval actions use the accent fill and on-accent text. Reject remains neutral.
Always Approve opens an inline scope preview. Approve and Save and Cancel replace the footer until the user decides.

Order the composer controls Create goal, Plan, then Require permissions / YOLO. Plan is a pressed-state toggle with the accessible name Plan mode.
Do not insert visible save-status text into this toolbar. Preserve its dimensions during submission.
The permission selector shows choice labels only. Put short explanations in hover text. Keep timing and persistence rules in documentation.
The selected permission preference remains visible during planning.
Saved rules belong in the Permissions category in Settings, below Default permissions. They are not a composer action. Initial reads use a stable skeleton; refresh keeps existing rows visible. Removal keeps its row until confirmed and disables rule actions while pending. Local errors offer Retry for the failed operation; an empty list says No saved rules.
See the [approval study](docs/design/permissions/STUDY.md) for behavior and review evidence.

### Settings navigation

Appearance, Models, and Permissions form a vertical tab list with functional icons and short labels. Appearance is selected on open. Selected tabs use soft accent fill and neutral text; no divider or enclosing card separates the rail from its content. Up/Down, Home, and End select and focus a tab. Hidden panes remain mounted, retaining color drafts across category changes. Closing discards an unfinished color draft; remote saves continue. Keep task copy local and brief, with no repeated category heading or idle saved message. The [settings navigation study](docs/design/settings-navigation/STUDY.md) records the interaction and state contract.

### Appearance

Settings has native radio groups for Light, Dark, and System modes and the eight preset accents. Selected accents have a checkmark, outline, and visible name; keyboard selection remains available. System listens for operating-system appearance changes.
Add color expands an inline editor with HEX selected. RGBA, HSV, CMYK, and HEX edit the same color; opacity remains available in every format. Labeled hue, saturation, and brightness sliders provide keyboard alternatives to the color plane. A checkerboard reveals transparency. Invalid or incomplete input stays visible with an error and disables Add color. Cancel discards the draft and returns focus to Add color. Adding also restores focus to that action.
Saving selects the custom accent and retains its swatch in this browser. Up to 24 custom colors can be saved; each has a removal action. CMYK is an approximate screen conversion. The preview tooltip explains that interface shades adapt for readable contrast. Saved swatches preserve their original color and opacity. At the 24-color limit, Add color is disabled with a short removal instruction.
Mode and accent persist locally and apply before React mounts. Restricted storage still permits changes within the current session; appearance and custom-color persistence failures show local session-only messages with Retry storage or Retry colors. Synchronous appearance changes have no artificial loading or success delay. The fallback is light mode with Moss.

### New conversation defaults

Models contains Default model. Permissions contains Default permissions above saved workspace rules. These labeled selectors save defaults for the selected workspace. Model choices come from configured models; this task-specific choice is not decorative runtime metadata.
Default permissions offers Require permissions and YOLO — skip approvals. Changes apply only to new conversations; existing conversations retain their settings. Initial reads use stable skeletons. Each save updates only its field and disables both defaults while pending, with a local spinner. A failed write restores the confirmed selection; Retry repeats the attempted write. Read errors have a disabled Unavailable selector and Retry. An empty model catalog shows a disabled No models configured selector. Selection communicates success without an idle saved label.
Harness documentation remains accessible from the command menu. The [settings study](docs/design/settings/STUDY.md) records the interaction contract and evidence limits.

### Workspace Learning

Learning is a local extension of the incumbent system. Its native dialog identifies the workspace in its title. Files remains a separate inspector task. Use the existing neutral surfaces, accent selection, focus outlines, and functional icons; the larger reader does not establish a new global type or spacing scale.

The desktop dialog is at most 1200px wide and 900px tall, with 48px removed from each viewport dimension before those caps apply. It has a local 12px corner radius, no outline, a `0 24px 80px #0005` overlay shadow, and a `#0008` backdrop. The header and assignment stay above a 280px library rail and a flexible reader. The rail and document scroll independently; the reader heading, content switches, and decision footer remain outside document scrolling. Assignment and footer regions cap their height at 40% and scroll when needed.

At viewport widths of 700px and below, or heights of 600px and below, the dialog fills the dynamic viewport with square corners. The list uses the available width until a document is selected. Selection hides assignment and library; Back to skills restores the list and its selected control's focus. Reader side padding drops from 32px to 16px. The footer retains its decisions, gives both buttons equal width and at least 40px height, and respects the bottom safe area. At viewport widths of 600px and below the workspace header wraps to keep the Learning entry available.

The dialog title is 18px on desktop and 16px in the single-pane layout. The document title is 22px and 20px respectively; at viewport heights of 600px and below it becomes 18px with tighter vertical padding. Markdown uses Manrope at 15px with a 1.75 line height; the panel paragraph rule supplies 1.6 line height for paragraphs. Reader children have a maximum width of 75ch. Markdown heading levels are lowered beneath the document title, with the first three rendered heading sizes at 19px, 17px, and 16px. Source stays in IBM Plex Mono. Preformatted blocks and tables scroll horizontally inside the reader; images stay within its width. YAML frontmatter is available through the initially collapsed Skill metadata disclosure.

A saved Learning space appears as a compact summary with Change space. The editor provides an explicit Save and Cancel, explains that existing conversations retain their assignment, and preserves failed-save drafts. While editing, Learn and Skill navigation are hidden until Save or Cancel resolves the draft. Loading and failed assignment reads disable the selector. Empty spaces explain how to create a space and refresh; Off for new conversations remains an explicit choice.

Learn describes its shared-space scope, reports starting and run status beside its action, and disables duplicate starts during pending requests, active runs, or unavailable status. One Refresh skills control beside list navigation refreshes workspace Learning and Skill reads, including run status, and clears the failed-start message. Local Retry controls remain beside failed reads. Review skills and Published skills use pressed states with the existing soft accent fill; selected rows use the same treatment. Row titles wrap, and description previews stop after two lines. Repeated generated trigger and exclusion prefixes are normalized for display only; stored descriptions, Markdown, and frontmatter remain intact. List and unselected-reader messages distinguish loading, failure, empty, and populated states. Do not instruct the reader to choose a document when the list has none.

Proposal instructions and supporting evidence have separate controls. Loading content, local errors with Retry, missing instruction files, missing supporting insights, and unavailable source conversations receive explicit text. Published Skills open without proposal decisions. The decision footer names the publishing or removal destination. Reject skill stays neutral; Approve skill uses the primary accent. Saving review replaces the contextual text without adding a third footer item, preserving the action pair's position. Both decisions disable during the write and uncertain-state refresh; confirmed approval or rejection replaces the decisions with the outcome. After a failed decision and failed state refresh, a successful proposal Retry clears the stale mutation error before decisions become available again.

Opening focuses the dialog heading without scrolling. Selecting a document focuses its heading; the document scroll region is keyboard focusable. Native modal behavior contains interaction, and Close Learning or Escape restores entry focus. Refresh skills disables while relevant workspace queries fetch or a Learning start is pending. The dialog opens without animation; state changes do not animate document layout.

The [refinement documentation evidence](docs/design/learning-refinement/DOCUMENTATION.md) records the current source facts and capture paths. The [original dialog evidence](docs/design/learning-dialog/DOCUMENTATION.md) remains historical. The generated state study is illustrative, not an approved comp or a source of new global tokens.

## Do's and Don'ts

### Do:

- Do use spacing and alignment before any line or wrapper; justify functional exceptions.
- Do keep accessible names on icon controls and keyboard access on every action.
- Do use explicit text for approvals, destructive choices, errors, and ambiguous actions.
- Do verify both themes, System mode, all eight presets, custom colors and opacity, narrow screens, reduced motion, and meaningful loading and error states.
- Do preserve CopilotKit v2 message ownership, Router URL ownership, and Query read ownership.
- Do treat screenshots under docs/proof/ as historical evidence until checked against current code.

### Don't:

- Don't tint dark neutral surfaces green or turn the subtle blue trace into a blue theme.
- Don't display branding, decorative model/container identifiers, idle status, or repeated headings in the working UI. Keep model choices where they serve a task.
- Don't add decorative left accent stripes, gradients, or shadows to ordinary tool results.
- Don't frame every event or region as a card, or add explanatory labels to every control.
- Don't use oversized whitespace or marketing typography in workspace panels.
- Don't invent line numbers, elapsed time, success states, or other backend facts.
- Don't equate a clean source detector scan with visual or accessibility proof.
