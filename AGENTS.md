<!-- intent-skills:start -->
# TanStack Intent - before editing files, run the matching guidance command.
tanstackIntent:
  - id: "@tanstack/ai#ai-core"
    run: "pnpm exec intent load @tanstack/ai#ai-core"
    for: "Entry point for TanStack AI skills. Routes to chat-experience, tool-calling, media-generation, structured-outputs, adapter-configuration, ag-ui-protocol, middleware, locks, custom-backend-integration, and debug-logging, plus the skills shipped by companion packages (@tanstack/ai-persistence, @tanstack/ai-code-mode), and computer use (@tanstack/ai-computer-use). Use chat() not streamText(), openaiText() not createOpenAI(), toServerSentEventsResponse() not manual SSE, middleware hooks not onEnd callbacks."
  - id: "@tanstack/ai#ai-core/adapter-configuration"
    run: "pnpm exec intent load @tanstack/ai#ai-core/adapter-configuration"
    for: "Provider adapter selection and configuration: openaiText, anthropicText, geminiText, ollamaText, grokText, groqText, openRouterText, bedrockText, byteplusText, openaiCompatible. Per-model type safety with modelOptions, reasoning/thinking configuration, runtime adapter switching, extendAdapter() for custom models, createModel(). Generic OpenAI-compatible providers (DeepSeek, Together, Fireworks, etc.) via openaiCompatible({ baseURL, apiKey, models }) from @tanstack/ai-openai/compatible. API key env vars: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY/GEMINI_API_KEY, XAI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, OLLAMA_HOST, BEDROCK_API_KEY (or AWS_BEARER_TOKEN_BEDROCK). BytePlus needs TWO keys: ARK_API_KEY (ModelArk — chat/video/image) and BYTEPLUS_VOICE_API_KEY (Seed Speech — TTS/transcription); neither is a fallback for the other."
  - id: "@tanstack/ai#ai-core/ag-ui-protocol"
    run: "pnpm exec intent load @tanstack/ai#ai-core/ag-ui-protocol"
    for: "Server-side AG-UI streaming protocol implementation: StreamChunk event types (RUN_STARTED, TEXT_MESSAGE_START/CONTENT/END, TOOL_CALL_START/ARGS/END, RUN_FINISHED, RUN_ERROR, REASONING_*, STATE_SNAPSHOT/DELTA, CUSTOM), toServerSentEventsStream() for SSE format, toHttpStream() for NDJSON format. For backends serving AG-UI events without client packages."
  - id: "@tanstack/ai#ai-core/chat-experience"
    run: "pnpm exec intent load @tanstack/ai#ai-core/chat-experience"
    for: "End-to-end chat implementation: server endpoint with chat() and toServerSentEventsResponse(), client-side useChat hook with fetchServerSentEvents(), message rendering with UIMessage parts, multimodal content, thinking/reasoning display. Covers streaming states, connection adapters, and message format conversions. NOT Vercel AI SDK — uses chat() not streamText()."
  - id: "@tanstack/ai#ai-core/client-persistence"
    run: "pnpm exec intent load @tanstack/ai#ai-core/client-persistence"
    for: "Browser chat persistence on useChat / ChatClient: localStoragePersistence, sessionStoragePersistence, indexedDBPersistence. Client-authoritative (adapter, full transcript) vs server-authoritative (persistence: true, no client cache). Reload restore, pending interrupts, mid-stream rejoin with delivery durability. Use for SPA reload durability — NOT server history alone. Also covers generation hooks (useGenerateImage etc.), which take only the server-driven mode: persistence: true hydrates the last generation for the (REQUIRED) threadId from the server on mount and repaints status/result/error, nothing is cached in the browser. No extra package: the adapters ship in the framework packages."
  - id: "@tanstack/ai#ai-core/custom-backend-integration"
    run: "pnpm exec intent load @tanstack/ai#ai-core/custom-backend-integration"
    for: "Connect useChat to a non-TanStack-AI backend through custom connection adapters. ConnectConnectionAdapter (single async iterable) vs SubscribeConnectionAdapter (separate subscribe/send). Customize fetchServerSentEvents() and fetchHttpStream() with auth headers, custom URLs, and request options. Import from framework package, not @tanstack/ai-client."
  - id: "@tanstack/ai#ai-core/debug-logging"
    run: "pnpm exec intent load @tanstack/ai#ai-core/debug-logging"
    for: "Pluggable, category-toggleable debug logging for TanStack AI activities. Toggle with `debug: true | false | DebugConfig` on chat(), summarize(), generateImage(), generateSpeech(), generateTranscription(), generateVideo(). Categories: request, provider, output, middleware, tools, agentLoop, config, errors. Pipe into pino/winston/etc via `debug: { logger }`. Errors log by default even when `debug` is omitted; silence with `debug: false`."
  - id: "@tanstack/ai#ai-core/locks"
    run: "pnpm exec intent load @tanstack/ai#ai-core/locks"
    for: "LockStore, InMemoryLockStore, LocksCapability and withLocks for multi-instance coordination in TanStack AI. Ships in @tanstack/ai — NOT in @tanstack/ai-persistence. Separate from AIPersistence state stores — not a stores key, not composable. InMemoryLockStore vs a distributed (e.g. Cloudflare Durable Object) lock, lease recovery, AbortSignal in critical sections. Use when sandbox or other middleware needs cross-worker mutual exclusion — NOT for storing messages/runs (use withPersistence)."
  - id: "@tanstack/ai#ai-core/media-generation"
    run: "pnpm exec intent load @tanstack/ai#ai-core/media-generation"
    for: "Image, audio, video, speech (TTS), and transcription generation using activity-specific adapters: generateImage() with openaiImage/geminiImage/byteplusImage, generateAudio() with geminiAudio/falAudio, generateVideo() with async polling (openaiVideo/geminiVideo/grokVideo/falVideo/byteplusVideo/openRouterVideo, per-model typed durations), generateSpeech() with openaiSpeech/byteplusSpeech/elevenlabsSpeech, generateTranscription() with openaiTranscription/byteplusTranscription, generateVoice() with elevenlabsVoiceDesign (create a voice, then speak with it). React hooks: useGenerateImage, useGenerateAudio, useGenerateSpeech, useTranscription, useGenerateVideo. TanStack Start server function integration with toServerSentEventsResponse."
  - id: "@tanstack/ai#ai-core/middleware"
    run: "pnpm exec intent load @tanstack/ai#ai-core/middleware"
    for: "Chat lifecycle middleware hooks: onConfig, onStart, onChunk, onBeforeToolCall, onAfterToolCall, onUsage, onFinish, onAbort, onError. Use for analytics, event firing, tool caching (toolCacheMiddleware), logging, and tracing. Middleware array in chat() config, left-to-right execution order. NOT onEnd/onFinish callbacks on chat() — use middleware."
  - id: "@tanstack/ai#ai-core/structured-outputs"
    run: "pnpm exec intent load @tanstack/ai#ai-core/structured-outputs"
    for: "Type-safe JSON schema responses from LLMs using outputSchema on chat() and useChat(). Supports Zod, ArkType, and Valibot schemas. The adapter handles provider-specific strategies transparently — never configure structured output at the provider level. Pass stream:true alongside outputSchema for incremental JSON deltas + a completed typed object via the `structured-output.complete` event. Each successfully completed structured-output run adds a typed `StructuredOutputPart` to message history. partial/final derive from the most recent structured-output part after the latest user message. convertSchemaToJsonSchema() for manual schema conversion."
  - id: "@tanstack/ai#ai-core/tool-calling"
    run: "pnpm exec intent load @tanstack/ai#ai-core/tool-calling"
    for: "Isomorphic tool system: toolDefinition() with Zod schemas, .server() and .client() implementations, passing tools to both chat() on server and useChat/clientTools on client, tool approval flows with needsApproval and bound interrupts (resolveInterrupt), generic middleware interrupts with defineInterrupt(), lazy tool discovery with lazy:true, rendering ToolCallPart and ToolResultPart in UI."
  - id: "@tanstack/ai-persistence#ai-persistence"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence"
    for: "Durability and state persistence for TanStack AI chats with @tanstack/ai-persistence. Routes to server chat persistence (withPersistence), client persistence (localStorage/IndexedDB), the store contracts, and adapter recipes. Distinguishes delivery durability (resumable streams) from conversation state. Use when conversations must survive reloads, multi-device, approvals, or server restarts — NOT for stream reconnect alone."
  - id: "@tanstack/ai-persistence#ai-persistence/build-cloudflare-adapter"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/build-cloudflare-adapter"
    for: "Use when a Cloudflare Worker needs TanStack AI chat persistence — writes a chat-persistence.ts into the app against its D1 binding (raw or via Drizzle), plus a Durable Object LockStore. Covers per-request bindings, wrangler config, D1 migrations, and lease-based locks."
  - id: "@tanstack/ai-persistence#ai-persistence/build-cloudflare-artifact-store"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/build-cloudflare-artifact-store"
    for: "Use when a Cloudflare Worker needs durable byte storage for TanStack AI generated media (images, audio, video, transcripts) — writes a BlobStore backed by R2 and an ArtifactStore backed by D1, composes them onto the generation persistence so withGenerationPersistence persists artifact bytes, and serves them back from a Worker GET route. Includes one-line sketches for S3, GCS, Vercel Blob, Supabase, and a dev filesystem BlobStore."
  - id: "@tanstack/ai-persistence#ai-persistence/build-custom-adapter"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/build-custom-adapter"
    for: "Use when an app needs TanStack AI chat persistence on a database with no dedicated recipe — raw Postgres (pg/postgres.js), Kysely, node:sqlite, MongoDB, Supabase, Redis. Writes a chat-persistence.ts against the app's existing client, covering the four stores, the idempotency invariants, and the conformance gate. Route to the Drizzle, Prisma, or Cloudflare skills instead when one of those matches."
  - id: "@tanstack/ai-persistence#ai-persistence/build-drizzle-adapter"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/build-drizzle-adapter"
    for: "Use when an app already runs Drizzle ORM and needs TanStack AI chat persistence — writes a chat-persistence.ts into the app against its existing db handle, schema file, and drizzle-kit journal. Covers the four tables (SQLite/Postgres/MySQL), the onConflict idempotency rules, JSON columns, and per-request bindings like D1."
  - id: "@tanstack/ai-persistence#ai-persistence/build-prisma-adapter"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/build-prisma-adapter"
    for: "Use when an app already runs Prisma and needs TanStack AI chat persistence — writes a chat-persistence.ts into the app against its existing PrismaClient and schema.prisma. Covers the four models, BigInt timestamps, JSON-as-string columns, upsert-with-empty-update idempotency, and model renaming."
  - id: "@tanstack/ai-persistence#ai-persistence/server"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/server"
    for: "Server chat state with withPersistence from @tanstack/ai-persistence. Authoritative transcript, run lifecycle, durable interrupts/approvals, chatParamsFromRequest, reconstructChat, snapshotStreaming. Use when the server owns history, multi-device, or durable tool approvals. NOT client localStorage (see ai-core/client-persistence in @tanstack/ai) and NOT stream reconnect alone."
  - id: "@tanstack/ai-persistence#ai-persistence/stores"
    run: "pnpm exec intent load @tanstack/ai-persistence#ai-persistence/stores"
    for: "Implement the MessageStore, RunStore, InterruptStore, MetadataStore contracts for @tanstack/ai-persistence against any database. defineAIPersistence, composePersistence overrides, critical invariants (full-replace saveThread, optional loadThread limit/before hint, insert-if-absent createOrResume and interrupt create), authorize thread access, runPersistenceConformance testkit. Use whenever you need server persistence — the package ships contracts, not a backend for your database."
  - id: "@tanstack/react-router#compositions/router-query"
    run: "pnpm exec intent load @tanstack/react-router#compositions/router-query"
    for: "Integrating TanStack Router with TanStack Query: queryClient in router context, static queries and fire-and-forget queries in loaders, useSuspenseQuery in components, defaultPreloadStaleTime: 0, setupRouterSsrQueryIntegration for SSR dehydration/hydration and streaming, per-request QueryClient isolation."
  - id: "@tanstack/react-router#lifecycle/migrate-from-react-router"
    run: "pnpm exec intent load @tanstack/react-router#lifecycle/migrate-from-react-router"
    for: "Step-by-step migration from React Router v7 to TanStack Router: route definition conversion, Link/useNavigate API differences, useSearchParams to validateSearch + useSearch, useParams with from, Outlet replacement, loader conversion, code splitting differences."
  - id: "@tanstack/react-router#react-router"
    run: "pnpm exec intent load @tanstack/react-router#react-router"
    for: "React bindings for TanStack Router: RouterProvider, useRouter, useRouterState, useMatch, useMatches, useLocation, useSearch, useParams, useNavigate, useLoaderData, useLoaderDeps, useRouteContext, useBlocker, useCanGoBack, Link, Navigate, Outlet, CatchBoundary, ErrorComponent. React-specific patterns for hooks, providers, SSR hydration, and createLink with forwardRef."
  - id: "@tanstack/router-core#router-core"
    run: "pnpm exec intent load @tanstack/router-core#router-core"
    for: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
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

