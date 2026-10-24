/** Git's two-column porcelain status. Paths are workspace-relative, never display-parsed. */
export interface WorkspaceGitStatus {
  available: boolean;
  entries: Record<string, string>;
  /** Distinct descendant status codes for returned directory rows. */
  directories?: Record<string, string[]>;
}

export interface DirectoryEntry {
  path: string;
  kind: "directory" | "file";
}
export interface DirectoryPage {
  entries: DirectoryEntry[];
  nextCursor?: string;
  git?: WorkspaceGitStatus;
}
export interface SearchPage {
  files: string[];
  nextCursor?: string;
  git?: WorkspaceGitStatus;
}
