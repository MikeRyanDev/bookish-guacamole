<!-- intent-skills:start -->
# TanStack Intent - before editing files, run the matching guidance command.
tanstackIntent:
  - id: "@tanstack/ai#ai-core"
    run: "pnpm exec intent load @tanstack/ai#ai-core"
    for: "Entry point for TanStack AI skills."
  - id: "@tanstack/ai#ai-core/adapter-configuration"
    run: "pnpm exec intent load @tanstack/ai#ai-core/adapter-configuration"
    for: "Provider adapter selection and configuration: openaiText, anthropicText, geminiText, ollamaText, grokText, groqText, openRouterText, bedrockText, byteplusText, openaiCompatible."
  - id: "@tanstack/ai#ai-core/ag-ui-protocol"
    run: "pnpm exec intent load @tanstack/ai#ai-core/ag-ui-protocol"
    for: "Server-side AG-UI streaming protocol implementation: StreamChunk event types (RUN_STARTED, TEXT_MESSAGE_START/CONTENT/END, TOOL_CALL_START/ARGS/END, RUN_FINISHED, RUN_ERROR, REASONING_*, STATE_SNAPSHOT/DELTA, CUSTOM), toServerSentEventsStream() for SSE format, toHttpStream() for NDJSON format."
  - id: "@tanstack/ai#ai-core/chat-experience"
    run: "pnpm exec intent load @tanstack/ai#ai-core/chat-experience"
    for: "End-to-end chat implementation: server endpoint with chat() and toServerSentEventsResponse(), client-side useChat hook with fetchServerSentEvents(), message rendering with UIMessage parts, multimodal content, thinking/reasoning display."
  - id: "@tanstack/ai#ai-core/client-persistence"
    run: "pnpm exec intent load @tanstack/ai#ai-core/client-persistence"
    for: "Browser chat persistence on useChat / ChatClient: localStoragePersistence, sessionStoragePersistence, indexedDBPersistence."
  - id: "@tanstack/ai#ai-core/custom-backend-integration"
    run: "pnpm exec intent load @tanstack/ai#ai-core/custom-backend-integration"
    for: "Connect useChat to a non-TanStack-AI backend through custom connection adapters."
  - id: "@tanstack/ai#ai-core/debug-logging"
    run: "pnpm exec intent load @tanstack/ai#ai-core/debug-logging"
    for: "Pluggable, category-toggleable debug logging for TanStack AI activities."
  - id: "@tanstack/ai#ai-core/locks"
    run: "pnpm exec intent load @tanstack/ai#ai-core/locks"
    for: "LockStore, InMemoryLockStore, LocksCapability and withLocks for multi-instance coordination in TanStack AI."
  - id: "@tanstack/ai#ai-core/media-generation"
    run: "pnpm exec intent load @tanstack/ai#ai-core/media-generation"
    for: "Image, audio, video, speech (TTS), and transcription generation using activity-specific adapters: generateImage() with openaiImage/geminiImage/byteplusImage, generateAudio() with geminiAudio/falAudio, generateVideo() with async polling (openaiVideo/geminiVideo/grokVideo/falVideo/byteplusVideo/openRouterVideo, per-model typed durations), generateSpeech() with openaiSpeech/byteplusSpeech/elevenlabsSpeech, generateTranscription() with openaiTranscription/byteplusTranscription, generateVoice() with elevenlabsVoiceDesign (create a voice, then speak with it)."
  - id: "@tanstack/ai#ai-core/middleware"
    run: "pnpm exec intent load @tanstack/ai#ai-core/middleware"
    for: "Chat lifecycle middleware hooks: onConfig, onStart, onChunk, onBeforeToolCall, onAfterToolCall, onUsage, onFinish, onAbort, onError."
  - id: "@tanstack/ai#ai-core/structured-outputs"
    run: "pnpm exec intent load @tanstack/ai#ai-core/structured-outputs"
    for: "Type-safe JSON schema responses from LLMs using outputSchema on chat() and useChat()."
  - id: "@tanstack/ai#ai-core/tool-calling"
    run: "pnpm exec intent load @tanstack/ai#ai-core/tool-calling"
    for: "Isomorphic tool system: toolDefinition() with Zod schemas, .server() and .client() implementations, passing tools to both chat() on server and useChat/clientTools on client, tool approval flows with needsApproval and bound interrupts (resolveInterrupt), generic middleware interrupts with defineInterrupt(), lazy tool discovery with lazy:true, rendering ToolCallPart and ToolResultPart in UI."
  - id: "@tanstack/ai-persistence#ai-persistence"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence"
    for: "Durability and state persistence for TanStack AI chats with @tanstack/ai-persistence."
  - id: "@tanstack/ai-persistence#ai-persistence/build-cloudflare-adapter"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/build-cloudflare-adapter"
    for: "Use when a Cloudflare Worker needs TanStack AI chat persistence — writes a chat-persistence.ts into the app against its D1 binding (raw or via Drizzle), plus a Durable Object LockStore."
  - id: "@tanstack/ai-persistence#ai-persistence/build-cloudflare-artifact-store"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/build-cloudflare-artifact-store"
    for: "Use when a Cloudflare Worker needs durable byte storage for TanStack AI generated media (images, audio, video, transcripts) — writes a BlobStore backed by R2 and an ArtifactStore backed by D1, composes them onto the generation persistence so withGenerationPersistence persists artifact bytes, and serves them back from a Worker GET route."
  - id: "@tanstack/ai-persistence#ai-persistence/build-custom-adapter"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/build-custom-adapter"
    for: "Use when an app needs TanStack AI chat persistence on a database with no dedicated recipe — raw Postgres (pg/postgres.js), Kysely, node:sqlite, MongoDB, Supabase, Redis."
  - id: "@tanstack/ai-persistence#ai-persistence/build-drizzle-adapter"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/build-drizzle-adapter"
    for: "Use when an app already runs Drizzle ORM and needs TanStack AI chat persistence — writes a chat-persistence.ts into the app against its existing db handle, schema file, and drizzle-kit journal."
  - id: "@tanstack/ai-persistence#ai-persistence/build-prisma-adapter"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/build-prisma-adapter"
    for: "Use when an app already runs Prisma and needs TanStack AI chat persistence — writes a chat-persistence.ts into the app against its existing PrismaClient and schema.prisma."
  - id: "@tanstack/ai-persistence#ai-persistence/server"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/server"
    for: "Server chat state with withPersistence from @tanstack/ai-persistence."
  - id: "@tanstack/ai-persistence#ai-persistence/stores"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/stores"
    for: "Implement the MessageStore, RunStore, InterruptStore, MetadataStore contracts for @tanstack/ai-persistence against any database."
  - id: "@tanstack/ai-skills#ai-skills"
    run: "pnpm exec intent load @tanstack/ai-skills#ai-skills"
    for: "Portable Agent Skills (SKILL.md) for TanStack AI with @tanstack/ai-skills."
  - id: "@tanstack/react-router#compositions/router-query"
    run: "pnpm exec intent load @tanstack/react-router#compositions/router-query"
    for: "Integrating TanStack Router with TanStack Query: queryClient in router context, static queries and fire-and-forget queries in loaders, useSuspenseQuery in components, defaultPreloadStaleTime: 0, setupRouterSsrQueryIntegration for SSR dehydration/hydration and streaming, per-request QueryClient isolation."
  - id: "@tanstack/react-router#lifecycle/migrate-from-react-router"
    run: "pnpm exec intent load @tanstack/react-router#lifecycle/migrate-from-react-router"
    for: "Step-by-step migration from React Router v7 to TanStack Router: route definition conversion, Link/useNavigate API differences, useSearchParams to validateSearch + useSearch, useParams with from, Outlet replacement, loader conversion, code splitting differences."
  - id: "@tanstack/react-router#react-router"
    run: "pnpm exec intent load @tanstack/react-router#react-router"
    for: "React bindings for TanStack Router: RouterProvider, useRouter, useRouterState, useMatch, useMatches, useLocation, useSearch, useParams, useNavigate, useLoaderData, useLoaderDeps, useRouteContext, useBlocker, useCanGoBack, Link, Navigate, Outlet, CatchBoundary, ErrorComponent."
  - id: "@tanstack/router-core#router-core"
    run: "pnpm exec intent load @tanstack/router-core#router-core"
    for: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions."
  - id: "@tanstack/router-core#router-core/auth-and-guards"
    run: "pnpm exec intent load @tanstack/router-core#router-core/auth-and-guards"
    for: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
  - id: "@tanstack/router-core#router-core/code-splitting"
    run: "pnpm exec intent load @tanstack/router-core#router-core/code-splitting"
    for: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
  - id: "@tanstack/router-core#router-core/data-loading"
    run: "pnpm exec intent load @tanstack/router-core#router-core/data-loading"
    for: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
  - id: "@tanstack/router-core#router-core/navigation"
    run: "pnpm exec intent load @tanstack/router-core#router-core/navigation"
    for: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
  - id: "@tanstack/router-core#router-core/not-found-and-errors"
    run: "pnpm exec intent load @tanstack/router-core#router-core/not-found-and-errors"
    for: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
  - id: "@tanstack/router-core#router-core/path-params"
    run: "pnpm exec intent load @tanstack/router-core#router-core/path-params"
    for: "Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
  - id: "@tanstack/router-core#router-core/search-params"
    run: "pnpm exec intent load @tanstack/router-core#router-core/search-params"
    for: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
  - id: "@tanstack/router-core#router-core/ssr"
    run: "pnpm exec intent load @tanstack/router-core#router-core/ssr"
    for: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
  - id: "@tanstack/router-core#router-core/type-safety"
    run: "pnpm exec intent load @tanstack/router-core#router-core/type-safety"
    for: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
