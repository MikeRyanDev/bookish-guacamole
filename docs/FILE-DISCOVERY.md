# Workspace file discovery

The browser loads directory children when a folder opens. Search matches file paths across the whole public workspace, including unopened folders.
Neither operation has a total file limit. The previous 1,000-file response limit and 10,000-entry traversal limit are removed.

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
