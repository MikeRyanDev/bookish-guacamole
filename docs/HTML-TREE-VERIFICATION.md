# HTML previews and Git file tree

## Scope and design

This change extends the existing read-only file viewer in `feat/html-preview-git-tree`. The parent is the local viewer commit `3f995a5`. Remote `origin/main` was inspected at `5727a34`; it does not contain that viewer. This work does not publish a weekend candidate, change upstream packages, merge main, or modify shared deployments.

**THESIS:** Navigate a real hierarchy and inspect an HTML file without giving it access to the workspace app.

**OWN-WORLD:** Inherit `DESIGN.md` and the file-viewer study. Keep compact controls, source typography, neutral surfaces, and functional focus indicators. This is an Operate/Read extension, not a new visual identity.

**STORY:** Open a folder, find a file, inspect source or HTML, and return without losing tree state. Search reveals matching paths; clearing search restores expansion choices.

**FIRST VIEWPORT:** Folders precede files and start collapsed. Git state appears on files and their ancestors. Names, status badges, tooltips, and accessible descriptions explain the colors.

**FORM:** Keep the current compact inspector and expanded reader. Use TanStack Virtual for visible tree rows and TanStack Query for workspace reads. A small pure tree model handles hierarchy, sorting, filtering, and status aggregation. No additional runtime dependency is needed.

## HTML behavior and boundary

HTML, HTM, and XHTML files keep the existing Source/Preview controls. Source opens first. Preview passes the original text directly to an iframe's `srcDoc`. There is no parser, sanitizer, rewritten markup, or HTML worker.

The iframe has `sandbox="allow-scripts"`. JavaScript can run within the preview. The sandbox does not grant same-origin access, forms, popups, downloads, modals, or top-level navigation. The iframe sets `referrerPolicy="no-referrer"` and disables camera, microphone, location, and clipboard permissions. Browser tests exercise scripts, parent access, storage, navigation, popups, and forms.

This is browser isolation, not a claim that arbitrary HTML has no possible effects. Network requests remain possible. Expensive scripts can consume resources. The preview is not a workspace web server; relative resources are not resolved through the authenticated file API. Source copying and downloads retain the original bytes. The existing 256 KiB text limit remains.

See the [iframe sandbox documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox) and [srcdoc isolation guidance](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc).

## File tree contract

`GET /api/workspace/files` retains `files` and `truncated`. Git workspaces also return `git.available` and `git.entries`, keyed by workspace-relative paths. Each entry contains Git's index/worktree status columns. A failed status command returns unavailable status rather than falsely labeling files clean. Plain folders keep the existing response shape.

Git commands have time and output limits. Status reads disable optional index writes and filesystem-monitor hooks. NUL-delimited porcelain records preserve spaces and newlines. Rename source records are consumed separately. Workspace prefixes and private paths are filtered before responding. The existing discovery limits remain.

The browser creates real parent nodes from discovered paths. Each sibling group sorts folders first, then names with numeric ordering. Folder states aggregate descendants, with conflict, deleted, modified, renamed, added, and untracked priority. Tooltips list every aggregated state. Deleted entries stay visible but cannot open a missing working copy. Conflicts remain inspectable.

The tree has one tab stop. Arrow keys navigate and expand, Home/End reach the ends, Enter/Space activate, and typing selects matching names. The active row stays mounted during virtualization. Search temporarily reveals matching ancestors. Refresh preserves expansion; a workspace change resets it.

References: [Git porcelain status](https://git-scm.com/docs/git-status#_porcelain_format_version_1), [TanStack Virtual](https://tanstack.com/virtual/latest/docs/framework/react/react-virtual).

## Verification

Regression tests first failed for missing hierarchy/HTML preview and missing Git metadata. A file-to-directory replacement test then exposed an ancestry edge case; it now passes.

Final verification ran on 2026-10-23. Fixture evidence is separate from real filesystem, Git, and HTTP evidence. No model or Learning calls are required for this change.

| Command                                                                                                                                                         | Result                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                                                                                                    | Passed lint, design gate, TypeScript, 104 tests, and both builds. 49 existing persistence checks skipped. |
| `node --test example/greet.test.js`                                                                                                                             | One passed.                                                                                               |
| `FILE_VIEWER_APP_URL=http://127.0.0.1:4196 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4186 pnpm test:e2e`                                                         | 51 passed; six opt-in model checks skipped.                                                               |
| `FILE_VIEWER_APP_URL=http://127.0.0.1:4196 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4186 pnpm test:e2e e2e/html-tree.spec.ts e2e/html-tree-integration.spec.ts` | Four passed after the final filename guard.                                                               |
| `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4186 pnpm design:browser`                                                                                             | One passed.                                                                                               |
| `pnpm format:check`                                                                                                                                             | Existing failure in unchanged `docs/AGENT-SKILLS.md`. Changed files pass targeted Oxfmt checks.           |
| `git diff --check`                                                                                                                                              | Passed.                                                                                                   |

The mechanical source scan reported no findings. Light/dark tree views pass axe checks. Host controls around the isolated HTML frame also pass axe. The preview document owns its accessibility and styling.

The real integration test creates a Git workspace, changes and commits a file, and verifies refreshed colors without losing expansion. It loads the original HTML through the authenticated API. Its script counter works, while a script request for the host bootstrap API remains unreadable. Fixture tests verify parent/storage isolation, blocked top navigation, popups, and forms. A 1,000-file fixture keeps fewer than 80 tree rows mounted and reaches the last file by keyboard.

The Impeccable finish reviewer returned **ship** for UX/design fidelity. This is not an independent security audit. The documenter preserved the incumbent system. Existing design metadata drift and the unrecorded expanded-reader layout remain outside this change; a separate documentation refresh can reconcile them.

Evidence: [desktop workspace](proof/html-tree-workspace-dark.png), [mobile preview](proof/html-tree-workspace-mobile-dark.png), [Git tree](proof/html-tree-dark.png), and [mobile Git tree](proof/html-tree-mobile-dark.png).