<!-- intent-skills:end -->

# Starter development

Read README.md, docs/ARCHITECTURE.md, and docs/VERIFICATION.md before changing behavior. Recheck IMPROVEMENTS.md during this delivery; it is user-owned.

## Choose guidance

For first-time setup, use `.agents/skills/setup/SKILL.md`. Coding and Learning model configuration are separate; see `docs/MODELS.md`.

| Work                                     | Read                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| React UI, URL/query state, accessibility | `.agents/skills/starter-react/SKILL.md` and `.agents/skills/react-practices/SKILL.md` |
| Harness, bridge, permissions, Learning   | `.agents/skills/starter-runtime/SKILL.md` plus the matching Intent command above      |
| Tests, setup, release proof              | `.agents/skills/starter-verification/SKILL.md`                                        |

The package mappings above are generated by `pnpm skills:sync`. See docs/AGENT-SKILLS.md for source versions and boundaries. React code uses **only `@copilotkit/react-core/v2`**. Generic TanStack chat examples do not override that requirement. CopilotKit owns messages; Router owns URL selections; Query owns server reads.

Use published pinned packages. The harness is experimental: inspect installed source before changing the bridge. Keep the required path through CLI-installed Intelligence and real Learning. SQLite stores only harness execution state. Keep credentials, raw logs, traces, and workspace edits ignored.

