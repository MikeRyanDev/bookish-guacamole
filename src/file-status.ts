/** Git's two-column porcelain status. Paths are workspace-relative, never display-parsed. */
export interface WorkspaceGitStatus {
  available: boolean;
  entries: Record<string, string>;
}

/** Parses NUL-delimited porcelain v1, consuming rename/copy source records separately. */
export function parseGitStatus(output: string, prefix = ""): Record<string, string> {
  const entries: Record<string, string> = Object.create(null);
  const records = output.split("\0");
  for (let index = 0; index < records.length; index++) {
    const record = records[index]!;
    const code = record.slice(0, 2);
    const path = record.slice(3);
    if (/[RC]/.test(code)) index++;
    if (record[2] !== " " || !path.startsWith(prefix)) continue;
    const relative = path.slice(prefix.length);
    if (
      !relative ||
      relative.startsWith("/") ||
      relative.split(/[\\/]/).some((part) => part.startsWith("."))
    )
      continue;
    entries[relative] = code;
  }
  return entries;
}
