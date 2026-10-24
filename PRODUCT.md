# TanStack Coding Starter

## Purpose and audience

This starter helps experienced developers build a local coding agent with TanStack AI, CopilotKit React v2, and CopilotKit Intelligence.
Developers inspect files, discuss changes, review commands and patches, and approve tool calls in a browser workspace.

## Operating context

The app serves one trusted local developer at `http://127.0.0.1:4173`.
The CLI installs Intelligence. Provider credentials stay on the server.
Approved shell commands can access the host. The workspace is not a sandbox.

## Core tasks

- Open or create a named workspace and select a saved conversation.
- Ask the agent to inspect code and propose changes.
- Review each command, patch, or file operation before approval.
- Follow streaming output, or scroll back without losing the reading position.
- Inspect files and published Skills beside the conversation.
- Review Learning evidence in Intelligence and reuse approved lessons on later turns.

## Constraints and voice

Keep the experience compact, minimal, and suited to frequent developer use.
Use short, direct labels. Keep explicit text for approvals, destructive choices, errors, and ambiguous actions.
Keep framework branding and decorative runtime identifiers out of the working UI. Task-specific model choices belong in Settings. Show status where an active task requires it, without idle or repeated labels.
Use spacing and alignment before containers. Borders and dividers require a specific usability reason; ordinary panes, dialogs, and controls do not need outlines.
Support keyboard navigation, narrow screens, reduced motion, and light and dark themes.
Settings opens to Appearance, with Models and Permissions in a persistent left category menu. Labels remain visible on narrow screens; only the selected content pane scrolls. Category changes preserve an unfinished color draft; closing Settings discards it.
Appearance offers Light, Dark, and System appearance modes, eight warm vintage-rainbow presets, and saved custom colors entered as RGBA, HSV, CMYK, or HEX. Appearance choices and custom colors persist in this browser. Custom swatches retain opacity; the interface derives readable accent shades for each theme.
Settings also saves default permissions and a configured default model for new conversations in each workspace. Existing conversations retain their settings. Loading, saving, empty, disabled, and error states stay beside the affected controls. Failed saves retain the confirmed choice and offer Retry; saved rules remain visible until removal succeeds.
State tool outcomes accurately. A failed command must never look successful.

CopilotKit v2 owns messages and interrupts. TanStack Router owns URL selections. TanStack Query owns server reads.
Repository skills guide developers editing this starter. Intelligence learned Skills guide the running coding agent.

## Evidence

[README.md](README.md) describes setup and user workflows.
[Architecture](docs/ARCHITECTURE.md) defines ownership and trust boundaries.
[IMPROVEMENTS.md](IMPROVEMENTS.md) contains the user's requirements and remains user-owned.
[The browser delivery plan](docs/IMPROVEMENTS-PLAN.md) records the component inventory and design studies.
[DESIGN.md](DESIGN.md#confirmed-design-taste) separates confirmed workspace taste from current implementation choices.
[Verification](docs/VERIFICATION.md) separates deterministic checks from real model evidence.