Write a failing regression test before behavior fixes. Run `pnpm check`, `node --test example/greet.test.js`, and affected browser tests. Live model proof requires explicit authorization for model use; the active starter task already authorizes it. Record actual commands and separate deterministic tests from real backend evidence.

`pnpm dev` serves the browser at http://127.0.0.1:4173. The CopilotKit CLI provisions the backend; there is no terminal chat frontend. Keep temporary image overrides opt-in and removable under docs/TEMPORARY-INTELLIGENCE.md. Never change production/shared environments as part of local starter validation.

## General engineering practices

### Before editing

- Implement changes in a dedicated Git worktree from the current intended base. Preserve unrelated work in other worktrees. After delivery checks pass, merge the completed work into local `main`. Verify the merged tree. Never force-push or discard unrelated changes.
- For HTTP APIs and server architecture, read `.agents/skills/starter-api/SKILL.md` and `docs/BACKEND-DESIGN.md`.

- Read the nearest `AGENTS.md` for each file you change.
- Inspect the relevant package scripts, tests, and a similar implementation before choosing an approach.
- Run commands from the repository root unless a guide specifies another directory.
- Preserve unrelated changes in the worktree. Keep each change focused on the requested outcome.

### Code and contracts

- Preserve strict TypeScript types and public return contracts. Prefer immutable updates.
- Isolate side effects from data transformations. Handle promise failures explicitly instead of silently discarding them.
- Document function contracts with clear TSDoc, including non-obvious constraints and side effects.
- Respect module ownership and dependency boundaries. Preserve public exports and observable behavior unless the task requires a contract change.
- Keep API errors consistent with existing contracts. Keep authorization scope explicit across requests, data access, and events.
- Use trusted authorization data for access decisions. Do not infer permissions from display-only profile data.
- Give new environment variables names that identify their purpose and owning component. Document their defaults and required values.

