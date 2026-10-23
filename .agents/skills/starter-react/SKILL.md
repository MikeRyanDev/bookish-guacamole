---
name: starter-react
description: Build or review this starter browser UI, its routing, queries, accessibility, and tool rendering.
---

Use only `@copilotkit/react-core/v2` for CopilotKit React APIs. CopilotKit owns the transcript and interrupts; do not copy messages into React state or add TanStack useChat beside it. Register a private thread agent before mounting hooks that resolve it.

TanStack Router owns thread, panel, and file selections. TanStack Query owns workspace files and published Skills. React owns drafts and transient controls. Derive values during render; use effects only to synchronize external systems. Pass query AbortSignals to fetch. Prefer named functional components and typed props. Use the installed versions and types.

Read the applicable Vercel React rules in `../vercel-react-best-practices/rules/`. This is a Vite SPA: use React.lazy rather than Next.js APIs, and TanStack Query rather than SWR. Next.js server-component rules do not apply.

Use IconButton for named, focus-visible actions. Retain text for permission decisions and errors. Preserve keyboard access, reduced motion, light/dark contrast, mobile side panels, and honest disabled/loading/error states. Test browser behavior with `pnpm test:e2e`; run axe in both themes and inspect screenshots. Never use a mock transcript as real model proof.
