# File viewer study

## Job and evidence

Developers need to find a workspace file, understand its contents, and return to their conversation without losing context. This is an Operate/Read extension of the existing workspace. It preserves Manrope, Plex Mono, warm accents, neutral surfaces, and the no-line default.

Code inspection on 2026-10-23 found a flat, unsearchable file list followed by the selected file's preview. The entire list and preview share one scroll container in a 250–290px pane. Selection can push content below hundreds of entries. There are no reading controls, line references, Markdown rendering, copy actions, or local retry. These are heuristic findings, not participant research.

Reference review:

- [VS Code interface](https://code.visualstudio.com/docs/editing/getting-started/userinterface): separate navigation from the reading surface; retain file context.
- [GitHub file viewing](https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files): expose raw content copying and a Markdown source/preview choice.

## Expanded user brief

The user explicitly requested most code syntax highlighting, images, PDFs, and common Office files, with extensibility, performance, and clean code. This supersedes the initial text-only assumption below.

The [format study](design/file-viewer/formats.png) adds image, PDF, Word, workbook, and presentation controls within the same visual system. Both studies use built-in imagegen; their adjacent JSON files preserve the exact prompts. Studies are design references, never runtime evidence.

## Direction and components

The [generated state study](design/file-viewer/study.png) explores the local extension. It is a code-led reference, not a pixel specification. Discard its enclosing borders, selection stripe, invented dot paths, and duplicate expand icons. The baseline backend excluded private dot paths and rejected binary or oversized files.

1. Searchable navigation: filter full paths, group folders with native disclosures, show selected state, retain filter when returning from a file, and explain empty/no-match/truncated lists.
2. Reading surface: selected content replaces the compact list so it is immediately visible. Back returns to navigation. Expanded mode uses the available workspace width with navigation and source side by side; mobile keeps a single task column.
3. Source controls: line numbers, wrap, find with match navigation, go to line, exact content/path copy, and a download of the loaded text. Feedback reports clipboard failure.
4. Markdown: explicit Source/Preview controls; render safe Markdown without executing HTML or automatically loading external images. Source remains available for exact inspection.
5. Format renderers: an extension registry dispatches to text/code, images, PDF, DOCX, XLSX, or PPTX. Unknown binary and legacy Office formats retain an original-file download. Images offer fit, native-size zoom and rotation. PDFs render one page with page navigation, zoom, and accessible extracted page text. Word renders headings, paragraphs, tables and embedded images; workbooks preserve sheets, sparse coordinates and saved cell values; slides render available positioned text and images with a text fallback. Preview fidelity limits stay visible.
6. State handling: loading, empty files, errors with retry, refreshing and unavailable files. Never show another file's cached content under a new path.

## Contract and boundaries

**THESIS:** Give reading a stable place instead of appending it below navigation.

**OWN-WORLD:** Inherit the [workspace direction contract](DESIGN-STUDY.md#direction-contract) and current DESIGN.md: compact Manrope controls, Plex Mono source, warm accents, charcoal dark neutrals, flat surfaces, and functional focus/table rules. This is the local-extension path in Impeccable; no new concept roll or retrospective seed applies.

**STORY:** Find a path, open it immediately, inspect or search its contents, copy/download what is needed, and return to the conversation with context intact.

**FORM:** The compact inspector switches from navigation to reading. Expanded desktop places navigation beside content. Mobile retains a single task column; fit modes respect the available area and zoom controls step from the displayed scale.

**FIRST VIEWPORT:** The existing workspace shell remains. Opening a file immediately reveals its path, reading controls, and source at the top of the inspector. Expand provides a generous reading canvas without a modal or interrupting the conversation state. The signature interaction is moving between compact inspection and expanded reading without reloading the file.

Router continues to own file/panel selections; Query owns file reads and cancellation. React owns search, folder disclosures, find, wrap, and expansion. Workspace changes reset transient viewer state. Keep the existing 256 KiB text-preview and 1,000-file discovery limits. Add a separate authenticated asset endpoint capped at 20 MiB, sharing path/private-file boundaries. Editing, Git history, language services, Office macros/formula execution, and exact Office layout reproduction remain outside this read-only viewer. Legacy DOC/XLS/PPT files download for opening in their original apps.

Shiki tokenizes supported grammars in a disposable worker, importing only the selected language; long minified lines and expensive grammars retain plain text. Source rows and spreadsheet rows use TanStack Virtual. PDF.js renders a single bounded canvas and cancels superseded work. Office ZIP/XML parsing runs in a terminable worker with a 10-second deadline, 4 MiB per entry, 16 MiB total expansion, and 4,000-entry cap. Reading previews cap paragraphs/rows, columns, sheets and slides. No external document service receives files. Heavy renderer modules are lazy-loaded; blob URLs are revoked and asset cache entries are removed after use.

Functional table rules preserve cell relationships in Word tables and spreadsheets. They are the only new line exception. Native slide content uses a white page with dark text; app surfaces keep the incumbent tokens.

## Acceptance and proof plan

Write failing browser regressions before implementing behavior. Verify nested paths, search, large lists, long lines, empty files, Markdown safety, failure/retry, copy success/failure, file switching during a pending request, refresh, keyboard access, URL reload/Back/Forward, and workspace isolation. Inspect light/dark and mobile screenshots, run axe, and confirm bounded viewport scrolling. Run `pnpm check`, `node --test example/greet.test.js`, affected browser tests, `pnpm design:check`, `pnpm design:browser`, formatting, and `git diff --check`. Record actual outcomes separately from fixture or model evidence.

## Worktree isolation

The source checkout had substantial uncommitted changes. Worktree `feat/file-viewer-study` includes a private baseline snapshot at `0e5b403`. Only the changes after that baseline belong to this task. Main later received the design checkpoint and Learning loader. Rebase only the viewer commit onto that main branch before merging. The private snapshot stays outside main history.

## Delivery evidence (2026-10-23)

The initial browser regressions failed before implementation. The binary API regression also failed before the asset reader existed. Large-asset zoom regressions reproduced an increase in size after Zoom out. Both now pass.

| Command                                                                                                 | Result                                                                                                            |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                                            | Passed lint, design gate, TypeScript, 97 tests, and both builds. 49 existing persistence contract checks skipped. |
| `node --test example/greet.test.js`                                                                     | One passed.                                                                                                       |
| `FILE_VIEWER_APP_URL=http://127.0.0.1:4193 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4184 pnpm test:e2e` | 47 passed; six opt-in live-model checks skipped.                                                                  |

Browser evidence covers real local filesystem reads, authenticated assets, URL navigation, refresh, workspace isolation, keyboard controls, virtualized source, and fixture format rendering. Format captures include light/dark desktop/mobile views and axe checks. No model calls were needed for the viewer change. These results do not claim fresh model or Learning evidence.

The finish reviewer approved the scored zoom and contract fixes after inspecting stable captures. The documenter confirmed that the existing design system still applies. The final cleanup replaces folder disclosure glyphs with the shared Lucide icon family.

Office previews show available content, not original application layout. Legacy Office files use downloads. PDF rendering remains one page at a time. Heavy parsers and grammars load on demand; the build still reports large optional chunks.

Proof: [workspace](proof/file-viewer-workspace.png), [source](proof/file-viewer-dark.png), [image](proof/file-viewer-image-mobile-dark.png), [PDF](proof/file-viewer-pdf-mobile-dark.png), [Word](proof/file-viewer-word-light.png), [workbook](proof/file-viewer-sheet-light.png), and [slides](proof/file-viewer-slides-light.png).

After the final icon cleanup, the affected browser command passed all 18 tests:

```sh
FILE_VIEWER_APP_URL=http://127.0.0.1:4193 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4184 pnpm test:e2e e2e/file-viewer.spec.ts e2e/file-formats.spec.ts e2e/file-viewer-integration.spec.ts
FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4184 pnpm design:browser
```

The rendered design command passed its one test. `pnpm check` and the greet test passed again. Formatting and `git diff --check` passed.

## Integration with current main

The viewer commit rebased cleanly onto `68940da`, preserving the Learning loader and design checkpoint. The rebased `pnpm check` passed 99 tests, with 49 existing checks skipped. The greet test passed.

The combined-code browser command passed five checks:

```sh
FILE_VIEWER_APP_URL=http://127.0.0.1:4193 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4184 pnpm test:e2e e2e/file-viewer-integration.spec.ts e2e/workspace.spec.ts
```

After rebase, repository-wide `pnpm format:check` reports an existing formatting issue in `docs/AGENT-SKILLS.md`. That file is unchanged by this task. Viewer files pass the targeted formatting check, and `git diff --check` passes.
