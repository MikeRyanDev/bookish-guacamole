# Frontend maintenance

## Style ownership

`src/client/styles.css` contains global tokens, element defaults, reduced-motion
rules, and shared animation definitions. Feature styles live in
`src/client/styles/*.module.css`. Components import their class names directly.
Do not add unscoped application classes to the global stylesheet.

Each module owns one feature: workspace, transcript, composer, tools, files,
appearance, permissions, capabilities, settings, or Learning. `shared.module.css`
owns shared controls, text utilities, and named composition slots. An empty slot
class has no appearance by itself; a parent feature can use it in a selector.

Use explicit CSS Modules `@value` imports when a parent must target a child slot.
Keep dependencies directed from the parent to the child. Do not use `:global`
escapes or copy shared class definitions. Give an intentional parent override
sufficient specificity to remain independent of stylesheet arrival order.

`css-modules.config.ts` gives classes a stable feature prefix. Feature filenames
must be unique. The app and browser fixtures share this configuration. Layout
tests can use these scoped names; interaction tests prefer accessible roles.

After changing module exports, run:

```sh
pnpm styles:types
pnpm check
pnpm test:fixtures
```

The generator reads Vite's actual exports, including imported slots. Commit the
generated declarations. `pnpm styles:check` rejects stale declarations, and
TypeScript rejects missing class references. Do not edit generated declarations.

## Component boundaries

The Learning panel owns space assignment. `learning-space.tsx` owns the Skill
lists and run state. `learning-candidate.tsx` owns review decisions and evidence.
`learning-reader.tsx` owns document rendering and focus. Shared query builders
keep workspace and space identities in the same cache keys.

Connection settings owns server reads and mutations. `connection-editor.tsx`
owns the edit form and its validation. These splits preserve the existing state
owners and request contracts.

Settings and the Learning panel load on demand. Their dialog controls remain
mounted while code loads. `DeferredPanel` shows loading or recovery text within
the dialog. A failed download offers an explicit app reload. Closing the dialog
remains available, including during a slow download.

## Bundle analysis

```sh
pnpm analyze:bundle
```

This command writes `.data/bundle-report.json`. It measures all JavaScript chunks
in the entry's static import graph, both raw and gzip-compressed. Dynamic entries
appear separately. Package attribution uses original source bytes from source
maps; those numbers are not minified package sizes or runtime measurements.

The analysis build writes source maps to ignored `dist/`. Run `pnpm build` before
serving production output to remove those diagnostic maps.

The cleanup baseline had a entry chunk of about 2.56 MB, or 737 KB gzip.
Source-map analysis identified Zod, React DOM, KaTeX, and CopilotKit as the largest
source contributors. Settings and Learning are optional application features, so
they now load only when opened. The SDK still brings substantial shared code.
The Inspector remains enabled, and all CopilotKit React imports remain on `/v2`.
No package internals, aliases, or disabled runtime features hide that cost.
After the split, the complete startup JavaScript graph measures about 2.54 MB,
or 730 KB gzip. This is a modest reduction of about one percent, not a large
startup performance gain. Optional code moves into separate Settings and Learning
entries. CSS Modules also add scoped class names and some shared CSS overhead.
The exact measured startup graph is 2,541,376 bytes, or 729,849 bytes gzip.

The build still warns about large chunks. Splitting a vendor file alone does not
reduce startup downloads. Use the report's complete static graph to assess future
changes. Bundle sizes do not establish a user-visible performance improvement.

## Continuous integration

`.github/workflows/check.yml` runs on pull requests and pushes to `main`. It uses
Node 22.22.2, 24.15.0, and 26.x. Each job performs a frozen install, the starter
checks, formatting, the greeting test, and deterministic Chromium fixtures.
The workflow uses pinned action commits and read-only repository permissions.

`playwright.fixtures.config.ts` lists tests that need no Intelligence backend or
model credentials. The regular Playwright configuration retains connected and
live tests. Mixed files tag backend-only cases with `@connected`; the fixture
configuration excludes that tag. CI does not claim live model or Learning acceptance. Existing tests
still write some review screenshots into documentation paths; that separate
cleanup remains on the release checklist.
