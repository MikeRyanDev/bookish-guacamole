# Workspace file discovery

The browser loads directory children when a folder opens. Search matches file paths across the whole public workspace, including unopened folders.
Neither operation has a total file limit. The previous 1,000-file response limit and 10,000-entry traversal limit are removed.

## Interaction contract

The task is to inspect folders, find a file in a large workspace, read it, and return to browsing.

| User task                | Visible control and initial state                        | Expected and implemented result                              | Recovery or exit                           |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| Open project files       | **Files** in the header                                  | Opens the Files tab; closes it when that tab is already open | Activate **Files** again                   |
| Prepare an agent request | **Use project overview prompt** in an empty conversation | Fills the composer without sending                           | Edit or clear the draft                    |
| Inspect a folder         | Folder name and chevron, initially collapsed             | Loads its first page of children                             | Activate the folder again to collapse it   |
| Continue browsing        | `Load more in <folder>` after the current children       | Adds the next page in that folder                            | Collapse the folder or open a file         |
| Find a file              | `Search files…` field                                    | Searches matching paths across the workspace                 | Clear the field or use `Clear file search` |
| Continue searching       | `Load more results` below current matches                | Adds the next page of matching paths                         | Clear search to restore browsing           |
| Read a file              | File row                                                 | Opens the file preview and updates the URL                   | `Back to files` returns to browsing        |
| Recover a failed read    | `Retry <folder>` or `Retry search`                       | Repeats the failed request locally                           | Other loaded folders remain available      |

The repository added its separate usability gate during integration. This table records the implemented contract, not a claim of pre-implementation approval.
Each fresh reviewer received the task and isolated preview without this table or the builder's explanation.

### Usability verdict

Desktop browsing and search passed the first independent task review, including 11 page loads to reach the target beyond 1,000 files.
Mobile review found an obscured panel toggle, an ambiguous entry label, and a search-clear delay that retained an obsolete target.
The header now reserves space for the development Inspector and exposes a visible **Files** button.
The suggestion now says **Use project overview prompt**. Clearing search restores browsing immediately.

A third reviewer started from a fresh 390×844 page and predicted that **Files** would open project browsing.
Touch search, result selection, readable contents, keyboard return, search clear, and folder expansion matched those predictions.
The final verdict was **usability: pass** for that task, with no material mismatch.
This was Chromium emulation, not physical-phone or screen-reader testing. No model messages, approvals, or file mutations were performed.

### Visual verdict

The final visual review followed usability acceptance. The incumbent compact layout, themes, typography, and file rows remain intact.
The mobile header keeps file access clear of the enabled development badge. Long workspace names truncate to preserve control space.
Desktop and mobile captures show files beyond the old limit. Axe passed in both themes; this does not substitute for usability review.
[Mobile entry](proof/file-entry-mobile.png) shows the visible Files control with the development Inspector enabled.

### Technical verdict

Build, API, integration, keyboard, cancellation, cursor-refresh, and accessibility evidence is recorded separately in [verification](VERIFICATION.md#lazy-file-discovery--2026-10-23).

## HTTP contract

Both endpoints require the existing bearer header and same-origin checks. The workspace registry selects the root directory.

| GET endpoint               | Parameters                                      | Response                                         |
| -------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `/api/workspace/directory` | `workspace`, optional `path`, optional `cursor` | `entries`, optional `nextCursor`, optional `git` |
| `/api/workspace/search`    | `workspace`, `q`, optional `cursor`             | `files`, optional `nextCursor`, optional `git`   |

An omitted directory path selects the workspace root. Each entry contains a workspace-relative `path` and a `kind`: `file` or `directory`.
Search uses a case-insensitive substring match on the full relative path. It does not search file contents.
Each page contains at most 100 entries. A missing `nextCursor` means the result is complete.
Directory pages sort folders before files, then compare paths. Search pages compare paths.

Cursors identify the workspace, operation, query or directory, and last returned sort key. They are opaque continuation values, not authorization tokens.
Invalid cursors and private or unsafe directory paths return HTTP 400. Missing directories and operational failures use the existing local API error response.

Git metadata uses two-column porcelain codes. Directory metadata includes distinct descendant codes, so collapsed folders retain aggregate status descriptions.
A failed status command reports `available: false`; it never claims the directory is clean.
The compatibility endpoint `/api/workspace/files` retains its flat response contract, without truncation. The browser no longer calls it.
New consumers should use the paginated endpoints.

## Loading and refresh

TanStack Query owns pages and cancellation. Its query keys include the workspace, operation, directory or query, and cursor.
React owns folder expansion, active-row focus, and requested page controls. Router owns the selected file.
The existing virtual tree bounds mounted rows. Pagination controls participate in keyboard navigation.

Search requests start after a 200 ms typing delay. New queries unsubscribe from obsolete requests; late responses cannot replace the current query.
Directory and search failures expose local retry controls. Clearing search restores folder expansion.

Refresh invalidates loaded pages. If an earlier page changes its next cursor, the browser discards the later page chain.
The next load uses the updated cursor. Folder expansion and file selection remain intact.
Pagination is not a filesystem snapshot. Concurrent edits can change later results; refresh restarts from current boundaries.

## Boundaries and performance

Directory discovery reads immediate filesystem children. It does not recursively enumerate files in unopened folders.
Git status can inspect tracked descendants to aggregate changes. Untracked directory status stays summarized during browsing.
Git ignore checks retain forced tracked files beneath ignored directories. Deleted tracked files remain visible but cannot open a preview.

Search streams Git paths or walks a plain folder. It retains only one page of matching candidates plus one lookahead candidate.
Git status and checked directory ancestry require additional memory. Directory browsing holds the immediate sibling list while sorting and filtering it.
Plain-folder search has no traversal cutoff. Dot paths, symlinks, and plain-folder `node_modules` trees remain excluded.
An explicitly opened folder ignored by an ancestor repository retains plain-folder behavior.

Search has no persistent index. Each page scans again, so latency grows with workspace size and disk speed.
Git subprocesses have a 30-second deadline; repository detection has a five-second deadline. Timeouts produce errors, never silently incomplete search results.
Disconnected requests abort scans and terminate Git subprocesses. No dependency, backend deployment, or model configuration changes are required.
