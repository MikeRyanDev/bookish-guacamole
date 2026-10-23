---
name: react-practices
description: Implement or review React components, state, effects, component identity, and render performance in this Vite starter. Use alongside starter-react for the app's ownership and accessibility rules.
---

# React practices

This is locally authored guidance based on React's official documentation, not an official React-distributed skill. Source review: 2026-10-23. Read the linked primary source when a change needs more detail.

## State and data flow

Identify the owner of each value before adding state. Keep only values that cannot be computed from props, existing state, or the app's Router/Query/SDK stores. Derive filtered lists and selection labels during render. Keep drafts close to the controls that edit them; lift shared state only to the nearest common owner. See [Thinking in React](https://react.dev/learn/thinking-in-react).

For this starter, URL selections belong in Router, remote data in Query, and messages/interrupts in CopilotKit v2. Do not mirror those values in useState. Subscribe to the narrow value a component needs; keep provider configuration independent of thread navigation.

## Events and effects

Put user-triggered actions in event handlers. Use effects to synchronize an external system, such as a ResizeObserver or browser event listener. Include every reactive dependency and undo subscriptions in cleanup. Cancel stale requests through Query's AbortSignal. Do not chain effects to derive display state or suppress dependency checks to freeze old values. See [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect).

## Purity and identity

Keep renders free of side effects and treat props, state, and hook results as immutable. Call hooks at the top level of components or custom hooks. Define components at module scope. Use durable IDs as list keys; changing a key deliberately resets component state, so never key the whole workspace by the selected thread. See [Rules of React](https://react.dev/reference/rules) and [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state).

## Performance review

Measure the user-visible problem first: remounts, layout shifts, request waterfalls, or slow rendering. A render alone is not a bug. Use React Profiler and browser performance tools to locate expensive work. Apply memoization only where stable inputs avoid measured work; correctness must not depend on useMemo. See [Profiler](https://react.dev/reference/react/Profiler) and [useMemo](https://react.dev/reference/react/useMemo).

Use the existing TanStack Virtual transcript for large histories. Do not animate rows each time virtualization remounts them. Keep loading/error states local so a request does not replace the workspace shell. Load optional heavy UI with React.lazy only when its loading boundary preserves a usable page.

## Verify the interaction

Reproduce the failure before editing. Check keyboard use, Back/Forward, reload, empty/error/loading states, and reduced motion when relevant. Assert visible behavior and stable DOM identity where identity matters; do not count render calls as proof of a user-visible improvement. Use the commands and live-model boundaries in starter-verification.