| Work | Read |
| --- | --- |
| React UI, URL/query state, accessibility | `.agents/skills/starter-react/SKILL.md` and relevant Vercel React rule files |
| Harness, bridge, permissions, Learning | `.agents/skills/starter-runtime/SKILL.md` plus the matching Intent command above |
| Tests, setup, release proof | `.agents/skills/starter-verification/SKILL.md` |

The package mappings above are generated by `pnpm skills:sync`. See docs/AGENT-SKILLS.md for source versions and boundaries. React code uses **only `@copilotkit/react-core/v2`**. Generic TanStack chat examples do not override that requirement. CopilotKit owns messages; Router owns URL selections; Query owns server reads.

Use published pinned packages. The harness is experimental: inspect installed source before changing the bridge. Keep the required path through CLI-installed Intelligence and real Learning. SQLite stores only harness execution state. Keep credentials, raw logs, traces, and workspace edits ignored.

Write a failing regression test before behavior fixes. Run `pnpm check`, `node --test example/greet.test.js`, and affected browser tests. Live model proof requires explicit authorization for model use; the active starter task already authorizes it. Record actual commands and separate deterministic tests from real backend evidence.

`pnpm dev` serves the browser at http://127.0.0.1:4173. The CopilotKit CLI provisions the backend; there is no terminal chat frontend. Keep temporary image overrides opt-in and removable under docs/TEMPORARY-INTELLIGENCE.md. Never change production/shared environments as part of local starter validation.
