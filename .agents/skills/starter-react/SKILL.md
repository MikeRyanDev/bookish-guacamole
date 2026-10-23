---
name: starter-react
description: Build or review this starter browser UI, its routing, queries, accessibility, and tool rendering.
---

Use only `@copilotkit/react-core/v2` for CopilotKit React APIs. CopilotKit owns the transcript and interrupts; do not copy messages into React state or add TanStack useChat beside it. Register a private thread agent before mounting hooks that resolve it.

TanStack Router owns thread, panel, and file selections. TanStack Query owns workspace files and published Skills. React owns drafts and transient controls. Derive values during render; use effects only to synchronize external systems. Pass query AbortSignals to fetch. Prefer named functional components and typed props. Use the installed versions and types.

Read `../react-practices/SKILL.md` for React state, effects, identity, and performance guidance drawn from React’s official documentation. This is a Vite SPA; use React.lazy and TanStack Query with the installed package APIs.

Use IconButton for named, focus-visible actions. Retain text for permission decisions and errors. Preserve keyboard access, reduced motion, light/dark contrast, mobile side panels, and honest disabled/loading/error states. Test browser behavior with `pnpm test:e2e`; run axe in both themes and inspect screenshots. Never use a mock transcript as real model proof.
