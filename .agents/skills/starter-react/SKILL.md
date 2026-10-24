---
name: starter-react
description: Build or review this starter browser UI, its routing, queries, accessibility, and tool rendering.
---

Use only `@copilotkit/react-core/v2` for CopilotKit React APIs. CopilotKit owns the transcript and interrupts; do not copy messages into React state or add TanStack useChat beside it. Register a private thread agent before mounting hooks that resolve it.

TanStack Router owns thread, panel, and file selections. TanStack Query owns workspace files and published Skills. React owns drafts and transient controls. Derive values during render; use effects only to synchronize external systems. Pass query AbortSignals to fetch. Prefer named functional components and typed props. Use the installed versions and types.

Read `../react-practices/SKILL.md` for React state, effects, identity, and performance guidance drawn from React’s official documentation. This is a Vite SPA; use React.lazy and TanStack Query with the installed package APIs.

Use IconButton for named, focus-visible actions. Retain text for permission decisions and errors. Preserve keyboard access, reduced motion, light/dark contrast, mobile side panels, and honest disabled/loading/error states. Test browser behavior with `pnpm test:e2e`; run axe in both themes and inspect screenshots. Never use a mock transcript as real model proof.

For visual design work, also read `../impeccable/SKILL.md`, root `PRODUCT.md`, and root `DESIGN.md`. Preserve the incumbent compact workspace and use `pnpm design:check` plus rendered browser verification.

Start without borders, dividers, or card wrappers. Use spacing and alignment first; add a rule only for a concrete usability need that cannot otherwise be met. Keep keyboard focus visible. Avoid persistent framework branding, model/container metadata, redundant status, and repeated headings. Dark neutral surfaces have only a trace of blue and no green cast; accent colors do not tint the neutral palette.

For new or changed workflows, control meaning, or feature discovery, follow [interaction review](references/interaction-review.md) before implementation and delivery. It requires concrete labels and click outcomes, a fresh task-first usability review, and separate usability, visual, and technical evidence. Styling-only edits retain the existing visual checks.