### Generated files and documentation

- Change generator inputs or scripts, then regenerate their outputs. Do not hand-edit generated files, including the Intent mappings in this file.
- Keep disposable build output and coverage artifacts out of source changes.
- Update documentation with changes to public APIs, CLI behavior, architecture, developer workflows, or security assumptions.
- Record durable architectural decisions in the repository documentation. Keep routine implementation details in code and review descriptions.

### Verification and delivery

- Run focused tests during development, including relevant error paths. Complete the required starter checks before delivery.
- For user-facing behavior changes, run the affected browser tests. Use current results as evidence, not historical reports.
- Review the final diff for unintended files, generated output changes, and sensitive content. Run `git diff --check`.
- Report the exact validation commands and results. Identify checks you did not run and explain why.
- When commits are requested, use focused Conventional Commits. Keep the main branch releasable.

### Clear communication

- Lead with the result or the next action. Use numbered steps for procedures with multiple actions.
- Use short sentences, familiar words, and active voice. Preserve technical terms when they are necessary for accuracy.
- State what changed and why in documentation, commit messages, and pull request descriptions. Remove claims that the evidence does not support.
- For errors, state the observed failure, the known cause, and the next diagnostic or corrective action.
- Keep progress reports focused on completed work, blockers, and the next step. Omit unrelated tangents and filler.

## Impeccable design tooling

For frontend design, critique, polish, or responsive work, read `.agents/skills/impeccable/SKILL.md` alongside the starter React guidance.
For new or changed interactions, follow `.agents/skills/starter-react/references/interaction-review.md`: show concrete controls and click outcomes before implementation, then run a fresh task-first usability review before visual finish review. Keep usability, visual, and technical verdicts separate. Passing tests cannot override confusing labels or misleading affordances.
Read `PRODUCT.md` for product constraints and `DESIGN.md` for the incumbent visual system. The user brief takes priority.
Default to no borders, dividers, or enclosing cards. Use spacing, alignment, and subtle surface changes first. Add a line only when a specific usability need cannot be met without it; document that reason. Focus indicators and necessary table rules are functional exceptions, not permission to outline panels and controls.
Keep persistent UI text tied to a task or decision. Do not display framework branding, model/container identifiers, idle status, or repeated headings as decoration. Preserve accessible names, errors, and explicit approval/destructive choices.
Dark surfaces must be deeper neutral charcoal with only a trace of blue, never green-tinted gray. Warm accents are separate from neutral surface tokens.
Run `pnpm design:check` for source changes and `pnpm design:browser` for rendered tool surfaces. Run affected browser tests too.
Codex and Claude edit hooks provide feedback where supported. The explicit check in `pnpm check` remains required.
Use `pnpm exec impeccable` for the pinned CLI. Live iteration is opt-in through the skill and targets `src/client/index.html`.
See `docs/IMPECCABLE.md` for investigation, commands, limits, and upgrades. These tools do not inject repository skills into the runtime agent.

## Temporary weekend stacks and previews

Before delivering a fix during the weekend alpha period, read [docs/WEEKEND-DELIVERY.md](docs/WEEKEND-DELIVERY.md).
Follow its native-stack, exact-commit preview publication, installed acceptance, and candidate-ledger requirements.
Read [MONDAY_CUTOVER_CHECKLIST.md](MONDAY_CUTOVER_CHECKLIST.md) before selecting a parent or publishing a candidate.
Verify the current remote stack tip instead of copying historical branch or artifact identities.
Keep upstream PRs unmerged and shared deployments unchanged during weekend delivery.

The final published starter requires a complete Git history rewrite from a reviewed, clean release tree.
Temporary weekend guidance, plans, preview artifacts, and development evidence must not appear anywhere in that final history.
The Monday checklist owns removal, external evidence archival, and the clean-history publication gate.
Do not rewrite history now. Follow the runbook's cutover approval boundary before a force-push or repository replacement.
Remove this temporary section and its runbook before final publication.
